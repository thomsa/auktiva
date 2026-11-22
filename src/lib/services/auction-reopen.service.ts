import { prisma } from "@/lib/prisma";
import type { Auction, Prisma } from "@/generated/prisma/client";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { isResultItemEnded } from "@/lib/results-summary";
import { publish, Events, Channels } from "@/lib/realtime";
import type { ItemUpdatedEvent } from "@/lib/realtime/events";
import { createLogger } from "@/lib/logger";
import * as notificationService from "./notification.service";

const reopenLogger = createLogger("auction-reopen");

// ============================================================================
// Types
// ============================================================================

export interface ClosedItem {
  id: string;
  name: string;
  endDate: string | null;
  bidCount: number;
}

export interface ReopenBiddingInput {
  auctionId: string;
  actorId: string;
  /** New auction end date: strictly in the future, or null for no end. */
  endDate: Date | null;
  /** Closed, published items of this auction to reopen. */
  itemIds: string[];
}

export interface ReopenBiddingResult {
  auction: Auction;
  /** Items that moved from closed to open, with or without bids. */
  reopenedCount: number;
  /** Bidders told in-app that bidding reopened. */
  notifiedCount: number;
}

export interface ReopenedItem {
  id: string;
  name: string;
  winnerNotifiedUserId: string | null;
}

interface EndDateTransitionInput {
  auctionId: string;
  actorId: string | null;
  endDate: Date | null;
  itemIds: string[];
  /** Other auction fields to save in the same transaction. */
  auctionData?: Prisma.AuctionUpdateInput;
  now: Date;
}

// ============================================================================
// Queries
// ============================================================================

/** Where-clause for published items that may be closed at `now`. */
function possiblyClosedItemsWhere(
  auctionId: string,
  auctionEndDate: Date | null,
  now: Date,
): Prisma.AuctionItemWhereInput {
  const auctionEnded = auctionEndDate !== null && auctionEndDate < now;
  return {
    auctionId,
    isPublished: true,
    OR: [
      { endDate: { lt: now } },
      ...(auctionEnded ? [{ endDate: null }] : []),
    ],
  };
}

/**
 * Published items of the auction that are closed under the bid API's rule
 * (`isResultItemEnded`), ordered by name. Used by the settings page.
 */
export async function findClosedItems(
  auctionId: string,
  now: Date = new Date(),
): Promise<ClosedItem[]> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { endDate: true },
  });
  if (!auction) return [];

  const items = await prisma.auctionItem.findMany({
    where: possiblyClosedItemsWhere(auctionId, auction.endDate, now),
    select: {
      id: true,
      name: true,
      endDate: true,
      _count: { select: { bids: true } },
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });

  return items
    .filter((item) => isResultItemEnded(item.endDate, auction.endDate, now))
    .map((item) => ({
      id: item.id,
      name: item.name,
      endDate: item.endDate?.toISOString() ?? null,
      bidCount: item._count.bids,
    }));
}

// ============================================================================
// Transition
// ============================================================================

/**
 * Saves a new auction end date (plus any other auction fields), reopens the
 * selected items and returns every item that went from closed to open.
 *
 * Selected items must be published, belong to this auction and be closed;
 * otherwise it throws before writing anything. Reopened items keep their
 * `winnerNotified*` record but get `winnerNotified = false`, so whoever wins
 * at the next close is notified.
 */
async function applyEndDateTransition(
  input: EndDateTransitionInput,
): Promise<{ auction: Auction; reopened: ReopenedItem[] }> {
  const { auctionId, actorId, endDate, now } = input;
  const itemIds = [...new Set(input.itemIds)];

  return prisma.$transaction(async (tx) => {
    const current = await tx.auction.findUnique({
      where: { id: auctionId },
      select: { endDate: true },
    });
    if (!current) {
      throw new NotFoundError("Auction not found");
    }

    const closedBefore = (
      await tx.auctionItem.findMany({
        where: possiblyClosedItemsWhere(auctionId, current.endDate, now),
        select: {
          id: true,
          name: true,
          endDate: true,
          winnerNotifiedUserId: true,
          createdAt: true,
        },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      })
    ).filter((item) => isResultItemEnded(item.endDate, current.endDate, now));

    if (itemIds.length > 0) {
      const closedIds = new Set(closedBefore.map((item) => item.id));
      const invalidIds = itemIds.filter((id) => !closedIds.has(id));
      if (invalidIds.length > 0) {
        const found = await tx.auctionItem.findMany({
          where: { id: { in: invalidIds } },
          select: { id: true, auctionId: true, isPublished: true },
        });
        const byId = new Map(found.map((item) => [item.id, item]));
        const notInAuction = invalidIds.filter(
          (id) => byId.get(id)?.auctionId !== auctionId,
        );
        const drafts = invalidIds.filter((id) => {
          const item = byId.get(id);
          return item?.auctionId === auctionId && !item.isPublished;
        });
        const open = invalidIds.filter(
          (id) => !notInAuction.includes(id) && !drafts.includes(id),
        );
        const message =
          notInAuction.length > 0
            ? "Some items do not belong to this auction"
            : drafts.length > 0
              ? "Draft items cannot be reopened"
              : "Some items are still open";
        throw new BadRequestError(message, {
          invalidItemIds: invalidIds,
          ...(notInAuction.length > 0 && { notInAuction }),
          ...(drafts.length > 0 && { drafts }),
          ...(open.length > 0 && { open }),
        });
      }
    }

    const auction = await tx.auction.update({
      where: { id: auctionId },
      data: { ...input.auctionData, endDate },
    });

    if (itemIds.length > 0) {
      await tx.auctionItem.updateMany({
        where: { id: { in: itemIds }, auctionId },
        data: { endDate: null, lastUpdatedById: actorId },
      });
    }

    const selected = new Set(itemIds);
    const reopened = closedBefore.filter(
      (item) =>
        !isResultItemEnded(
          selected.has(item.id) ? null : item.endDate,
          auction.endDate,
          now,
        ),
    );

    if (reopened.length > 0) {
      await tx.auctionItem.updateMany({
        where: { id: { in: reopened.map((item) => item.id) } },
        data: { winnerNotified: false },
      });
    }

    return {
      auction,
      reopened: reopened.map((item) => ({
        id: item.id,
        name: item.name,
        winnerNotifiedUserId: item.winnerNotifiedUserId,
      })),
    };
  });
}

/**
 * After the transition commits: tells bidders that bidding reopened and
 * pushes `ITEM_UPDATED` for each reopened item. Failures are logged and do
 * not undo the reopen. Returns the number of bidders notified in-app.
 */
async function announceReopenedItems(
  auction: Auction,
  actorId: string | null,
  reopened: ReopenedItem[],
): Promise<number> {
  if (reopened.length === 0) return 0;

  let notifiedCount = 0;
  try {
    notifiedCount = await notificationService.notifyBiddingReopened({
      auctionId: auction.id,
      auctionName: auction.name,
      actorId,
      endDate: auction.endDate,
      reopened,
    });
  } catch (err) {
    reopenLogger.error(
      { err, auctionId: auction.id },
      "Failed to send bidding-reopened notifications",
    );
  }

  for (const item of reopened) {
    try {
      const event: ItemUpdatedEvent = {
        itemId: item.id,
        auctionId: auction.id,
        changes: { endDate: null },
      };
      publish(Channels.item(item.id), Events.ITEM_UPDATED, event);
    } catch (err) {
      reopenLogger.error(
        { err, auctionId: auction.id, itemId: item.id },
        "Failed to publish reopened item update",
      );
    }
  }

  reopenLogger.info(
    {
      auctionId: auction.id,
      reopenedCount: reopened.length,
      notifiedCount,
    },
    "Bidding reopened",
  );

  return notifiedCount;
}

/**
 * Saves an auction end date change made through the settings form (with the
 * other form fields) and reopens items that follow the auction end. Unlike
 * `reopenBidding`, the end date may be in the past or cleared, and no items
 * are selected. Sends reopen notifications only for items that actually go
 * from closed to open.
 */
export async function updateAuctionEndDate(params: {
  auctionId: string;
  actorId: string | null;
  endDate: Date | null;
  auctionData: Prisma.AuctionUpdateInput;
  now?: Date;
}): Promise<{
  auction: Auction;
  reopenedCount: number;
  notifiedCount: number;
}> {
  const { auction, reopened } = await applyEndDateTransition({
    auctionId: params.auctionId,
    actorId: params.actorId,
    endDate: params.endDate,
    itemIds: [],
    auctionData: params.auctionData,
    now: params.now ?? new Date(),
  });
  const notifiedCount = await announceReopenedItems(
    auction,
    params.actorId,
    reopened,
  );
  return { auction, reopenedCount: reopened.length, notifiedCount };
}

/**
 * The owner's "Reopen bidding" action: sets a new auction end date (in the
 * future, or none) and reopens the selected closed items, which then follow
 * the auction end. Items without their own end date that the new date
 * reopens count as reopened too.
 */
export async function reopenBidding(
  input: ReopenBiddingInput,
  now: Date = new Date(),
): Promise<ReopenBiddingResult> {
  if (input.endDate !== null) {
    if (Number.isNaN(input.endDate.getTime())) {
      throw new BadRequestError("Invalid end date");
    }
    if (input.endDate <= now) {
      throw new BadRequestError("The new end date must be in the future");
    }
  }

  const { auction, reopened } = await applyEndDateTransition({
    auctionId: input.auctionId,
    actorId: input.actorId,
    endDate: input.endDate,
    itemIds: input.itemIds,
    now,
  });
  const notifiedCount = await announceReopenedItems(
    auction,
    input.actorId,
    reopened,
  );
  return { auction, reopenedCount: reopened.length, notifiedCount };
}
