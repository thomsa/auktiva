import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api/errors";
import * as discussionService from "@/lib/services/discussion.service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const createDiscussionSchema = z.object({
  content: z
    .string()
    .min(1, "Discussion cannot be empty")
    .max(2000, "Discussion is too long (max 2000 characters)"),
  parentId: z.string().optional().nullable(),
});

export const updateDiscussionSchema = z.object({
  content: z
    .string()
    .min(1, "Discussion cannot be empty")
    .max(2000, "Discussion is too long (max 2000 characters)"),
});

export type CreateDiscussionBody = z.infer<typeof createDiscussionSchema>;
export type UpdateDiscussionBody = z.infer<typeof updateDiscussionSchema>;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Sanitize HTML content to prevent XSS
 * Server-side sanitization - strips dangerous tags/attributes
 * Content is also sanitized on render via DOMPurify on client
 */
function sanitizeContent(content: string): string {
  const ALLOWED_TAGS = [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
  ];

  // Simple server-side sanitization - remove script tags and event handlers
  let sanitized = content
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  // Remove tags not in allowlist (keep content)
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tagName) => {
    if (ALLOWED_TAGS.includes(tagName.toLowerCase())) {
      return match;
    }
    return "";
  });

  return sanitized;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/auctions/[id]/items/[itemId]/discussions - List discussions
 */
export const listDiscussions: ApiHandler = async (req, res, ctx) => {
  const itemId = ctx.params.itemId;

  // Check item exists and belongs to auction
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      auctionId: true,
      discussionsEnabled: true,
      isPublished: true,
      creatorId: true,
    },
  });

  if (!item || item.auctionId !== ctx.params.id) {
    throw new NotFoundError("Item not found");
  }

  // Check if user can view unpublished items
  if (!item.isPublished) {
    const canView =
      ctx.session!.user.id === item.creatorId ||
      ctx.membership!.role === "OWNER" ||
      ctx.membership!.role === "ADMIN";
    if (!canView) {
      throw new NotFoundError("Item not found");
    }
  }

  // Get order from query params
  const order = req.query.order === "oldest" ? "oldest" : "newest";

  const discussions = await discussionService.getItemDiscussions(itemId, order);

  res.status(200).json({
    discussions,
    discussionsEnabled: item.discussionsEnabled,
  });
};

/**
 * POST /api/auctions/[id]/items/[itemId]/discussions - Create discussion
 */
export const createDiscussion: ApiHandler = async (req, res, ctx) => {
  const itemId = ctx.params.itemId;

  // Check item exists and has discussions enabled
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      auctionId: true,
      discussionsEnabled: true,
      isPublished: true,
      creatorId: true,
    },
  });

  if (!item || item.auctionId !== ctx.params.id) {
    throw new NotFoundError("Item not found");
  }

  // Check if user can view unpublished items
  if (!item.isPublished) {
    const canView =
      ctx.session!.user.id === item.creatorId ||
      ctx.membership!.role === "OWNER" ||
      ctx.membership!.role === "ADMIN";
    if (!canView) {
      throw new NotFoundError("Item not found");
    }
  }

  if (!item.discussionsEnabled) {
    throw new BadRequestError("Discussions are disabled for this item");
  }

  const { validatedBody } = req as ValidatedRequest<CreateDiscussionBody>;

  // Sanitize content
  const sanitizedContent = sanitizeContent(validatedBody.content);

  if (!sanitizedContent.trim() || sanitizedContent === "<p></p>") {
    throw new BadRequestError("Discussion cannot be empty");
  }

  // If replying, verify parent exists and belongs to same item
  if (validatedBody.parentId) {
    const parent = await discussionService.getDiscussionById(
      validatedBody.parentId,
    );
    if (!parent || parent.auctionItemId !== itemId) {
      throw new BadRequestError("Parent discussion not found");
    }
  }

  const discussion = await discussionService.createDiscussion(
    itemId,
    ctx.session!.user.id,
    {
      content: sanitizedContent,
      parentId: validatedBody.parentId || null,
    },
  );

  res.status(201).json(discussion);
};

/**
 * GET /api/auctions/[id]/items/[itemId]/discussions/[discussionId] - Get single discussion
 */
export const getDiscussion: ApiHandler = async (_req, res, ctx) => {
  const discussionId = ctx.params.discussionId;

  const discussion = await discussionService.getDiscussionById(discussionId);

  if (!discussion || discussion.auctionItem.auctionId !== ctx.params.id) {
    throw new NotFoundError("Discussion not found");
  }

  res.status(200).json(discussion);
};

/**
 * PATCH /api/auctions/[id]/items/[itemId]/discussions/[discussionId] - Update discussion
 */
export const updateDiscussion: ApiHandler = async (req, res, ctx) => {
  const discussionId = ctx.params.discussionId;

  const discussion = await discussionService.getDiscussionById(discussionId);

  if (!discussion || discussion.auctionItem.auctionId !== ctx.params.id) {
    throw new NotFoundError("Discussion not found");
  }

  // Only author can edit
  if (
    !discussionService.canEditDiscussion(
      ctx.session!.user.id,
      discussion.userId,
    )
  ) {
    throw new ForbiddenError("You can only edit your own discussions");
  }

  const { validatedBody } = req as ValidatedRequest<UpdateDiscussionBody>;

  // Sanitize content
  const sanitizedContent = sanitizeContent(validatedBody.content);

  if (!sanitizedContent.trim() || sanitizedContent === "<p></p>") {
    throw new BadRequestError("Discussion cannot be empty");
  }

  const updated = await discussionService.updateDiscussion(discussionId, {
    content: sanitizedContent,
  });

  res.status(200).json(updated);
};

/**
 * DELETE /api/auctions/[id]/items/[itemId]/discussions/[discussionId] - Delete discussion
 */
export const deleteDiscussion: ApiHandler = async (_req, res, ctx) => {
  const discussionId = ctx.params.discussionId;

  const discussion = await discussionService.getDiscussionById(discussionId);

  if (!discussion || discussion.auctionItem.auctionId !== ctx.params.id) {
    throw new NotFoundError("Discussion not found");
  }

  // Check delete permission
  if (
    !discussionService.canDeleteDiscussion(
      ctx.session!.user.id,
      discussion.userId,
      discussion.auctionItem.creatorId,
      ctx.membership!,
    )
  ) {
    throw new ForbiddenError(
      "You don't have permission to delete this discussion",
    );
  }

  await discussionService.deleteDiscussion(discussionId);

  res.status(200).json({ message: "Discussion deleted successfully" });
};
