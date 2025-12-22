import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "../errors";
import type { Middleware } from "../types";
import type { MemberRole } from "@/generated/prisma/client";

/**
 * Middleware that checks if the user is a member of the auction.
 * Requires withAuth to be called first.
 * Adds membership to context.
 *
 * @param options.roles - Optional array of roles required (e.g., ["OWNER", "ADMIN"])
 * @param options.includeAuction - Include auction data in membership
 */
export function withMembership(options?: {
  roles?: MemberRole[];
  includeAuction?: boolean;
}): Middleware {
  return (next) => async (req, res, ctx) => {
    if (!ctx.session?.user?.id) {
      throw new ForbiddenError("Authentication required");
    }

    const auctionId = ctx.params.id;

    if (!auctionId) {
      throw new ForbiddenError("Auction ID required");
    }

    const membership = await prisma.auctionMember.findUnique({
      where: {
        auctionId_userId: {
          auctionId,
          userId: ctx.session.user.id,
        },
      },
      include: options?.includeAuction
        ? {
            auction: {
              select: {
                bidderVisibility: true,
                endDate: true,
                itemEndMode: true,
              },
            },
          }
        : undefined,
    });

    if (!membership) {
      throw new ForbiddenError("Not a member of this auction");
    }

    // Check role if specified
    if (options?.roles && !options.roles.includes(membership.role)) {
      throw new ForbiddenError(
        "You don't have permission to perform this action",
      );
    }

    ctx.membership = membership;

    return next(req, res, ctx);
  };
}

/**
 * Simple membership check without role requirements
 */
export const requireMembership = withMembership();

/**
 * Require OWNER role
 */
export const requireOwner = withMembership({ roles: ["OWNER"] });

/**
 * Require OWNER or ADMIN role
 */
export const requireAdmin = withMembership({ roles: ["OWNER", "ADMIN"] });
