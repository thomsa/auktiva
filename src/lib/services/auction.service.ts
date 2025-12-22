import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/storage";
import { MemberRole } from "@/generated/prisma/enums";
import type { Auction, AuctionMember } from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface AuctionWithCounts extends Auction {
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    items: number;
    members: number;
  };
}

export interface AuctionListItem {
  id: string;
  name: string;
  description: string | null;
  endDate: string | null;
  createdAt: string;
  role: string;
  thumbnailUrl: string | null;
  _count: {
    items: number;
    members: number;
  };
}

export interface CreateAuctionInput {
  name: string;
  description?: string | null;
  joinMode?: "FREE" | "INVITE_ONLY" | "LINK";
  memberCanInvite?: boolean;
  bidderVisibility?: "VISIBLE" | "ANONYMOUS" | "PER_BID";
  endDate?: string | null;
  itemEndMode?: "AUCTION_END" | "CUSTOM" | "NONE";
}

export interface UpdateAuctionInput {
  name?: string;
  description?: string | null;
  joinMode?: "FREE" | "INVITE_ONLY" | "LINK";
  memberCanInvite?: boolean;
  bidderVisibility?: "VISIBLE" | "ANONYMOUS" | "PER_BID";
  itemEndMode?: "AUCTION_END" | "CUSTOM" | "NONE";
  endDate?: string | null;
}

export interface AuctionDetailForPage {
  id: string;
  name: string;
  description: string | null;
  joinMode: string;
  memberCanInvite: boolean;
  bidderVisibility: string;
  endDate: string | null;
  itemEndMode: string;
  inviteToken: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    items: number;
    members: number;
  };
}

export interface CloseAuctionResult {
  auction: {
    id: string;
    name: string;
    endDate: string | undefined;
  };
  winners: Array<{
    itemId: string;
    itemName: string;
    winningBid: number;
    winner: {
      id: string;
      name: string | null;
      email: string;
    };
    currencyCode: string;
  }>;
  totalItems: number;
  itemsWithBids: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get auction by ID with creator and counts
 */
export async function getAuctionById(
  auctionId: string,
): Promise<AuctionWithCounts | null> {
  return prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });
}

/**
 * Get auction for detail page with all necessary data
 */
export async function getAuctionForDetailPage(
  auctionId: string,
): Promise<AuctionDetailForPage | null> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });

  if (!auction) return null;

  return {
    ...auction,
    endDate: auction.endDate?.toISOString() || null,
    createdAt: auction.createdAt.toISOString(),
    updatedAt: auction.updatedAt.toISOString(),
    thumbnailUrl: auction.thumbnailUrl
      ? getPublicUrl(auction.thumbnailUrl)
      : null,
  };
}

/**
 * Get all auctions for a user (as member)
 */
export async function getUserAuctions(
  userId: string,
): Promise<AuctionListItem[]> {
  const memberships = await prisma.auctionMember.findMany({
    where: { userId },
    include: {
      auction: {
        include: {
          _count: {
            select: {
              items: true,
              members: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.auction.id,
    name: m.auction.name,
    description: m.auction.description,
    endDate: m.auction.endDate?.toISOString() || null,
    createdAt: m.auction.createdAt.toISOString(),
    role: m.role,
    thumbnailUrl: m.auction.thumbnailUrl
      ? getPublicUrl(m.auction.thumbnailUrl)
      : null,
    _count: m.auction._count,
  }));
}

/**
 * Get open auctions that user is not a member of
 */
export async function getOpenAuctionsForUser(
  userId: string,
): Promise<AuctionListItem[]> {
  const memberAuctionIds = await prisma.auctionMember.findMany({
    where: { userId },
    select: { auctionId: true },
  });

  const openAuctions = await prisma.auction.findMany({
    where: {
      joinMode: "FREE",
      id: { notIn: memberAuctionIds.map((m) => m.auctionId) },
    },
    include: {
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });

  return openAuctions.map((auction) => ({
    id: auction.id,
    name: auction.name,
    description: auction.description,
    endDate: auction.endDate?.toISOString() || null,
    createdAt: auction.createdAt.toISOString(),
    role: "Open",
    thumbnailUrl: auction.thumbnailUrl
      ? getPublicUrl(auction.thumbnailUrl)
      : null,
    _count: auction._count,
  }));
}

/**
 * Get user's membership for an auction
 */
export async function getUserMembership(
  auctionId: string,
  userId: string,
): Promise<AuctionMember | null> {
  return prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId,
      },
    },
  });
}

/**
 * Get user's membership with auction details
 */
export async function getUserMembershipWithAuction(
  auctionId: string,
  userId: string,
) {
  return prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId,
      },
    },
    include: {
      auction: true,
    },
  });
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create a new auction with the creator as owner
 */
export async function createAuction(
  creatorId: string,
  input: CreateAuctionInput,
): Promise<AuctionWithCounts> {
  return prisma.auction.create({
    data: {
      name: input.name,
      description: input.description || null,
      joinMode: input.joinMode || "INVITE_ONLY",
      memberCanInvite: input.memberCanInvite || false,
      bidderVisibility: input.bidderVisibility || "VISIBLE",
      endDate: input.endDate ? new Date(input.endDate) : null,
      itemEndMode: input.itemEndMode || "CUSTOM",
      creatorId,
      members: {
        create: {
          userId: creatorId,
          role: "OWNER",
        },
      },
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });
}

/**
 * Update an auction
 */
export async function updateAuction(
  auctionId: string,
  input: UpdateAuctionInput,
): Promise<Auction> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.joinMode !== undefined) updateData.joinMode = input.joinMode;
  if (input.memberCanInvite !== undefined)
    updateData.memberCanInvite = input.memberCanInvite;
  if (input.bidderVisibility !== undefined)
    updateData.bidderVisibility = input.bidderVisibility;
  if (input.itemEndMode !== undefined)
    updateData.itemEndMode = input.itemEndMode;
  if (input.endDate !== undefined) {
    updateData.endDate = input.endDate ? new Date(input.endDate) : null;
  }

  return prisma.auction.update({
    where: { id: auctionId },
    data: updateData,
  });
}

/**
 * Delete an auction
 */
export async function deleteAuction(auctionId: string): Promise<void> {
  await prisma.auction.delete({
    where: { id: auctionId },
  });
}

/**
 * Close an auction and all its items
 */
export async function closeAuction(
  auctionId: string,
): Promise<CloseAuctionResult> {
  // Get all items with their highest bids
  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    include: {
      bids: {
        orderBy: { amount: "desc" },
        take: 1,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  // Close the auction by setting end date to now
  const auction = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      endDate: new Date(),
    },
  });

  // Close all items that haven't ended yet
  const now = new Date();
  await prisma.auctionItem.updateMany({
    where: {
      auctionId,
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    data: {
      endDate: now,
    },
  });

  // Prepare winners summary
  const winners = items
    .filter((item) => item.bids.length > 0)
    .map((item) => ({
      itemId: item.id,
      itemName: item.name,
      winningBid: item.bids[0].amount,
      winner: item.bids[0].user,
      currencyCode: item.currencyCode,
    }));

  return {
    auction: {
      id: auction.id,
      name: auction.name,
      endDate: auction.endDate?.toISOString(),
    },
    winners,
    totalItems: items.length,
    itemsWithBids: winners.length,
  };
}

/**
 * Auto-join user to an open/link auction
 */
export async function autoJoinAuction(
  auctionId: string,
  userId: string,
): Promise<AuctionMember> {
  return prisma.auctionMember.create({
    data: {
      auctionId,
      userId,
      role: MemberRole.BIDDER,
    },
  });
}

/**
 * Get auction results data for results page
 */
export async function getAuctionResultsData(auctionId: string, userId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  });

  if (!auction) return null;

  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    include: {
      currency: true,
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
      bids: {
        orderBy: { amount: "desc" },
        take: 1,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { bids: true },
      },
    },
  });

  const totalBids = items.reduce((sum, item) => sum + item._count.bids, 0);

  const winners = items
    .filter((item) => item.bids.length > 0)
    .map((item) => ({
      itemId: item.id,
      itemName: item.name,
      thumbnailUrl: item.images[0]?.url
        ? getPublicUrl(item.images[0].url)
        : null,
      winningBid: item.bids[0].amount,
      currencyCode: item.currencyCode,
      currencySymbol: item.currency.symbol,
      winner: item.bidderAnonymous ? null : item.bids[0].user,
      isCurrentUser: item.bids[0].userId === userId,
    }));

  const userWins = winners.filter((w) => w.isCurrentUser);

  const isEnded = auction.endDate
    ? new Date(auction.endDate) < new Date()
    : false;

  return {
    auction: {
      id: auction.id,
      name: auction.name,
      description: auction.description,
      endDate: auction.endDate?.toISOString() || null,
      isEnded,
    },
    winners,
    userWins,
    totalItems: items.length,
    totalBids,
  };
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if user is owner of auction
 */
export function isOwner(membership: AuctionMember | null): boolean {
  return membership?.role === "OWNER";
}

/**
 * Check if user is admin (owner or admin role)
 */
export function isAdmin(membership: AuctionMember | null): boolean {
  return membership?.role === "OWNER" || membership?.role === "ADMIN";
}

/**
 * Check if user can create items
 */
export function canCreateItems(membership: AuctionMember | null): boolean {
  return ["OWNER", "ADMIN", "CREATOR"].includes(membership?.role || "");
}

/**
 * Check if auction allows open join
 */
export function canAutoJoin(auction: Auction): boolean {
  return auction.joinMode === "FREE" || auction.joinMode === "LINK";
}
