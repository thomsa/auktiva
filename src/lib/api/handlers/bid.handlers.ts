import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api/errors";
import * as bidService from "@/lib/services/bid.service";
import * as itemService from "@/lib/services/item.service";
import * as auctionCurrencyService from "@/lib/services/auction-currency.service";
import {
  normalizeBidValue,
  evaluateBidRules,
} from "@/lib/services/auction-currency-rule.service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const createBidSchema = z
  .object({
    amount: z.number().positive("Bid amount must be positive").optional(),
    enteredRepresentation: z.record(z.string(), z.unknown()).optional(),
    currencyProfileId: z.string().optional(),
    isAnonymous: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.amount === undefined &&
      value.enteredRepresentation === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Either amount or entered representation is required",
      });
    }
  });

export type CreateBidBody = z.infer<typeof createBidSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/auctions/[id]/items/[itemId]/bids - List bids
 */
export const listBids: ApiHandler = async (_req, res, ctx) => {
  const bids = await bidService.getItemBids(ctx.params.itemId);
  res.status(200).json(bids);
};

/**
 * POST /api/auctions/[id]/items/[itemId]/bids - Place bid
 */
export const placeBid: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;

  const { validatedBody } = req as ValidatedRequest<CreateBidBody>;

  // Get item with auction info
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      currency: true,
      auction: { select: { bidderVisibility: true } },
    },
  });

  if (!item || item.auctionId !== auctionId) {
    throw new NotFoundError("Item not found");
  }

  // Check if item is published
  if (!item.isPublished) {
    throw new BadRequestError("Cannot bid on unpublished items");
  }

  // Check if user is the item creator
  if (item.creatorId === ctx.session!.user.id) {
    throw new ForbiddenError("You cannot bid on your own item");
  }

  // Check if bidding has ended
  if (itemService.isItemEnded(item.endDate)) {
    throw new BadRequestError("Bidding has ended for this item");
  }

  const currencyProfile =
    await auctionCurrencyService.resolveAuctionCurrencyForBid(
      auctionId,
      validatedBody.currencyProfileId,
    );

  const normalizedAmount = normalizeBidValue(currencyProfile, {
    amount: validatedBody.amount,
    enteredRepresentation: validatedBody.enteredRepresentation,
  });

  if (normalizedAmount === null) {
    throw new BadRequestError("Invalid bid representation", {
      type: "INVALID_BID_REPRESENTATION",
    });
  }

  const ruleViolations = evaluateBidRules({
    normalizedAmount,
    currentHighestNormalized: item.currentBid,
    rules: currencyProfile?.rules ?? [],
    enteredRepresentation: validatedBody.enteredRepresentation,
  });

  if (ruleViolations.length > 0) {
    throw new BadRequestError("Bid violates auction currency rules", {
      type: "RULE_VIOLATION",
      violations: ruleViolations,
    });
  }

  // Backward-compatible minimum check for auctions without custom rule configs
  const { valid, minBid } = bidService.validateBidAmount(
    normalizedAmount,
    item.currentBid,
    item.startingBid,
    item.minBidIncrement,
  );

  if (!valid) {
    throw new BadRequestError(`Minimum bid is ${minBid.toFixed(2)}`);
  }

  const bid = await bidService.placeBid(
    itemId,
    ctx.session!.user.id,
    {
      amount: validatedBody.amount ?? normalizedAmount,
      normalizedAmount,
      enteredRepresentation: validatedBody.enteredRepresentation,
      currencyProfileId: currencyProfile?.id,
      isAnonymous: validatedBody.isAnonymous,
    },
    item.auction.bidderVisibility,
  );

  res.status(201).json(bid);
};
