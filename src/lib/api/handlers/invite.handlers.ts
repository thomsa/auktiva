import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api/errors";
import * as inviteService from "@/lib/services/invite.service";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "CREATOR", "BIDDER"]).optional(),
});

export type CreateInviteBody = z.infer<typeof createInviteSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/invites/[token] - Get invite details (public)
 */
export const getInvite: ApiHandler = async (_req, res, ctx) => {
  const invite = await inviteService.getInviteByToken(ctx.params.token);

  if (!invite) {
    throw new NotFoundError("Invite not found");
  }

  const status = inviteService.validateInviteStatus(invite);
  if (!status.valid) {
    throw new BadRequestError(status.reason!);
  }

  const inviteDetails = await inviteService.getInviteForDisplay(
    ctx.params.token,
  );
  res.status(200).json(inviteDetails);
};

/**
 * POST /api/invites/[token] - Accept invite
 */
export const acceptInvite: ApiHandler = async (_req, res, ctx) => {
  const invite = await inviteService.getInviteByToken(ctx.params.token);

  if (!invite) {
    throw new NotFoundError("Invite not found");
  }

  const status = inviteService.validateInviteStatus(invite);
  if (!status.valid) {
    throw new BadRequestError(status.reason!);
  }

  const emailCheck = inviteService.validateInviteEmail(
    invite,
    ctx.session!.user.email || "",
  );
  if (!emailCheck.valid) {
    throw new ForbiddenError(emailCheck.reason!);
  }

  const result = await inviteService.acceptInvite(
    ctx.params.token,
    ctx.session!.user.id,
  );

  res.status(200).json({
    message: result.alreadyMember
      ? "Already a member"
      : "Joined auction successfully",
    auctionId: result.auctionId,
  });
};

/**
 * GET /api/auctions/[id]/invites - List auction invites
 */
export const listAuctionInvites: ApiHandler = async (_req, res, ctx) => {
  const invites = await inviteService.getAuctionInvites(ctx.params.id);
  res.status(200).json(invites);
};

/**
 * POST /api/auctions/[id]/invites - Create invite
 */
export const createAuctionInvite: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const isAdmin = ["OWNER", "ADMIN"].includes(ctx.membership!.role);

  const { validatedBody } = req as ValidatedRequest<CreateInviteBody>;

  // Check if user is already a member
  const isMember = await inviteService.checkExistingMembership(
    auctionId,
    validatedBody.email,
  );
  if (isMember) {
    throw new BadRequestError("User is already a member");
  }

  // Check for existing unused invite
  const hasInvite = await inviteService.checkExistingInvite(
    auctionId,
    validatedBody.email,
  );
  if (hasInvite) {
    throw new BadRequestError("Invite already sent to this email");
  }

  const invite = await inviteService.createInvite(
    auctionId,
    ctx.session!.user.id,
    validatedBody,
    isAdmin,
  );

  res.status(201).json(invite);
};
