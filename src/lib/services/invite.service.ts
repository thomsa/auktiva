import { prisma } from "@/lib/prisma";
import { queueInviteEmail } from "@/lib/email/service";
import type { AuctionInvite } from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface InviteWithDetails extends AuctionInvite {
  sender: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    name: string;
  };
}

export interface InviteForDisplay {
  auction: {
    id: string;
    name: string;
    description: string | null;
  };
  sender: {
    name: string | null;
    email: string;
  };
  role: string;
  email: string;
}

export interface CreateInviteInput {
  email: string;
  role?: "ADMIN" | "CREATOR" | "BIDDER";
}

export interface InviteForList {
  id: string;
  email: string;
  role: string;
  token: string;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  sender: {
    name: string | null;
    email: string;
  };
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get invites for an auction (for invite page)
 */
export async function getAuctionInvitesForPage(
  auctionId: string,
): Promise<InviteForList[]> {
  const invites = await prisma.auctionInvite.findMany({
    where: { auctionId },
    include: {
      sender: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    token: i.token,
    usedAt: i.usedAt?.toISOString() || null,
    expiresAt: i.expiresAt?.toISOString() || null,
    createdAt: i.createdAt.toISOString(),
    sender: i.sender,
  }));
}

/**
 * Get invite by token
 */
export async function getInviteByToken(
  token: string,
): Promise<AuctionInvite | null> {
  return prisma.auctionInvite.findUnique({
    where: { token },
  });
}

/**
 * Get invite for display (public info)
 */
export async function getInviteForDisplay(
  token: string,
): Promise<InviteForDisplay | null> {
  const invite = await prisma.auctionInvite.findUnique({
    where: { token },
    include: {
      auction: {
        select: { id: true, name: true, description: true },
      },
      sender: {
        select: { name: true, email: true },
      },
    },
  });

  if (!invite) return null;

  return {
    auction: invite.auction,
    sender: invite.sender,
    role: invite.role,
    email: invite.email,
  };
}

/**
 * Get all invites for an auction
 */
export async function getAuctionInvites(
  auctionId: string,
): Promise<InviteWithDetails[]> {
  return prisma.auctionInvite.findMany({
    where: { auctionId },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
      auction: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create or update an invite
 */
export async function createInvite(
  auctionId: string,
  senderId: string,
  input: CreateInviteInput,
  isAdmin: boolean,
): Promise<InviteWithDetails> {
  const email = input.email.toLowerCase();

  // Non-admins can only invite as BIDDER
  const inviteRole = isAdmin ? input.role || "BIDDER" : "BIDDER";

  const invite = await prisma.auctionInvite.upsert({
    where: {
      auctionId_email: {
        auctionId,
        email,
      },
    },
    create: {
      auctionId,
      email,
      role: inviteRole,
      senderId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    update: {
      role: inviteRole,
      senderId,
      usedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
      auction: {
        select: { name: true },
      },
    },
  });

  // Queue invite email (await to ensure it completes on serverless)
  await queueInviteEmail({
    inviteId: invite.id,
    email: invite.email,
    auctionId: invite.auctionId,
    auctionName: invite.auction.name,
    senderName: invite.sender.name || invite.sender.email,
    token: invite.token,
    role: invite.role,
  });

  return invite;
}

/**
 * Accept an invite and create membership
 */
export async function acceptInvite(
  token: string,
  userId: string,
): Promise<{ auctionId: string; alreadyMember: boolean }> {
  const invite = await prisma.auctionInvite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new Error("Invite not found");
  }

  // Check if already a member
  const existingMembership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId: invite.auctionId,
        userId,
      },
    },
  });

  if (existingMembership) {
    // Mark invite as used and return success
    await prisma.auctionInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    });
    return { auctionId: invite.auctionId, alreadyMember: true };
  }

  // Create membership and mark invite as used
  await prisma.$transaction([
    prisma.auctionMember.create({
      data: {
        auctionId: invite.auctionId,
        userId,
        role: invite.role,
        invitedById: invite.senderId,
      },
    }),
    prisma.auctionInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return { auctionId: invite.auctionId, alreadyMember: false };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate invite status
 */
export function validateInviteStatus(invite: AuctionInvite): {
  valid: boolean;
  reason?: string;
} {
  if (invite.usedAt) {
    return { valid: false, reason: "Invite already used" };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { valid: false, reason: "Invite expired" };
  }

  return { valid: true };
}

/**
 * Check if user email matches invite email
 */
export function validateInviteEmail(
  invite: AuctionInvite,
  userEmail: string,
): { valid: boolean; reason?: string } {
  if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      valid: false,
      reason: `This invite is for ${invite.email}. Please login with that email.`,
    };
  }

  return { valid: true };
}

/**
 * Check if user is already a member
 */
export async function checkExistingMembership(
  auctionId: string,
  email: string,
): Promise<boolean> {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!existingUser) return false;

  const existingMembership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: existingUser.id,
      },
    },
  });

  return !!existingMembership;
}

/**
 * Check if invite already exists and is unused
 */
export async function checkExistingInvite(
  auctionId: string,
  email: string,
): Promise<boolean> {
  const existingInvite = await prisma.auctionInvite.findUnique({
    where: {
      auctionId_email: {
        auctionId,
        email: email.toLowerCase(),
      },
    },
  });

  return !!existingInvite && !existingInvite.usedAt;
}
