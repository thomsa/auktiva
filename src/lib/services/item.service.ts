import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/storage";
import { eventBus } from "@/lib/events/event-bus";
import * as notificationService from "./notification.service";
import type { AuctionItem, AuctionMember } from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface ItemListItem {
  id: string;
  name: string;
  description: string | null;
  currencyCode: string;
  startingBid: number;
  currentBid: number | null;
  endDate: string | null;
  createdAt: string;
  creatorId: string;
  thumbnailUrl: string | null;
  highestBidderId: string | null;
  userHasBid: boolean;
  currency: {
    symbol: string;
  };
  _count: {
    bids: number;
  };
}

export interface ItemSidebarItem {
  id: string;
  name: string;
  currentBid: number | null;
  startingBid: number;
  thumbnailUrl: string | null;
  endDate: string | null;
  createdAt: string;
  highestBidderId: string | null;
  userHasBid: boolean;
  currency: {
    symbol: string;
  };
}

export interface CreateItemInput {
  name: string;
  description?: string | null;
  currencyCode: string;
  startingBid?: number;
  minBidIncrement?: number;
  bidderAnonymous?: boolean;
  endDate?: string | null;
}

export interface UpdateItemInput {
  name?: string;
  description?: string | null;
  currencyCode?: string | null;
  startingBid?: number;
  minBidIncrement?: number;
  bidderAnonymous?: boolean;
  endDate?: string | null;
}

export interface ItemWithDetails extends AuctionItem {
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface ItemDetailForPage {
  id: string;
  name: string;
  description: string | null;
  currencyCode: string;
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  startingBid: number;
  minBidIncrement: number;
  currentBid: number | null;
  highestBidderId: string | null;
  bidderAnonymous: boolean;
  endDate: string | null;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface BidForDisplay {
  id: string;
  amount: number;
  createdAt: string;
  isAnonymous: boolean;
  user: {
    id: string;
    name: string | null;
  } | null;
}

export interface ItemDetailPageData {
  item: ItemDetailForPage & { updatedAt: string; creatorId: string };
  bids: BidForDisplay[];
  images: { id: string; url: string; publicUrl: string; order: number }[];
  isHighestBidder: boolean;
  canBid: boolean;
  canEdit: boolean;
  isItemOwner: boolean;
  winnerEmail: string | null;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get item by ID with currency and creator
 */
export async function getItemById(
  itemId: string,
): Promise<ItemWithDetails | null> {
  return prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      currency: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Get item for detail page (basic)
 */
export async function getItemForDetailPage(
  itemId: string,
): Promise<ItemDetailForPage | null> {
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      currency: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!item) return null;

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    currencyCode: item.currencyCode,
    currency: item.currency,
    startingBid: item.startingBid,
    minBidIncrement: item.minBidIncrement,
    currentBid: item.currentBid,
    highestBidderId: item.highestBidderId,
    bidderAnonymous: item.bidderAnonymous,
    endDate: item.endDate?.toISOString() || null,
    createdAt: item.createdAt.toISOString(),
    creator: item.creator,
  };
}

/**
 * Get comprehensive item data for detail page
 */
export async function getItemDetailPageData(
  itemId: string,
  auctionId: string,
  viewerId: string,
  bidderVisibility: string,
  isViewerAdmin: boolean,
): Promise<ItemDetailPageData | null> {
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      currency: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!item || item.auctionId !== auctionId) return null;

  // Get bids with user info
  const bidsRaw = await prisma.bid.findMany({
    where: { auctionItemId: itemId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { amount: "desc" },
  });

  // Check if item has ended
  const isItemEnded = item.endDate && new Date(item.endDate) < new Date();
  const isItemOwner = item.creatorId === viewerId;
  const highestBid = bidsRaw[0] || null;

  // Get winner email only if item ended and viewer is item owner
  let winnerEmail: string | null = null;
  if (isItemEnded && isItemOwner && highestBid) {
    const winner = await prisma.user.findUnique({
      where: { id: highestBid.userId },
      select: { email: true },
    });
    winnerEmail = winner?.email || null;
  }

  // Filter user info based on visibility settings
  const bids: BidForDisplay[] = bidsRaw.map((bid) => {
    if (isItemOwner) {
      return {
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt.toISOString(),
        isAnonymous: bid.isAnonymous,
        user: bid.user,
      };
    }

    if (bidderVisibility === "VISIBLE") {
      return {
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt.toISOString(),
        isAnonymous: false,
        user: bid.user,
      };
    }

    if (bidderVisibility === "ANONYMOUS") {
      return {
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt.toISOString(),
        isAnonymous: true,
        user: null,
      };
    }

    // PER_BID
    return {
      id: bid.id,
      amount: bid.amount,
      createdAt: bid.createdAt.toISOString(),
      isAnonymous: bid.isAnonymous,
      user: bid.isAnonymous ? null : bid.user,
    };
  });

  // Get item images
  const images = await prisma.auctionItemImage.findMany({
    where: { auctionItemId: itemId },
    orderBy: { order: "asc" },
  });

  const isHighestBidder = item.highestBidderId === viewerId;
  const canEdit = isItemOwner || isViewerAdmin;
  const canBid = !isItemOwner && !isItemEnded;

  return {
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      currencyCode: item.currencyCode,
      currency: item.currency,
      startingBid: item.startingBid,
      minBidIncrement: item.minBidIncrement,
      currentBid: item.currentBid,
      highestBidderId: item.highestBidderId,
      bidderAnonymous: item.bidderAnonymous,
      endDate: item.endDate?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      creatorId: item.creatorId,
      creator: item.creator,
    },
    bids,
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      publicUrl: getPublicUrl(img.url),
      order: img.order,
    })),
    isHighestBidder,
    canBid,
    canEdit,
    isItemOwner,
    winnerEmail,
  };
}

/**
 * Get item data for edit page
 */
export async function getItemForEditPage(
  itemId: string,
  auctionId: string,
  viewerId: string,
  isViewerAdmin: boolean,
) {
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      _count: {
        select: { bids: true },
      },
    },
  });

  if (!item || item.auctionId !== auctionId) return null;

  const isCreator = item.creatorId === viewerId;
  const canEdit = isCreator || isViewerAdmin;

  // Get item images
  const images = await prisma.auctionItemImage.findMany({
    where: { auctionItemId: itemId },
    orderBy: { order: "asc" },
  });

  return {
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      currencyCode: item.currencyCode,
      startingBid: item.startingBid,
      minBidIncrement: item.minBidIncrement,
      bidderAnonymous: item.bidderAnonymous,
      endDate: item.endDate?.toISOString() || null,
      currentBid: item.currentBid,
    },
    hasBids: item._count.bids > 0,
    canEdit,
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      publicUrl: getPublicUrl(img.url),
      order: img.order,
    })),
  };
}

/**
 * Get all items for an auction
 */
export async function getAuctionItems(
  auctionId: string,
): Promise<AuctionItem[]> {
  return prisma.auctionItem.findMany({
    where: { auctionId },
    include: {
      currency: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { bids: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get items for auction list page with user bid status
 */
export async function getAuctionItemsForListPage(
  auctionId: string,
  userId: string,
): Promise<ItemListItem[]> {
  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    include: {
      currency: {
        select: { symbol: true },
      },
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
      _count: {
        select: { bids: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get items user has bid on
  const userBids = await prisma.bid.findMany({
    where: {
      userId,
      auctionItem: { auctionId },
    },
    select: { auctionItemId: true },
    distinct: ["auctionItemId"],
  });

  const userBidItemIds = new Set(userBids.map((b) => b.auctionItemId));

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    currencyCode: item.currencyCode,
    startingBid: item.startingBid,
    currentBid: item.currentBid,
    highestBidderId: item.highestBidderId,
    userHasBid: userBidItemIds.has(item.id),
    endDate: item.endDate?.toISOString() || null,
    createdAt: item.createdAt.toISOString(),
    creatorId: item.creatorId,
    thumbnailUrl: item.images[0]?.url ? getPublicUrl(item.images[0].url) : null,
    currency: {
      symbol: item.currency.symbol,
    },
    _count: item._count,
  }));
}

/**
 * Get items for sidebar display
 */
export async function getAuctionItemsForSidebar(
  auctionId: string,
  userId: string,
): Promise<ItemSidebarItem[]> {
  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    select: {
      id: true,
      name: true,
      currentBid: true,
      startingBid: true,
      endDate: true,
      createdAt: true,
      highestBidderId: true,
      currency: {
        select: { symbol: true },
      },
      images: {
        select: { url: true },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get user's bids
  const userBids = await prisma.bid.findMany({
    where: {
      userId,
      auctionItem: { auctionId },
    },
    select: { auctionItemId: true },
    distinct: ["auctionItemId"],
  });

  const userBidItemIds = new Set(userBids.map((b) => b.auctionItemId));

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    currentBid: item.currentBid,
    startingBid: item.startingBid,
    endDate: item.endDate?.toISOString() || null,
    createdAt: item.createdAt.toISOString(),
    highestBidderId: item.highestBidderId,
    thumbnailUrl: item.images[0]?.url ? getPublicUrl(item.images[0].url) : null,
    userHasBid: userBidItemIds.has(item.id),
    currency: item.currency,
  }));
}

/**
 * Get bids for an item with visibility filtering
 */
export async function getItemBidsForDisplay(
  itemId: string,
  viewerId: string,
  itemCreatorId: string,
  bidderVisibility: string,
): Promise<BidForDisplay[]> {
  const bidsRaw = await prisma.bid.findMany({
    where: { auctionItemId: itemId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { amount: "desc" },
  });

  const isItemOwner = itemCreatorId === viewerId;

  return bidsRaw.map((bid) => {
    // Item owner always sees bidder names
    if (isItemOwner) {
      return {
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt.toISOString(),
        isAnonymous: bid.isAnonymous,
        user: bid.user,
      };
    }

    // Always visible - show all bidders
    if (bidderVisibility === "VISIBLE") {
      return {
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt.toISOString(),
        isAnonymous: false,
        user: bid.user,
      };
    }

    // Always anonymous - hide all bidders
    if (bidderVisibility === "ANONYMOUS") {
      return {
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt.toISOString(),
        isAnonymous: true,
        user: null,
      };
    }

    // PER_BID - respect each bid's isAnonymous setting
    if (bid.isAnonymous) {
      return {
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt.toISOString(),
        isAnonymous: true,
        user: null,
      };
    }

    return {
      id: bid.id,
      amount: bid.amount,
      createdAt: bid.createdAt.toISOString(),
      isAnonymous: false,
      user: bid.user,
    };
  });
}

/**
 * Get winner email for ended item (only for item owner)
 */
export async function getItemWinnerEmail(
  itemId: string,
  viewerId: string,
  itemCreatorId: string,
  itemEndDate: Date | null,
): Promise<string | null> {
  const isItemEnded = itemEndDate && itemEndDate < new Date();
  const isItemOwner = itemCreatorId === viewerId;

  if (!isItemEnded || !isItemOwner) return null;

  const highestBid = await prisma.bid.findFirst({
    where: { auctionItemId: itemId },
    orderBy: { amount: "desc" },
    select: { userId: true },
  });

  if (!highestBid) return null;

  const winner = await prisma.user.findUnique({
    where: { id: highestBid.userId },
    select: { email: true },
  });

  return winner?.email || null;
}

/**
 * Get item images
 */
export async function getItemImages(itemId: string) {
  const images = await prisma.auctionItemImage.findMany({
    where: { auctionItemId: itemId },
    orderBy: { order: "asc" },
  });

  return images.map((img) => ({
    id: img.id,
    url: img.url,
    publicUrl: getPublicUrl(img.url),
    order: img.order,
  }));
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create a new item
 */
export async function createItem(
  auctionId: string,
  creatorId: string,
  input: CreateItemInput,
) {
  // Get auction name for notifications
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { name: true },
  });

  const item = await prisma.auctionItem.create({
    data: {
      auctionId,
      name: input.name,
      description: input.description || null,
      currencyCode: input.currencyCode,
      startingBid: input.startingBid || 0,
      minBidIncrement: input.minBidIncrement || 1,
      bidderAnonymous: input.bidderAnonymous || false,
      endDate: input.endDate ? new Date(input.endDate) : null,
      creatorId,
    },
    include: {
      currency: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
      images: {
        orderBy: { order: "asc" },
        take: 1,
        select: { url: true },
      },
      _count: {
        select: { bids: true },
      },
    },
  });

  // Get the first image URL for notifications
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.auktiva.org";
  const firstImageUrl =
    item.images.length > 0
      ? item.images[0].url.startsWith("http")
        ? item.images[0].url
        : `${appUrl}${item.images[0].url}`
      : null;

  // Emit event for new item notification emails
  eventBus.emit("item.created", {
    itemId: item.id,
    itemName: item.name,
    itemDescription: item.description,
    itemImageUrl: firstImageUrl,
    auctionId,
    auctionName: auction?.name || "Auction",
    creatorId,
  });

  // Send in-app notifications to all auction members (except creator)
  sendNewItemNotifications(
    auctionId,
    creatorId,
    item.name,
    item.description,
    firstImageUrl,
    item.id,
  );

  return item;
}

/**
 * Send new item notifications to auction members (fire and forget)
 */
async function sendNewItemNotifications(
  auctionId: string,
  creatorId: string,
  itemName: string,
  itemDescription: string | null,
  imageUrl: string | null,
  itemId: string,
) {
  try {
    const members = await prisma.auctionMember.findMany({
      where: {
        auctionId,
        userId: { not: creatorId },
      },
      select: { userId: true },
    });

    await Promise.all(
      members.map((member) =>
        notificationService.notifyNewItem(
          member.userId,
          itemName,
          itemDescription,
          imageUrl,
          auctionId,
          itemId,
        ),
      ),
    );
  } catch (err) {
    console.error("Failed to send new item notifications:", err);
  }
}

/**
 * Update an item
 */
export async function updateItem(
  itemId: string,
  input: UpdateItemInput,
  hasBids: boolean,
) {
  const updateData: Record<string, unknown> = {};

  // Always allowed updates
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.minBidIncrement !== undefined)
    updateData.minBidIncrement = input.minBidIncrement;
  if (input.bidderAnonymous !== undefined)
    updateData.bidderAnonymous = input.bidderAnonymous;
  if (input.endDate !== undefined) {
    updateData.endDate = input.endDate ? new Date(input.endDate) : null;
  }

  // Only allow these if no bids
  if (!hasBids) {
    if (input.currencyCode !== undefined && input.currencyCode !== null)
      updateData.currencyCode = input.currencyCode;
    if (input.startingBid !== undefined)
      updateData.startingBid = input.startingBid;
  }

  return prisma.auctionItem.update({
    where: { id: itemId },
    data: updateData,
    include: {
      currency: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Delete an item
 */
export async function deleteItem(itemId: string): Promise<void> {
  await prisma.auctionItem.delete({
    where: { id: itemId },
  });
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if user can edit an item
 */
export function canEditItem(
  userId: string,
  itemCreatorId: string,
  membership: AuctionMember | null,
): boolean {
  const isCreator = itemCreatorId === userId;
  const isAdmin = ["OWNER", "ADMIN"].includes(membership?.role || "");
  return isCreator || isAdmin;
}

/**
 * Check if user can bid on an item
 */
export function canBidOnItem(
  userId: string,
  itemCreatorId: string,
  isEnded: boolean,
): boolean {
  return userId !== itemCreatorId && !isEnded;
}

/**
 * Check if item has ended
 */
export function isItemEnded(endDate: Date | string | null): boolean {
  if (!endDate) return false;
  const date = typeof endDate === "string" ? new Date(endDate) : endDate;
  return date < new Date();
}

/**
 * Get items created by a user across all auctions they're a member of
 */
export async function getUserCreatedItems(userId: string) {
  const items = await prisma.auctionItem.findMany({
    where: {
      creatorId: userId,
      auction: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      auction: {
        select: {
          id: true,
          name: true,
        },
      },
      currency: {
        select: {
          symbol: true,
        },
      },
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
      bids: {
        orderBy: { amount: "desc" },
        take: 1,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: { bids: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    auctionId: item.auction.id,
    auctionName: item.auction.name,
    currencySymbol: item.currency.symbol,
    startingBid: item.startingBid,
    currentBid: item.bids[0]?.amount ?? null,
    endDate: item.endDate?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    thumbnailUrl: item.images[0]?.url ? getPublicUrl(item.images[0].url) : null,
    bidCount: item._count.bids,
    winner: item.bids[0]?.user
      ? {
          name: item.bids[0].user.name,
          email: item.bids[0].user.email,
        }
      : null,
  }));
}
