import { prisma } from "@/lib/prisma";
import type { AuctionMember } from "@/generated/prisma/client";

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
 * Remove a member from an auction
 */
export async function removeMember(memberId: string): Promise<void> {
  await prisma.auctionMember.delete({
    where: { id: memberId },
  });
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
