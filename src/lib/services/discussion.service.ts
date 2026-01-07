import { prisma } from "@/lib/prisma";
import type { AuctionMember } from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface DiscussionUser {
  id: string;
  name: string | null;
  image: string | null;
}

export interface DiscussionWithReplies {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  parentId: string | null;
  user: DiscussionUser;
  replies: DiscussionWithReplies[];
}

export interface CreateDiscussionInput {
  content: string;
  parentId?: string | null;
}

export interface UpdateDiscussionInput {
  content: string;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get discussions for an item as a threaded tree
 * Returns only top-level discussions with nested replies
 */
export async function getItemDiscussions(
  itemId: string,
  order: "newest" | "oldest" = "newest",
): Promise<DiscussionWithReplies[]> {
  // Fetch all discussions for the item
  const allDiscussions = await prisma.itemDiscussion.findMany({
    where: { auctionItemId: itemId },
    orderBy: { createdAt: "asc" }, // Always asc for building tree, we'll sort top-level later
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  // Build a map for quick lookup
  const discussionMap = new Map<string, DiscussionWithReplies>();
  const topLevel: DiscussionWithReplies[] = [];

  // First pass: create all discussion objects
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

  // Second pass: build tree structure
  for (const d of allDiscussions) {
    const discussion = discussionMap.get(d.id)!;
    if (d.parentId) {
      const parent = discussionMap.get(d.parentId);
      if (parent) {
        parent.replies.push(discussion);
      }
    } else {
      topLevel.push(discussion);
    }
  }

  // Sort top-level by order preference
  if (order === "newest") {
    topLevel.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    topLevel.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  return topLevel;
}

/**
 * Get a single discussion by ID
 */
export async function getDiscussionById(discussionId: string) {
  return prisma.itemDiscussion.findUnique({
    where: { id: discussionId },
    include: {
      auctionItem: {
        select: {
          id: true,
          auctionId: true,
          creatorId: true,
          discussionsEnabled: true,
        },
      },
    },
  });
}

/**
 * Check if item has discussions enabled
 */
export async function getItemDiscussionsEnabled(itemId: string): Promise<boolean> {
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    select: { discussionsEnabled: true },
  });
  return item?.discussionsEnabled ?? false;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new discussion (top-level or reply)
 */
export async function createDiscussion(
  itemId: string,
  userId: string,
  input: CreateDiscussionInput,
): Promise<DiscussionWithReplies> {
  const discussion = await prisma.itemDiscussion.create({
    data: {
      auctionItemId: itemId,
      userId,
      content: input.content,
      parentId: input.parentId || null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return {
    id: discussion.id,
    content: discussion.content,
    createdAt: discussion.createdAt.toISOString(),
    updatedAt: discussion.updatedAt.toISOString(),
    isEdited: false,
    parentId: discussion.parentId,
    user: discussion.user,
    replies: [],
  };
}

/**
 * Update a discussion
 */
export async function updateDiscussion(
  discussionId: string,
  input: UpdateDiscussionInput,
): Promise<DiscussionWithReplies> {
  const discussion = await prisma.itemDiscussion.update({
    where: { id: discussionId },
    data: {
      content: input.content,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return {
    id: discussion.id,
    content: discussion.content,
    createdAt: discussion.createdAt.toISOString(),
    updatedAt: discussion.updatedAt.toISOString(),
    isEdited: discussion.updatedAt > discussion.createdAt,
    parentId: discussion.parentId,
    user: discussion.user,
    replies: [], // Replies not included in update response
  };
}

/**
 * Delete a discussion (cascades to replies)
 */
export async function deleteDiscussion(discussionId: string): Promise<void> {
  await prisma.itemDiscussion.delete({
    where: { id: discussionId },
  });
}

// ============================================================================
// Authorization helpers
// ============================================================================

/**
 * Check if user can delete a discussion
 * - Discussion author can delete their own
 * - Item creator can delete any discussion on their item
 * - Auction OWNER/ADMIN can delete any discussion
 */
export function canDeleteDiscussion(
  userId: string,
  discussionUserId: string,
  itemCreatorId: string,
  membership: AuctionMember,
): boolean {
  // Discussion author
  if (userId === discussionUserId) return true;

  // Item creator
  if (userId === itemCreatorId) return true;

  // Auction OWNER or ADMIN
  if (membership.role === "OWNER" || membership.role === "ADMIN") return true;

  return false;
}

/**
 * Check if user can edit a discussion
 * - Only discussion author can edit
 */
export function canEditDiscussion(userId: string, discussionUserId: string): boolean {
  return userId === discussionUserId;
}
