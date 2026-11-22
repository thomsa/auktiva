/**
 * Auction and item business logic helpers
 */

import { isResultItemEnded } from "@/lib/results-summary";

export function canAutoJoin(auction: { joinMode: string }): boolean {
  return auction.joinMode === "FREE" || auction.joinMode === "LINK";
}

export function isAuctionEnded(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

/**
 * Whether an item has ended. The item's own end date wins; an item without
 * one ends with the auction; with neither set it stays open. This is the
 * same rule the bid API enforces (`isBiddingClosed`), so views and the
 * server agree. The auction end date is required on purpose: pass `null`
 * only when the auction has no end date.
 */
export function isItemEnded(
  itemEndDate: Date | string | null | undefined,
  auctionEndDate: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  return isResultItemEnded(itemEndDate, auctionEndDate, now);
}

/**
 * The moment an item ends or ended: its own end date, else the auction's.
 * Null when neither is set. Returned as given (ISO string or Date).
 */
export function getEffectiveItemEndDate<T extends Date | string>(
  itemEndDate: T | null | undefined,
  auctionEndDate: T | null | undefined,
): T | null {
  return itemEndDate ?? auctionEndDate ?? null;
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
