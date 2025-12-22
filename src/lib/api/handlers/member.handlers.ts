import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import { NotFoundError, ForbiddenError } from "@/lib/api/errors";
import * as memberService from "@/lib/services/member.service";
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
