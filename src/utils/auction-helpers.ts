/**
 * Auction and item business logic helpers
 */

export function isAuctionEnded(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

export function isItemEnded(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

export function canUserBid(
  userId: string,
  itemCreatorId: string,
  isItemEnded: boolean,
): boolean {
  if (isItemEnded) return false;
  if (userId === itemCreatorId) return false;
  return true;
}

export function canUserEditItem(
  userId: string,
  itemCreatorId: string,
  memberRole: string,
): boolean {
  if (userId === itemCreatorId) return true;
  if (["OWNER", "ADMIN"].includes(memberRole)) return true;
  return false;
}

export function canUserCreateItems(memberRole: string): boolean {
  return ["OWNER", "ADMIN", "CREATOR"].includes(memberRole);
}

export function canUserInvite(
  memberRole: string,
  memberCanInvite: boolean,
): boolean {
  if (["OWNER", "ADMIN"].includes(memberRole)) return true;
  return memberCanInvite;
}

export function canUserManageMembers(memberRole: string): boolean {
  return ["OWNER", "ADMIN"].includes(memberRole);
}

export function isUserOwner(memberRole: string): boolean {
  return memberRole === "OWNER";
}

export function isUserAdmin(memberRole: string): boolean {
  return ["OWNER", "ADMIN"].includes(memberRole);
}

export function calculateMinBid(
  currentBid: number | null,
  startingBid: number,
  minBidIncrement: number,
): number {
  return currentBid ? currentBid + minBidIncrement : startingBid;
}

export function getBidStatus(
  isHighestBidder: boolean,
  isEnded: boolean,
): "winning" | "won" | "outbid" | "lost" {
  if (isEnded) {
    return isHighestBidder ? "won" : "lost";
  }
  return isHighestBidder ? "winning" : "outbid";
}

export const ROLE_COLORS: Record<string, string> = {
  OWNER: "badge-primary",
  ADMIN: "badge-secondary",
  CREATOR: "badge-accent",
  BIDDER: "badge-ghost",
};

export const ROLE_OPTIONS = ["ADMIN", "CREATOR", "BIDDER"] as const;
