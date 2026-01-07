import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api/errors";
import * as itemService from "@/lib/services/item.service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  currencyCode: z.string().min(1, "Currency is required"),
  startingBid: z.number().min(0).optional(),
  minBidIncrement: z.number().min(0.01).optional(),
  bidderAnonymous: z.boolean().optional(),
  endDate: z.string().optional(),
  isPublished: z.boolean().optional(),
  commentsEnabled: z.boolean().optional(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  currencyCode: z.string().length(3).nullable().optional(),
  startingBid: z.number().min(0).optional(),
  minBidIncrement: z.number().min(0.01).optional(),
  bidderAnonymous: z.boolean().optional(),
  endDate: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  commentsEnabled: z.boolean().optional(),
});

export type CreateItemBody = z.infer<typeof createItemSchema>;
export type UpdateItemBody = z.infer<typeof updateItemSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/auctions/[id]/items - List auction items
 */
export const listItems: ApiHandler = async (_req, res, ctx) => {
  const items = await itemService.getAuctionItems(ctx.params.id);
  res.status(200).json(items);
};

/**
 * POST /api/auctions/[id]/items - Create item
 */
export const createItem: ApiHandler = async (req, res, ctx) => {
  // Only OWNER, ADMIN, or CREATOR can add items
  if (!["OWNER", "ADMIN", "CREATOR"].includes(ctx.membership!.role)) {
    throw new ForbiddenError("Not authorized to add items");
  }

  const { validatedBody } = req as ValidatedRequest<CreateItemBody>;

  // Verify currency exists
  const currency = await prisma.currency.findUnique({
    where: { code: validatedBody.currencyCode },
  });

  if (!currency) {
    throw new BadRequestError("Invalid currency");
  }

  const item = await itemService.createItem(
    ctx.params.id,
    ctx.session!.user.id,
    validatedBody,
  );

  res.status(201).json(item);
};

/**
 * GET /api/auctions/[id]/items/[itemId] - Get item details
 */
export const getItem: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;

  const item = await itemService.getItemForDetailPage(itemId);

  if (!item) {
    throw new NotFoundError("Item not found");
  }

  // Get membership with auction for visibility settings
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: ctx.session!.user.id,
      },
    },
    include: {
      auction: {
        select: { bidderVisibility: true },
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Not a member of this auction");
  }

  // Get bids with visibility filtering
  const bids = await itemService.getItemBidsForDisplay(
    itemId,
    ctx.session!.user.id,
    item.creator.id,
    membership.auction.bidderVisibility,
  );

  // Get winner email if applicable
  const winnerEmail = await itemService.getItemWinnerEmail(
    itemId,
    ctx.session!.user.id,
    item.creator.id,
    item.endDate ? new Date(item.endDate) : null,
  );

  res.status(200).json({
    item,
    bids,
    winnerEmail,
  });
};

/**
 * PATCH /api/auctions/[id]/items/[itemId] - Update item
 */
export const updateItem: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;

  // Get item with auction settings
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      _count: { select: { bids: true } },
      auction: {
        select: { endDate: true, itemEndMode: true },
      },
    },
  });

  if (!item || item.auctionId !== auctionId) {
    throw new NotFoundError("Item not found");
  }

  // Check permissions
  if (
    !itemService.canEditItem(
      ctx.session!.user.id,
      item.creatorId,
      ctx.membership!,
    )
  ) {
    throw new ForbiddenError("You don't have permission to edit this item");
  }

  const { validatedBody } = req as ValidatedRequest<UpdateItemBody>;

  // Validate isPublished changes - cannot unpublish items with bids
  if (validatedBody.isPublished === false && item._count.bids > 0) {
    throw new BadRequestError(
      "Cannot unpublish an item that has received bids",
    );
  }

  // Validate end date changes
  if (validatedBody.endDate !== undefined) {
    const newEndDate = validatedBody.endDate
      ? new Date(validatedBody.endDate)
      : null;
    const now = new Date();
    const isItemEnded = item.endDate && item.endDate < now;

    if (isItemEnded && newEndDate && newEndDate > now) {
      throw new BadRequestError(
        "Cannot extend end date for an item that has already ended",
      );
    }

    if (
      newEndDate &&
      item.auction.endDate &&
      newEndDate > item.auction.endDate
    ) {
      throw new BadRequestError(
        "Item end date cannot be after the auction end date",
      );
    }

    // Allow ending items early (setting end date to now or past) regardless of itemEndMode
    // Only block setting future custom dates in non-CUSTOM modes
    const isEndingNow = newEndDate && newEndDate <= now;
    if (
      item.auction.itemEndMode !== "CUSTOM" &&
      newEndDate !== null &&
      !isEndingNow
    ) {
      throw new BadRequestError(
        "Custom item end dates are not allowed for this auction",
      );
    }
  }

  const updated = await itemService.updateItem(
    itemId,
    validatedBody,
    item._count.bids > 0,
  );

  res.status(200).json({
    ...updated,
    endDate: updated.endDate?.toISOString() || null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
};

/**
 * DELETE /api/auctions/[id]/items/[itemId] - Delete item
 */
export const deleteItem: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;

  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: { _count: { select: { bids: true } } },
  });

  if (!item || item.auctionId !== auctionId) {
    throw new NotFoundError("Item not found");
  }

  if (
    !itemService.canEditItem(
      ctx.session!.user.id,
      item.creatorId,
      ctx.membership!,
    )
  ) {
    throw new ForbiddenError("You don't have permission to delete this item");
  }

  if (item._count.bids > 0) {
    throw new BadRequestError("Cannot delete items that have bids");
  }

  await itemService.deleteItem(itemId);
  res.status(200).json({ message: "Item deleted successfully" });
};
