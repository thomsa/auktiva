import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import { NotFoundError, ForbiddenError } from "@/lib/api/errors";
import * as memberService from "@/lib/services/member.service";
import * as auctionService from "@/lib/services/auction.service";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "CREATOR", "BIDDER"]),
});

export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * PATCH /api/auctions/[id]/members/[memberId] - Update member role
 */
export const updateMemberRole: ApiHandler = async (req, res, ctx) => {
  const memberId = ctx.params.memberId;
  const auctionId = ctx.params.id;

  const targetMember = await memberService.getMemberById(memberId);

  if (!targetMember || targetMember.auctionId !== auctionId) {
    throw new NotFoundError("Member not found");
  }

  const { canModify, reason } = memberService.canModifyMember(
    targetMember,
    ctx.session!.user.id,
  );
  if (!canModify) {
    throw new ForbiddenError(reason!);
  }

  const { validatedBody } = req as ValidatedRequest<UpdateRoleBody>;

  const updated = await memberService.updateMemberRole(
    memberId,
    validatedBody.role,
  );

  res.status(200).json({
    id: updated.id,
    role: updated.role,
    user: updated.user,
  });
};

/**
 * DELETE /api/auctions/[id]/members/[memberId] - Remove member
 */
export const removeMember: ApiHandler = async (_req, res, ctx) => {
  const memberId = ctx.params.memberId;
  const auctionId = ctx.params.id;

  const targetMember = await memberService.getMemberById(memberId);

  if (!targetMember || targetMember.auctionId !== auctionId) {
    throw new NotFoundError("Member not found");
  }

  const { canModify, reason } = memberService.canModifyMember(
    targetMember,
    ctx.session!.user.id,
  );
  if (!canModify) {
    throw new ForbiddenError(reason!);
  }

  await memberService.removeMember(memberId);
  res.status(200).json({ message: "Member removed successfully" });
};

/**
 * GET /api/auctions/[id]/leave - Preflight check for leaving auction
 */
export const leaveAuctionPreflight: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const userId = ctx.session!.user.id;

  const result = await memberService.leaveAuctionPreflight(auctionId, userId);
  res.status(200).json(result);
};

/**
 * POST /api/auctions/[id]/leave - Leave auction
 */
export const leaveAuction: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const userId = ctx.session!.user.id;

  try {
    await memberService.leaveAuction(auctionId, userId);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Cannot leave auction";
    if (
      ["NOT_A_MEMBER", "OWNER_CANNOT_LEAVE", "HAS_ACTIVE_ITEMS"].includes(
        reason,
      )
    ) {
      throw new ForbiddenError(reason);
    }
    throw error;
  }

  res.status(200).json({ message: "Left auction successfully" });
};

/**
 * POST /api/auctions/[id]/rejoin - Rejoin a public auction the user previously left
 */
export const rejoinAuction: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const userId = ctx.session!.user.id;

  try {
    await auctionService.rejoinAuction(auctionId, userId);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Cannot rejoin auction";
    if (reason === "AUCTION_NOT_FOUND") {
      throw new NotFoundError("Auction not found");
    }
    if (["NOT_PUBLIC_AUCTION", "NOT_LEFT", "ALREADY_MEMBER"].includes(reason)) {
      throw new ForbiddenError(reason);
    }
    throw error;
  }

  res.status(200).json({ message: "Rejoined auction successfully" });
};
