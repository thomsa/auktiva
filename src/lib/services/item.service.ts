import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/storage";
import { queueNewItemEmails } from "@/lib/email/service";
import * as notificationService from "./notification.service";
import { publish, Events, Channels } from "@/lib/realtime";
import type { ItemCreatedEvent } from "@/lib/realtime/events";
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
  isPublished?: boolean;
  discussionsEnabled?: boolean;
  isEditableByAdmin?: boolean;
}

export interface UpdateItemInput {
  name?: string;
  description?: string | null;
  currencyCode?: string | null;
  startingBid?: number;
  minBidIncrement?: number;
  bidderAnonymous?: boolean;
  endDate?: string | null;
  isPublished?: boolean;
  discussionsEnabled?: boolean;
  isEditableByAdmin?: boolean;
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
  isPublished: boolean;
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

export interface DiscussionForDisplay {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  parentId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  replies: DiscussionForDisplay[];
}

export interface ItemDetailPageData {
  item: ItemDetailForPage & {
    updatedAt: string;
    creatorId: string;
    discussionsEnabled: boolean;
  };
  bids: BidForDisplay[];
  images: { id: string; url: string; publicUrl: string; order: number }[];
  discussions: DiscussionForDisplay[];
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
    isPublished: item.isPublished,
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

  // Check if user can view this item (must be published or creator)
  if (!item.isPublished && item.creatorId !== viewerId) {
    return null;
  }

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

  // Get discussions as threaded tree
  const allDiscussions = await prisma.itemDiscussion.findMany({
    where: { auctionItemId: itemId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // Build threaded tree structure
  const discussionMap = new Map<string, DiscussionForDisplay>();
  const topLevelDiscussions: DiscussionForDisplay[] = [];

  for (const d of allDiscussions) {
    discussionMap.set(d.id, {
      id: d.id,
      content: d.content,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      isEdited: d.updatedAt > d.createdAt,
      parentId: d.parentId,
      user: d.user,
      replies: [],
    });
  }

  for (const d of allDiscussions) {
    const discussion = discussionMap.get(d.id)!;
    if (d.parentId) {
      const parent = discussionMap.get(d.parentId);
      if (parent) {
        parent.replies.push(discussion);
      }
    } else {
      topLevelDiscussions.push(discussion);
    }
  }

  // Sort top-level by newest first
  topLevelDiscussions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const isHighestBidder = item.highestBidderId === viewerId;
  const canEdit = isItemOwner || (isViewerAdmin && item.isEditableByAdmin);
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
      isPublished: item.isPublished,
      creatorId: item.creatorId,
      creator: item.creator,
      discussionsEnabled: item.discussionsEnabled,
    },
    bids,
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      publicUrl: getPublicUrl(img.url),
      order: img.order,
    })),
    discussions: topLevelDiscussions,
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
  const canEdit = isCreator || (isViewerAdmin && item.isEditableByAdmin);

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
      isPublished: item.isPublished,
      discussionsEnabled: item.discussionsEnabled,
      isEditableByAdmin: item.isEditableByAdmin,
    },
    hasBids: item._count.bids > 0,
    canEdit,
    isItemOwner: isCreator,
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
 * Only shows published items OR items created by the user
 */
export async function getAuctionItemsForListPage(
  auctionId: string,
  userId: string,
): Promise<ItemListItem[]> {
  const items = await prisma.auctionItem.findMany({
    where: {
      auctionId,
      OR: [{ isPublished: true }, { creatorId: userId }],
    },
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
    isPublished: item.isPublished,
    thumbnailUrl: item.images[0]?.url ? getPublicUrl(item.images[0].url) : null,
    currency: {
      symbol: item.currency.symbol,
    },
    _count: item._count,
  }));
}

/**
 * Get items for sidebar display
 * Only shows published items OR items created by the user
 */
export async function getAuctionItemsForSidebar(
  auctionId: string,
  userId: string,
): Promise<ItemSidebarItem[]> {
  const items = await prisma.auctionItem.findMany({
    where: {
      auctionId,
      OR: [{ isPublished: true }, { creatorId: userId }],
    },
    select: {
      id: true,
      name: true,
      currentBid: true,
      startingBid: true,
      endDate: true,
      createdAt: true,
      creatorId: true,
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
    creatorId: item.creatorId,
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
      isPublished: input.isPublished ?? false,
      isEditableByAdmin: input.isEditableByAdmin ?? false,
      creatorId,
      lastUpdatedById: creatorId,
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

  // Queue new item notification emails (await to ensure it completes on serverless)
  await queueNewItemEmails({
    itemId: item.id,
    itemName: item.name,
    itemDescription: item.description,
    itemImageUrl: firstImageUrl,
    auctionId,
    auctionName: auction?.name || "Auction",
    creatorId,
  });

  // Send in-app notifications to all auction members (except creator)
  await sendNewItemNotifications(
    auctionId,
    creatorId,
    item.name,
    item.description,
    firstImageUrl,
    item.id,
  );

  // Publish realtime event for new item (private auction channel - members only)
  const itemCreatedEvent: ItemCreatedEvent = {
    itemId: item.id,
    auctionId,
    name: item.name,
    creatorId,
    creatorName: item.creator.name || "Unknown",
    thumbnailUrl: firstImageUrl,
    startingBid: item.startingBid,
    currencyCode: item.currencyCode,
  };
  publish(
    Channels.privateAuction(auctionId),
    Events.ITEM_CREATED,
    itemCreatedEvent,
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
  updatedById: string,
) {
  const updateData: Record<string, unknown> = {
    lastUpdatedById: updatedById,
  };

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
  if (input.discussionsEnabled !== undefined) {
    updateData.discussionsEnabled = input.discussionsEnabled;
  }
  if (input.isEditableByAdmin !== undefined) {
    updateData.isEditableByAdmin = input.isEditableByAdmin;
  }

  // Only allow these if no bids
  if (!hasBids) {
    if (input.currencyCode !== undefined && input.currencyCode !== null)
      updateData.currencyCode = input.currencyCode;
    if (input.startingBid !== undefined)
      updateData.startingBid = input.startingBid;
    // Can only unpublish if no bids (publishing is always allowed)
    if (input.isPublished !== undefined) {
      updateData.isPublished = input.isPublished;
    }
  } else {
    // With bids, can only publish (not unpublish)
    if (input.isPublished === true) {
      updateData.isPublished = true;
    }
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
 * - Creator can always edit their own items
 * - Admins can only edit items where isEditableByAdmin is true OR they created the item
 */
export function canEditItem(
  userId: string,
  itemCreatorId: string,
  membership: AuctionMember | null,
  isEditableByAdmin: boolean = false,
): boolean {
  const isCreator = itemCreatorId === userId;
  if (isCreator) return true;

  const isAdmin = ["OWNER", "ADMIN"].includes(membership?.role || "");
  return isAdmin && isEditableByAdmin;
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
 * Get items for bulk editing - includes all editable fields
 */
export interface BulkEditItem {
  id: string;
  name: string;
  description: string | null;
  currencyCode: string;
  startingBid: number;
  minBidIncrement: number;
  isPublished: boolean;
  discussionsEnabled: boolean;
  isEditableByAdmin: boolean;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  lastUpdatedById: string | null;
  lastUpdatedByName: string | null;
  auctionId: string;
  auctionName: string;
  thumbnailUrl: string | null;
  bidCount: number;
  currencySymbol: string;
  creatorId: string;
  creatorName: string | null;
  creatorEmail: string;
}

export async function getUserItemsForBulkEdit(
  userId: string,
): Promise<BulkEditItem[]> {
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
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lastUpdatedBy: {
        select: {
          id: true,
          name: true,
        },
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

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    currencyCode: item.currencyCode,
    startingBid: item.startingBid,
    minBidIncrement: item.minBidIncrement,
    isPublished: item.isPublished,
    discussionsEnabled: item.discussionsEnabled,
    isEditableByAdmin: item.isEditableByAdmin,
    endDate: item.endDate?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lastUpdatedById: item.lastUpdatedById,
    lastUpdatedByName: item.lastUpdatedBy?.name ?? null,
    auctionId: item.auction.id,
    auctionName: item.auction.name,
    thumbnailUrl: item.images[0]?.url ? getPublicUrl(item.images[0].url) : null,
    bidCount: item._count.bids,
    currencySymbol: item.currency.symbol,
    creatorId: item.creator.id,
    creatorName: item.creator.name,
    creatorEmail: item.creator.email,
  }));
}

/**
 * Bulk update multiple items
 */
export interface BulkUpdateInput {
  currencyCode?: string;
  startingBid?: number;
  minBidIncrement?: number;
  isPublished?: boolean;
  discussionsEnabled?: boolean;
  isEditableByAdmin?: boolean;
}

export interface BulkUpdateError {
  itemId: string;
  itemName: string;
  errorType: "notOwner" | "hasBids" | "unknown";
}

export interface BulkUpdateResult {
  updated: number;
  skipped: number;
  errors?: BulkUpdateError[];
}

export async function bulkUpdateItems(
  itemIds: string[],
  userId: string,
  input: BulkUpdateInput,
): Promise<BulkUpdateResult> {
  // Get items that belong to this user and check bid counts
  const items = await prisma.auctionItem.findMany({
    where: {
      id: { in: itemIds },
      creatorId: userId,
    },
    select: {
      id: true,
      name: true,
      _count: { select: { bids: true } },
    },
  });

  const updateData: Record<string, unknown> = {};
  let updated = 0;
  let skipped = 0;
  const errors: BulkUpdateError[] = [];

  // Build update data based on what's allowed
  if (input.minBidIncrement !== undefined) {
    updateData.minBidIncrement = input.minBidIncrement;
  }
  if (input.discussionsEnabled !== undefined) {
    updateData.discussionsEnabled = input.discussionsEnabled;
  }
  if (input.isEditableByAdmin !== undefined) {
    updateData.isEditableByAdmin = input.isEditableByAdmin;
  }

  // For each item, apply updates based on whether it has bids
  for (const item of items) {
    const hasBids = item._count.bids > 0;
    const itemUpdateData = { ...updateData };

    // Only allow currency/startingBid/unpublish changes if no bids
    if (!hasBids) {
      if (input.currencyCode !== undefined) {
        itemUpdateData.currencyCode = input.currencyCode;
      }
      if (input.startingBid !== undefined) {
        itemUpdateData.startingBid = input.startingBid;
      }
      if (input.isPublished !== undefined) {
        itemUpdateData.isPublished = input.isPublished;
      }
    } else {
      // With bids, can only publish (not unpublish)
      if (input.isPublished === true) {
        itemUpdateData.isPublished = true;
      }
      // Skip items with bids if trying to change restricted fields
      if (
        input.currencyCode !== undefined ||
        input.startingBid !== undefined ||
        input.isPublished === false
      ) {
        errors.push({
          itemId: item.id,
          itemName: item.name,
          errorType: "hasBids",
        });
        skipped++;
        continue;
      }
    }

    if (Object.keys(itemUpdateData).length > 0) {
      await prisma.auctionItem.update({
        where: { id: item.id },
        data: itemUpdateData,
      });
      updated++;
    }
  }

  return { updated, skipped, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Get items that an admin can edit in a specific auction
 * Returns items where isEditableByAdmin=true OR creatorId=userId
 */
export async function getAdminEditableItems(
  auctionId: string,
  userId: string,
): Promise<BulkEditItem[]> {
  const items = await prisma.auctionItem.findMany({
    where: {
      auctionId,
      OR: [{ isEditableByAdmin: true }, { creatorId: userId }],
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
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lastUpdatedBy: {
        select: {
          id: true,
          name: true,
        },
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

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    currencyCode: item.currencyCode,
    startingBid: item.startingBid,
    minBidIncrement: item.minBidIncrement,
    isPublished: item.isPublished,
    discussionsEnabled: item.discussionsEnabled,
    isEditableByAdmin: item.isEditableByAdmin,
    endDate: item.endDate?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lastUpdatedById: item.lastUpdatedById,
    lastUpdatedByName: item.lastUpdatedBy?.name ?? null,
    auctionId: item.auction.id,
    auctionName: item.auction.name,
    thumbnailUrl: item.images[0]?.url ? getPublicUrl(item.images[0].url) : null,
    bidCount: item._count.bids,
    currencySymbol: item.currency.symbol,
    creatorId: item.creator.id,
    creatorName: item.creator.name,
    creatorEmail: item.creator.email,
  }));
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
    isPublished: item.isPublished,
    winner: item.bids[0]?.user
      ? {
          name: item.bids[0].user.name,
          email: item.bids[0].user.email,
        }
      : null,
  }));
}
