import { prisma } from "@/lib/prisma";
import type { AuctionMember } from "@/generated/prisma/client";
import { publish, Events, Channels } from "@/lib/realtime";
import * as notificationService from "./notification.service";

// ============================================================================
// Types
// ============================================================================

export interface MemberWithUser extends AuctionMember {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface MemberForList {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  invitedBy: {
    name: string | null;
    email: string;
  } | null;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all members of an auction
 */
export async function getAuctionMembers(
  auctionId: string,
): Promise<MemberWithUser[]> {
  return prisma.auctionMember.findMany({
    where: { auctionId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
}

/**
 * Get members for list page with inviter info
 */
export async function getAuctionMembersForListPage(
  auctionId: string,
): Promise<MemberForList[]> {
  const members = await prisma.auctionMember.findMany({
    where: { auctionId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  // Fetch inviter info
  const inviterIds = members
    .filter((m) => m.invitedById)
    .map((m) => m.invitedById as string);

  const inviters =
    inviterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

  const inviterMap = new Map(inviters.map((i) => [i.id, i]));

  return members.map((m) => ({
    id: m.id,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
    user: m.user,
    invitedBy: m.invitedById ? inviterMap.get(m.invitedById) || null : null,
  }));
}

/**
 * Get a specific member by ID
 */
export async function getMemberById(
  memberId: string,
): Promise<MemberWithUser | null> {
  return prisma.auctionMember.findUnique({
    where: { id: memberId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Update a member's role
 */
export async function updateMemberRole(
  memberId: string,
  newRole: "ADMIN" | "CREATOR" | "BIDDER",
): Promise<MemberWithUser> {
  return prisma.auctionMember.update({
    where: { id: memberId },
    data: { role: newRole },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Remove a member from an auction (admin action).
 * Cleans up bids on active items and recalculates state.
 */
export async function removeMember(memberId: string): Promise<void> {
  const member = await prisma.auctionMember.findUnique({
    where: { id: memberId },
  });

  if (!member) return;

  const { affectedItems } = await cleanupMemberBidsAndRemove(
    member.auctionId,
    member.userId,
  );

  // Publish realtime events and notify restored bidders (fire-and-forget)
  publishBidUpdatesAndNotify(member.auctionId, affectedItems);
}

// ============================================================================
// Leave Auction (Self-removal)
// ============================================================================

export interface LeavePreflightResult {
  canLeave: boolean;
  reason?: string;
  bidCount: number;
  activeOwnedItemCount: number;
  activeOwnedItems: Array<{ id: string; name: string }>;
}

/**
 * Preflight check for leaving an auction.
 * Returns whether the user can leave, their bid count, and any blocking items.
 */
export async function leaveAuctionPreflight(
  auctionId: string,
  userId: string,
): Promise<LeavePreflightResult> {
  const membership = await prisma.auctionMember.findUnique({
    where: { auctionId_userId: { auctionId, userId } },
  });

  if (!membership) {
    return {
      canLeave: false,
      reason: "NOT_A_MEMBER",
      bidCount: 0,
      activeOwnedItemCount: 0,
      activeOwnedItems: [],
    };
  }

  if (membership.role === "OWNER") {
    return {
      canLeave: false,
      reason: "OWNER_CANNOT_LEAVE",
      bidCount: 0,
      activeOwnedItemCount: 0,
      activeOwnedItems: [],
    };
  }

  // Count bids by this user in this auction
  const bidCount = await prisma.bid.count({
    where: {
      userId,
      auctionItem: { auctionId },
    },
  });

  // Check auction end state first
  const now = new Date();
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { endDate: true },
  });
  const auctionEnded = auction?.endDate && new Date(auction.endDate) <= now;

  // Find items created by this user that are still active
  // An item is active if:
  //   - It has a future endDate, OR
  //   - It has no endDate AND the auction hasn't ended
  const activeOwnedItems = await prisma.auctionItem.findMany({
    where: {
      auctionId,
      creatorId: userId,
      OR: [
        { endDate: { gt: now } },
        // Items with no endDate are only active if auction hasn't ended
        ...(auctionEnded ? [] : [{ endDate: null }]),
      ],
    },
    select: { id: true, name: true },
  });

  if (activeOwnedItems.length > 0) {
    return {
      canLeave: false,
      reason: "HAS_ACTIVE_ITEMS",
      bidCount,
      activeOwnedItemCount: activeOwnedItems.length,
      activeOwnedItems,
    };
  }

  return {
    canLeave: true,
    bidCount,
    activeOwnedItemCount: 0,
    activeOwnedItems: [],
  };
}

/**
 * Execute leave auction: verify eligibility inside transaction, remove bids
 * on active items, recalculate state, and delete membership.
 */
export async function leaveAuction(
  auctionId: string,
  userId: string,
): Promise<void> {
  const { affectedItems } = await cleanupMemberBidsAndRemove(
    auctionId,
    userId,
    true, // enforce preflight checks inside the transaction
  );

  // Publish realtime events and notify restored bidders (fire-and-forget)
  publishBidUpdatesAndNotify(auctionId, affectedItems);
}

// ============================================================================
// Internal Helpers
// ============================================================================

interface AffectedItem {
  itemId: string;
  itemName: string;
  newHighestBid: number | null;
  newHighestBidderId: string | null;
  currencySymbol: string;
  currencyCode: string;
}

/**
 * Core logic shared by leaveAuction and removeMember:
 * - Optionally enforces preflight checks inside the transaction (TOCTOU-safe)
 * - Only deletes bids on active items (preserves ended item results)
 * - Recalculates currentBid/highestBidderId for affected active items
 * - Deletes the membership record
 */
async function cleanupMemberBidsAndRemove(
  auctionId: string,
  userId: string,
  enforcePreflight = false,
): Promise<{ affectedItems: AffectedItem[] }> {
  const affectedItems: AffectedItem[] = [];

  await prisma.$transaction(async (tx) => {
    // 1. Verify membership and optionally enforce preflight inside the tx
    if (enforcePreflight) {
      const membership = await tx.auctionMember.findUnique({
        where: { auctionId_userId: { auctionId, userId } },
      });

      if (!membership) {
        throw new Error("NOT_A_MEMBER");
      }
      if (membership.role === "OWNER") {
        throw new Error("OWNER_CANNOT_LEAVE");
      }

      // Check for active owned items
      const now = new Date();
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        select: { endDate: true },
      });
      const auctionEnded = auction?.endDate && new Date(auction.endDate) <= now;

      const activeOwnedItemCount = await tx.auctionItem.count({
        where: {
          auctionId,
          creatorId: userId,
          OR: [
            { endDate: { gt: now } },
            ...(auctionEnded ? [] : [{ endDate: null }]),
          ],
        },
      });

      if (activeOwnedItemCount > 0) {
        throw new Error("HAS_ACTIVE_ITEMS");
      }
    }

    // 2. Determine which items have ended (to preserve their bids)
    const now = new Date();
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      select: { endDate: true },
    });
    const auctionEnded = auction?.endDate && new Date(auction.endDate) <= now;

    // 3. Find bids by this user on ACTIVE items only
    const userBidsOnActiveItems = await tx.bid.findMany({
      where: {
        userId,
        auctionItem: {
          auctionId,
          OR: [
            { endDate: { gt: now } },
            ...(auctionEnded ? [] : [{ endDate: null }]),
          ],
        },
      },
      select: { id: true, auctionItemId: true },
    });

    const activeAffectedItemIds = [
      ...new Set(userBidsOnActiveItems.map((b) => b.auctionItemId)),
    ];

    // 4. Delete bids only on active items
    if (userBidsOnActiveItems.length > 0) {
      await tx.bid.deleteMany({
        where: {
          id: { in: userBidsOnActiveItems.map((b) => b.id) },
        },
      });
    }

    // 5. Recalculate currentBid and highestBidderId for affected active items
    for (const itemId of activeAffectedItemIds) {
      const item = await tx.auctionItem.findUnique({
        where: { id: itemId },
        select: {
          name: true,
          currency: { select: { symbol: true, code: true } },
        },
      });

      const highestBid = await tx.bid.findFirst({
        where: { auctionItemId: itemId },
        orderBy: { amount: "desc" },
        select: { amount: true, userId: true },
      });

      await tx.auctionItem.update({
        where: { id: itemId },
        data: {
          currentBid: highestBid?.amount ?? null,
          highestBidderId: highestBid?.userId ?? null,
        },
      });

      affectedItems.push({
        itemId,
        itemName: item?.name || "",
        newHighestBid: highestBid?.amount ?? null,
        newHighestBidderId: highestBid?.userId ?? null,
        currencySymbol: item?.currency.symbol || "",
        currencyCode: item?.currency.code || "",
      });
    }

    // 6. Delete membership
    await tx.auctionMember.delete({
      where: { auctionId_userId: { auctionId, userId } },
    });

    // 7. Record the voluntary departure to prevent auto-rejoin on FREE/LINK auctions
    await tx.auctionLeave.upsert({
      where: { auctionId_userId: { auctionId, userId } },
      create: { auctionId, userId },
      update: { leftAt: new Date() },
    });
  });

  return { affectedItems };
}

/**
 * After the transaction commits, publish realtime events for each affected
 * item so other clients see updated bids. Also notify restored highest bidders.
 */
function publishBidUpdatesAndNotify(
  auctionId: string,
  affectedItems: AffectedItem[],
): void {
  for (const item of affectedItems) {
    // Publish ITEM_UPDATED so clients refetch bid data
    publish(Channels.item(item.itemId), Events.ITEM_UPDATED, {
      itemId: item.itemId,
      auctionId,
      changes: {},
    });

    // Notify the restored highest bidder (if any) that they're winning again
    if (item.newHighestBidderId && item.newHighestBid !== null) {
      notificationService
        .createNotification({
          userId: item.newHighestBidderId,
          type: "OUTBID",
          title: "You're back in the lead!",
          message: `Your bid of ${item.currencySymbol}${item.newHighestBid.toFixed(2)} on "${item.itemName}" is now the highest again`,
          auctionId,
          itemId: item.itemId,
        })
        .catch(() => {
          // Notification failure shouldn't break anything
        });
    }
  }
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if a member can be modified (not owner, not self)
 */
export function canModifyMember(
  targetMember: AuctionMember,
  currentUserId: string,
): { canModify: boolean; reason?: string } {
  if (targetMember.role === "OWNER") {
    return { canModify: false, reason: "Cannot modify the auction owner" };
  }

  if (targetMember.userId === currentUserId) {
    return { canModify: false, reason: "Cannot modify your own membership" };
  }

  return { canModify: true };
}
