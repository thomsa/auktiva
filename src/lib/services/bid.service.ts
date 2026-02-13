import { prisma } from "@/lib/prisma";
import { queueOutbidEmail } from "@/lib/email/service";
import * as notificationService from "./notification.service";
import { publish, Events, Channels } from "@/lib/realtime";
import type { BidNewEvent, BidOutbidEvent } from "@/lib/realtime/events";
import type { Bid } from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface CreateBidInput {
  amount: number;
  isAnonymous?: boolean;
}

export interface BidWithUser extends Bid {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface UserBidStats {
  totalBids: number;
  currencyTotals: Array<{
    code: string;
    symbol: string;
    total: number;
  }>;
  itemsBidOn: number;
  currentlyWinning: number;
}

export interface UserBidItem {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  currentBid: number | null;
  startingBid: number;
  highestBidderId: string | null;
  endDate: string | null;
  createdAt: string;
  currencySymbol: string;
  auctionId: string;
  auctionName: string;
  userHighestBid: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all bids for an item
 */
export async function getItemBids(itemId: string): Promise<BidWithUser[]> {
  return prisma.bid.findMany({
    where: { auctionItemId: itemId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { amount: "desc" },
  });
}

/**
 * Get user's bid statistics for dashboard
 */
export async function getUserBidStats(userId: string): Promise<UserBidStats> {
  const userBids = await prisma.bid.findMany({
    where: { userId },
    include: {
      auctionItem: {
        include: {
          currency: { select: { code: true, symbol: true } },
        },
      },
    },
  });

  const totalBids = userBids.length;

  // Calculate currency totals
  const currencyMap = new Map<
    string,
    { code: string; symbol: string; total: number }
  >();
  for (const bid of userBids) {
    const code = bid.auctionItem.currency.code;
    const symbol = bid.auctionItem.currency.symbol;
    const existing = currencyMap.get(code);
    if (existing) {
      existing.total += bid.amount;
    } else {
      currencyMap.set(code, { code, symbol, total: bid.amount });
    }
  }
  const currencyTotals = Array.from(currencyMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  // Get unique items and winning count
  const itemsMap = new Map<
    string,
    { highestBidderId: string | null; userHighestBid: number }
  >();
  for (const bid of userBids) {
    const existing = itemsMap.get(bid.auctionItemId);
    if (!existing || bid.amount > existing.userHighestBid) {
      itemsMap.set(bid.auctionItemId, {
        highestBidderId: bid.auctionItem.highestBidderId,
        userHighestBid: bid.amount,
      });
    }
  }

  const itemsBidOn = itemsMap.size;
  const currentlyWinning = Array.from(itemsMap.values()).filter(
    (item) => item.highestBidderId === userId,
  ).length;

  return {
    totalBids,
    currencyTotals,
    itemsBidOn,
    currentlyWinning,
  };
}

/**
 * Get user's bid history for history page
 */
export async function getUserBidHistory(userId: string) {
  const bids = await prisma.bid.findMany({
    where: { userId },
    include: {
      auctionItem: {
        include: {
          currency: true,
          auction: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Calculate stats
  const winningBids = bids.filter(
    (b) => b.auctionItem.highestBidderId === userId,
  );

  // Calculate per-currency totals for winning bids
  const currencyMap = new Map<
    string,
    { code: string; symbol: string; total: number }
  >();
  for (const bid of winningBids) {
    const code = bid.auctionItem.currency.code;
    const symbol = bid.auctionItem.currency.symbol;
    const existing = currencyMap.get(code);
    if (existing) {
      existing.total += bid.amount;
    } else {
      currencyMap.set(code, { code, symbol, total: bid.amount });
    }
  }
  const winningTotals = Array.from(currencyMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  return {
    bids: bids.map((b) => ({
      id: b.id,
      amount: b.amount,
      createdAt: b.createdAt.toISOString(),
      isWinning: b.auctionItem.highestBidderId === userId,
      item: {
        id: b.auctionItem.id,
        name: b.auctionItem.name,
        currentBid: b.auctionItem.currentBid,
        endDate: b.auctionItem.endDate?.toISOString() || null,
        currency: {
          symbol: b.auctionItem.currency.symbol,
        },
      },
      auction: b.auctionItem.auction,
    })),
    stats: {
      totalBids: bids.length,
      winningBids: winningBids.length,
      winningTotals,
    },
  };
}

/**
 * Get user's bid items for dashboard
 */
export async function getUserBidItems(userId: string): Promise<UserBidItem[]> {
  const { getPublicUrl } = await import("@/lib/storage");

  const userBids = await prisma.bid.findMany({
    where: { userId },
    include: {
      auctionItem: {
        include: {
          currency: { select: { code: true, symbol: true } },
          auction: { select: { id: true, name: true } },
          images: {
            select: { url: true },
            orderBy: { order: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get unique items with user's highest bid
  const itemsMap = new Map<
    string,
    (typeof userBids)[0]["auctionItem"] & { userHighestBid: number }
  >();
  for (const bid of userBids) {
    const existing = itemsMap.get(bid.auctionItemId);
    if (!existing || bid.amount > existing.userHighestBid) {
      itemsMap.set(bid.auctionItemId, {
        ...bid.auctionItem,
        userHighestBid: bid.amount,
      });
    }
  }

  return Array.from(itemsMap.values()).map((item) => ({
    id: item.id,
    name: item.name,
    thumbnailUrl: item.images[0]?.url ? getPublicUrl(item.images[0].url) : null,
    currentBid: item.currentBid,
    startingBid: item.startingBid,
    highestBidderId: item.highestBidderId,
    endDate: item.endDate?.toISOString() || null,
    createdAt: item.createdAt.toISOString(),
    currencySymbol: item.currency.symbol,
    auctionId: item.auction.id,
    auctionName: item.auction.name,
    userHighestBid: item.userHighestBid,
  }));
}

/**
 * Get items user has bid on in an auction
 */
export async function getUserBidItemIds(
  userId: string,
  auctionId: string,
): Promise<Set<string>> {
  const userBids = await prisma.bid.findMany({
    where: {
      userId,
      auctionItem: { auctionId },
    },
    select: { auctionItemId: true },
    distinct: ["auctionItemId"],
  });

  return new Set(userBids.map((b) => b.auctionItemId));
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Place a bid on an item
 */
export async function placeBid(
  itemId: string,
  userId: string,
  input: CreateBidInput,
  bidderVisibility: string,
): Promise<Bid> {
  // Get item with auction info and bidder name
  const [item, bidder] = await Promise.all([
    prisma.auctionItem.findUnique({
      where: { id: itemId },
      include: {
        currency: true,
        auction: {
          select: { id: true, name: true, bidderVisibility: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
  ]);

  if (!item) {
    throw new Error("Item not found");
  }

  // Store previous highest bidder for notification
  const previousBidderId = item.highestBidderId;

  // Determine if bid should be anonymous
  const shouldBeAnonymous =
    bidderVisibility === "PER_BID" ? (input.isAnonymous ?? false) : false;

  // Anti-snipe: check if we need to extend the end date
  let newEndDate: Date | null = null;
  if (item.antiSnipeEnabled && item.endDate) {
    const now = new Date();
    const endTime = new Date(item.endDate);
    const msUntilEnd = endTime.getTime() - now.getTime();
    const thresholdMs = item.antiSnipeThresholdSeconds * 1000;

    // If bid arrives within the threshold window before end, extend
    if (msUntilEnd > 0 && msUntilEnd <= thresholdMs) {
      newEndDate = new Date(
        endTime.getTime() + item.antiSnipeExtensionSeconds * 1000,
      );
    }
  }

  // Create bid and update item in transaction
  const itemUpdateData: Record<string, unknown> = {
    currentBid: input.amount,
    highestBidderId: userId,
  };
  if (newEndDate) {
    itemUpdateData.endDate = newEndDate;
  }

  const [bid] = await prisma.$transaction([
    prisma.bid.create({
      data: {
        auctionItemId: itemId,
        userId,
        amount: input.amount,
        isAnonymous: shouldBeAnonymous,
      },
    }),
    prisma.auctionItem.update({
      where: { id: itemId },
      data: itemUpdateData,
    }),
  ]);

  // Publish realtime event for new bid (private item channel)
  const bidEvent: BidNewEvent = {
    itemId,
    auctionId: item.auction.id,
    bidId: bid.id,
    amount: input.amount,
    currencyCode: item.currency.code,
    bidderId: userId,
    bidderName: shouldBeAnonymous ? null : bidder?.name || null,
    isAnonymous: shouldBeAnonymous,
    timestamp: bid.createdAt.toISOString(),
    highestBid: input.amount,
    newEndDate: newEndDate?.toISOString() || undefined,
  };
  publish(Channels.item(itemId), Events.BID_NEW, bidEvent);

  // Notify previous bidder they've been outbid
  if (previousBidderId && previousBidderId !== userId) {
    notifyOutbidUser(
      previousBidderId,
      item.name,
      item.auction.id,
      itemId,
      input.amount,
      item.currency.symbol,
      item.auction.name,
      item.currency.code,
    );
  }

  return bid;
}

/**
 * Notify outbid user (fire and forget)
 */
async function notifyOutbidUser(
  previousBidderId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  newAmount: number,
  currencySymbol: string,
  auctionName: string,
  currencyCode: string,
) {
  // Get previous bidder's highest bid for the outbid event
  const previousBid = await prisma.bid.findFirst({
    where: { auctionItemId: itemId, userId: previousBidderId },
    orderBy: { amount: "desc" },
    select: { amount: true },
  });

  // Publish realtime outbid event to user's private channel
  const outbidEvent: BidOutbidEvent = {
    itemId,
    itemName,
    auctionId,
    auctionName,
    newHighestBid: newAmount,
    currencyCode,
    yourBid: previousBid?.amount || 0,
  };
  publish(
    Channels.privateUser(previousBidderId),
    Events.BID_OUTBID,
    outbidEvent,
  );
  try {
    // In-app notification
    await notificationService.notifyOutbid(
      previousBidderId,
      itemName,
      auctionId,
      itemId,
      newAmount,
      currencySymbol,
    );

    // Get previous bidder info for email
    const previousBidder = await prisma.user.findUnique({
      where: { id: previousBidderId },
      select: { email: true, name: true },
    });

    if (previousBidder) {
      // Queue outbid email (await to ensure it completes on serverless)
      await queueOutbidEmail({
        previousBidderId,
        previousBidderEmail: previousBidder.email,
        previousBidderName: previousBidder.name || "",
        itemId,
        itemName,
        auctionId,
        auctionName,
        newAmount,
        currencySymbol,
      });
    }
  } catch (err) {
    console.error("Failed to notify outbid user:", err);
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Calculate minimum bid for an item
 */
export function calculateMinBid(
  currentBid: number | null,
  startingBid: number,
  minBidIncrement: number,
): number {
  return currentBid ? currentBid + minBidIncrement : startingBid;
}

/**
 * Validate bid amount
 */
export function validateBidAmount(
  amount: number,
  currentBid: number | null,
  startingBid: number,
  minBidIncrement: number,
): { valid: boolean; minBid: number } {
  const minBid = calculateMinBid(currentBid, startingBid, minBidIncrement);
  return {
    valid: amount >= minBid,
    minBid,
  };
}
