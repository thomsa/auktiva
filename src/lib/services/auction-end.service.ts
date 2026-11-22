import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import * as notificationService from "./notification.service";
import { queueItemWonEmail } from "@/lib/email/service";
import { createLogger } from "@/lib/logger";

const auctionEndLogger = createLogger("auction-end");

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

/**
 * Process items that have ended but winner hasn't been notified yet.
 * This runs as a background task triggered by notification polling.
 */
export async function processEndedItems(): Promise<number> {
  try {
    const endedItems = await prisma.auctionItem.findMany({
      where: endedItemsAwaitingNotificationWhere(new Date()),
      include: {
        currency: { select: { symbol: true } },
        auction: { select: { id: true, name: true } },
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

    // Process each ended item
    await Promise.all(
      endedItems.map(async (item) => {
        try {
          // Create winner notification (in-app)
          await notificationService.notifyAuctionWon(
            item.highestBidderId!,
            item.name,
            item.auction.id,
            item.id,
            item.currentBid!,
            item.currency.symbol,
          );

          // Fetch winner info for email
          const winner = await prisma.user.findUnique({
            where: { id: item.highestBidderId! },
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
              winningAmount: item.currentBid!,
              currencySymbol: item.currency.symbol,
            });
          }

          // Mark as notified
          await prisma.auctionItem.update({
            where: { id: item.id },
            data: { winnerNotified: true },
          });

          auctionEndLogger.debug(
            { itemId: item.id, winnerId: item.highestBidderId },
            "Processed ended item",
          );
        } catch (err) {
          auctionEndLogger.error(
            { err, itemId: item.id },
            "Failed to notify winner for item",
          );
        }
      }),
    );

    auctionEndLogger.info(
      { processed: endedItems.length },
      "Completed processing ended items",
    );

    return endedItems.length;
  } catch (err) {
    auctionEndLogger.error({ err }, "Failed to process ended items");
    return 0;
  }
}
