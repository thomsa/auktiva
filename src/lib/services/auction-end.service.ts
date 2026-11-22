import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import * as notificationService from "./notification.service";
import { queueItemWonEmail } from "@/lib/email/service";
import { createLogger } from "@/lib/logger";

const auctionEndLogger = createLogger("auction-end");

/**
 * How long after an item's effective end the notifier may still message its
 * winner. Items the notifier first sees later than this are recorded as
 * notified without sending anything, so a notifier that did not run for a
 * long time (or a data repair) does not send late "you won" messages.
 */
export const STALE_WINNER_NOTIFICATION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Published items that have ended, have a highest bidder and whose winner
 * has not been notified yet. "Ended" follows the same rule as the bid API
 * (`isResultItemEnded`): the item's own end date wins, and an item without
 * one ends with the auction.
 */
export function endedItemsAwaitingNotificationWhere(
  now: Date,
): Prisma.AuctionItemWhereInput {
  return {
    isPublished: true,
    highestBidderId: { not: null },
    winnerNotified: false,
    OR: [
      { endDate: { lt: now } },
      { endDate: null, auction: { endDate: { lt: now } } },
    ],
  };
}

/** The winner state a notifier run read for an item before claiming it. */
export interface WinnerNotificationSnapshot {
  id: string;
  highestBidderId: string;
  currentBid: number | null;
}

/**
 * Atomically claims an item's pending winner notification for the winner in
 * `snapshot` and records that winner, amount and `now` as notified.
 *
 * The claim only succeeds while the item is still pending and its highest
 * bidder is still the snapshot's, so overlapping runs claim an item once and
 * a run that read an outdated winner never messages the wrong user.
 *
 * @returns `true` when this call made the claim and may send the messages.
 */
export async function claimWinnerNotification(
  snapshot: WinnerNotificationSnapshot,
  now: Date,
): Promise<boolean> {
  const claim = await prisma.auctionItem.updateMany({
    where: {
      id: snapshot.id,
      winnerNotified: false,
      highestBidderId: snapshot.highestBidderId,
    },
    data: {
      winnerNotified: true,
      winnerNotifiedUserId: snapshot.highestBidderId,
      winnerNotifiedAmount: snapshot.currentBid,
      winnerNotifiedAt: now,
    },
  });
  return claim.count === 1;
}

type EndedItem = Prisma.AuctionItemGetPayload<{
  include: {
    currency: { select: { symbol: true } };
    auction: { select: { id: true; name: true; endDate: true } };
  };
}>;

/**
 * Puts back the pending flag and the previous winner record after the
 * in-app notification could not be created, so a later run retries. The
 * update is keyed on this run's claim, so it never undoes a newer one.
 */
async function releaseWinnerNotificationClaim(
  item: EndedItem,
  winnerId: string,
  now: Date,
): Promise<void> {
  try {
    await prisma.auctionItem.updateMany({
      where: {
        id: item.id,
        winnerNotified: true,
        winnerNotifiedUserId: winnerId,
        winnerNotifiedAt: now,
      },
      data: {
        winnerNotified: false,
        winnerNotifiedUserId: item.winnerNotifiedUserId,
        winnerNotifiedAmount: item.winnerNotifiedAmount,
        winnerNotifiedAt: item.winnerNotifiedAt,
      },
    });
  } catch (err) {
    auctionEndLogger.error(
      { err, itemId: item.id },
      "Failed to release winner notification claim",
    );
  }
}

/**
 * Claims one ended item and messages its winner.
 *
 * @returns `true` when the winner received the in-app notification in this
 * run; `false` when another run claimed the item, the item was stale, or
 * the notification could not be created.
 */
async function notifyItemWinner(item: EndedItem, now: Date): Promise<boolean> {
  const winnerId = item.highestBidderId;
  if (!winnerId) return false;
  const amount = item.currentBid;

  const claimed = await claimWinnerNotification(
    { id: item.id, highestBidderId: winnerId, currentBid: amount },
    now,
  );
  if (!claimed) return false;

  const effectiveEnd = item.endDate ?? item.auction.endDate;
  if (
    effectiveEnd &&
    now.getTime() - effectiveEnd.getTime() > STALE_WINNER_NOTIFICATION_MS
  ) {
    auctionEndLogger.info(
      { itemId: item.id, winnerId, effectiveEnd },
      "Recorded winner of a long-ended item without notifying",
    );
    return false;
  }

  try {
    await notificationService.notifyAuctionWon(
      winnerId,
      item.name,
      item.auction.id,
      item.id,
      amount!,
      item.currency.symbol,
    );
  } catch (err) {
    // Nothing reached the winner yet, so a later run may retry.
    auctionEndLogger.error(
      { err, itemId: item.id },
      "Failed to notify winner for item",
    );
    await releaseWinnerNotificationClaim(item, winnerId, now);
    return false;
  }

  // The in-app notification exists from here on. Keep the claim whatever
  // happens next, so the winner never gets a duplicate in-app message.
  try {
    const winner = await prisma.user.findUnique({
      where: { id: winnerId },
      select: { id: true, email: true, name: true },
    });

    // Queue item won email (respects user preference)
    if (winner) {
      await queueItemWonEmail({
        winnerId: winner.id,
        winnerEmail: winner.email,
        winnerName: winner.name,
        itemId: item.id,
        itemName: item.name,
        auctionId: item.auction.id,
        auctionName: item.auction.name,
        winningAmount: amount!,
        currencySymbol: item.currency.symbol,
      });
    }
  } catch (err) {
    auctionEndLogger.error(
      { err, itemId: item.id },
      "Failed to queue win e-mail after the in-app notification",
    );
  }

  auctionEndLogger.debug({ itemId: item.id, winnerId }, "Processed ended item");
  return true;
}

/**
 * Process items that have ended but whose winner hasn't been notified yet.
 * This runs as a background task triggered by notification polling, so
 * several runs can overlap; each item is claimed atomically first.
 *
 * Every claimed item gets its winner record (`winnerNotifiedUserId`,
 * `winnerNotifiedAmount`, `winnerNotifiedAt`). Items whose effective end is
 * more than `STALE_WINNER_NOTIFICATION_MS` ago are recorded without sending
 * anything.
 *
 * @returns The number of winners who received the in-app notification in
 * this run. Items claimed by another run, stale items recorded without a
 * message and items whose notification failed are not counted.
 */
export async function processEndedItems(): Promise<number> {
  try {
    const now = new Date();
    const endedItems = await prisma.auctionItem.findMany({
      where: endedItemsAwaitingNotificationWhere(now),
      include: {
        currency: { select: { symbol: true } },
        auction: { select: { id: true, name: true, endDate: true } },
      },
      take: 50, // Process max 50 at a time to avoid long-running queries
    });

    if (endedItems.length === 0) {
      return 0;
    }

    auctionEndLogger.info(
      { count: endedItems.length },
      "Processing ended items",
    );

    const results = await Promise.all(
      endedItems.map((item) => notifyItemWinner(item, now)),
    );

    const processed = results.filter(Boolean).length;
    auctionEndLogger.info({ processed }, "Completed processing ended items");

    return processed;
  } catch (err) {
    auctionEndLogger.error({ err }, "Failed to process ended items");
    return 0;
  }
}
