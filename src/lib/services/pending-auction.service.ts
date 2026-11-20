import { prisma } from "@/lib/prisma";
import { canAutoJoin } from "@/utils/auction-helpers";

export const PENDING_AUCTION_ARRIVAL_PARAM = "pendingAuction";

/**
 * Resolve the account's saved auction. Use a legacy redirect only for accounts
 * with no saved destination.
 */
export async function getPendingAuctionRedirect(
  userId: string,
  options: { fallback?: string; includeArrivalId?: boolean } = {},
): Promise<string> {
  const pending = await prisma.pendingAuctionDestination.findUnique({
    where: { userId },
    select: {
      id: true,
      auctionId: true,
      expiresAt: true,
      auction: { select: { joinMode: true } },
    },
  });

  if (!pending) return options.fallback ?? "/dashboard";
  if (pending.expiresAt <= new Date() || !canAutoJoin(pending.auction)) {
    return "/dashboard";
  }

  const destination = `/auctions/${encodeURIComponent(pending.auctionId)}`;
  if (!options.includeArrivalId) return destination;

  // Keep the login redirect tied to the same record until the auction opens.
  const query = new URLSearchParams({
    [PENDING_AUCTION_ARRIVAL_PARAM]: pending.id,
  });
  return `${destination}?${query}`;
}

export function getPendingAuctionArrival(
  userId: string,
  auctionId: string,
  arrivalId?: string | string[],
) {
  if (Array.isArray(arrivalId)) return null;

  return prisma.pendingAuctionDestination.findUnique({
    where: {
      userId,
      id: arrivalId,
      auctionId,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
}

export async function consumePendingAuctionDestination(
  id: string,
  userId: string,
  auctionId: string,
) {
  await prisma.pendingAuctionDestination.deleteMany({
    where: { id, userId, auctionId },
  });
}
