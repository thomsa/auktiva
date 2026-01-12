import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import * as auctionService from "@/lib/services/auction.service";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const createAuctionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  joinMode: z.enum(["FREE", "INVITE_ONLY", "LINK"]).optional(),
  memberCanInvite: z.boolean().optional(),
  bidderVisibility: z.enum(["VISIBLE", "ANONYMOUS", "PER_BID"]).optional(),
  endDate: z.string().optional(),
  itemEndMode: z.enum(["AUCTION_END", "CUSTOM", "NONE"]).optional(),
});

export const updateAuctionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  joinMode: z.enum(["FREE", "INVITE_ONLY", "LINK"]).optional(),
  memberCanInvite: z.boolean().optional(),
  bidderVisibility: z.enum(["VISIBLE", "ANONYMOUS", "PER_BID"]).optional(),
  itemEndMode: z.enum(["AUCTION_END", "CUSTOM", "NONE"]).optional(),
  endDate: z.string().nullable().optional(),
  defaultItemsEditableByAdmin: z.boolean().optional(),
});

export type CreateAuctionBody = z.infer<typeof createAuctionSchema>;
export type UpdateAuctionBody = z.infer<typeof updateAuctionSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/auctions - List user's auctions
 */
export const listAuctions: ApiHandler = async (_req, res, ctx) => {
  const auctions = await auctionService.getUserAuctions(ctx.session!.user.id);
  res.status(200).json(auctions);
};

/**
 * POST /api/auctions - Create a new auction
 */
export const createAuction: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<CreateAuctionBody>;

  // Check if open auctions are allowed
  const allowOpenAuctions = process.env.ALLOW_OPEN_AUCTIONS === "true";
  if (validatedBody.joinMode === "FREE" && !allowOpenAuctions) {
    throw new BadRequestError("Open auctions are not allowed on this server");
  }

  const auction = await auctionService.createAuction(
    ctx.session!.user.id,
    validatedBody,
  );
  res.status(201).json(auction);
};

/**
 * GET /api/auctions/[id] - Get auction details
 */
export const getAuction: ApiHandler = async (_req, res, ctx) => {
  const auction = await auctionService.getAuctionById(ctx.params.id);

  if (!auction) {
    throw new NotFoundError("Auction not found");
  }

  res.status(200).json({
    ...auction,
    endDate: auction.endDate?.toISOString() || null,
    createdAt: auction.createdAt.toISOString(),
    updatedAt: auction.updatedAt.toISOString(),
  });
};

/**
 * PATCH /api/auctions/[id] - Update auction
 */
export const updateAuction: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<UpdateAuctionBody>;

  // Check if open auctions are allowed
  const allowOpenAuctions = process.env.ALLOW_OPEN_AUCTIONS === "true";
  if (validatedBody.joinMode === "FREE" && !allowOpenAuctions) {
    throw new BadRequestError("Open auctions are not allowed on this server");
  }

  const auction = await auctionService.updateAuction(
    ctx.params.id,
    validatedBody,
  );

  res.status(200).json({
    ...auction,
    endDate: auction.endDate?.toISOString() || null,
    createdAt: auction.createdAt.toISOString(),
    updatedAt: auction.updatedAt.toISOString(),
  });
};

/**
 * DELETE /api/auctions/[id] - Delete auction
 */
export const deleteAuction: ApiHandler = async (_req, res, ctx) => {
  await auctionService.deleteAuction(ctx.params.id);
  res.status(200).json({ message: "Auction deleted successfully" });
};

/**
 * POST /api/auctions/[id]/close - Close auction
 */
export const closeAuction: ApiHandler = async (_req, res, ctx) => {
  const result = await auctionService.closeAuction(ctx.params.id);

  res.status(200).json({
    message: "Auction closed successfully",
    ...result,
  });
};
