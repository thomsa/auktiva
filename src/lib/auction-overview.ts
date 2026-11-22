/**
 * Pure helpers for the auction overview header: auction phase and time left,
 * item and bid tallies, and who may see or do what. No React, no I/O, so the
 * page, the close dialog and the unit tests share one source of truth.
 *
 * "Ended" follows the same rule as bidding and results (`isResultItemEnded`):
 * an item ends at its own end date, else at the auction's, and only once that
 * instant lies strictly in the past.
 */
import { isResultItemEnded } from "@/lib/results-summary";

/**
 * live: the auction's deadline is still ahead;
 * open: the auction has no deadline;
 * overtime: the deadline passed but some items still take bids
 *   (anti-snipe extensions or item dates later than the auction's);
 * ended: the deadline passed and no item takes bids.
 */
export type AuctionPhase = "live" | "open" | "overtime" | "ended";

export interface AuctionTimingInput {
  endDate: string | null;
  itemEndMode: string;
}

export interface TimingItem {
  endDate: string | null;
  isPublished?: boolean;
}

export interface AuctionTiming {
  phase: AuctionPhase;
  /** Items carry their own end dates (ItemEndMode.CUSTOM). */
  perItem: boolean;
  /** Auction end as epoch ms, or null when the auction has no end date. */
  endsAt: number | null;
  /** Milliseconds until the auction's deadline, never negative; null without one. */
  msLeft: number | null;
  /** Published items that still accept bids. */
  openItemCount: number;
  /**
   * When bidding actually ended (phase "ended" only): the latest effective
   * end among the auction and its published items, which can be later than
   * the auction's own deadline.
   */
  endedAt: number | null;
}

function toEpoch(date: string | null): number | null {
  if (!date) return null;
  const value = new Date(date).getTime();
  return Number.isNaN(value) ? null : value;
}

/** Drafts never take bids, so only published items can keep an auction open. */
function isBiddable(item: TimingItem): boolean {
  return item.isPublished !== false;
}

export function countOpenItems(
  auctionEndDate: string | null,
  items: TimingItem[],
  now: number,
): number {
  const at = new Date(now);
  return items.filter(
    (item) =>
      isBiddable(item) && !isResultItemEnded(item.endDate, auctionEndDate, at),
  ).length;
}

export function getAuctionTiming(
  auction: AuctionTimingInput,
  items: TimingItem[],
  now: number,
): AuctionTiming {
  const endsAt = toEpoch(auction.endDate);
  const perItem = auction.itemEndMode === "CUSTOM";
  const openItemCount = countOpenItems(auction.endDate, items, now);

  if (endsAt === null) {
    return {
      phase: "open",
      perItem,
      endsAt: null,
      msLeft: null,
      openItemCount,
      endedAt: null,
    };
  }

  // Same boundary as bidding: the deadline instant itself is still open.
  const deadlinePassed = endsAt < now;
  let phase: AuctionPhase = "live";
  if (deadlinePassed) phase = openItemCount > 0 ? "overtime" : "ended";

  return {
    phase,
    perItem,
    endsAt,
    msLeft: Math.max(0, endsAt - now),
    openItemCount,
    endedAt: phase === "ended" ? getTickUntil(auction, items) : null,
  };
}

/**
 * The last instant at which the header's state can still change on its own:
 * the latest effective end among the auction and its items. Null when the
 * auction has no deadline, so nothing needs a per-second clock.
 */
export function getTickUntil(
  auction: { endDate: string | null },
  items: TimingItem[],
): number | null {
  const endsAt = toEpoch(auction.endDate);
  if (endsAt === null) return null;
  let latest = endsAt;
  for (const item of items) {
    if (!isBiddable(item)) continue;
    const itemEnd = toEpoch(item.endDate);
    if (itemEnd !== null && itemEnd > latest) latest = itemEnd;
  }
  return latest;
}

export type CountdownFormat = "days" | "hours" | "minutes" | "seconds";

export interface CountdownParts {
  format: CountdownFormat;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Split a remaining duration into display parts. Rounding happens here, for
 * display only: seconds round up so a live auction never reads "0s" early.
 * The largest non-zero unit picks the format.
 */
export function getCountdownParts(msLeft: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.ceil(msLeft / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  let format: CountdownFormat = "seconds";
  if (days > 0) format = "days";
  else if (hours > 0) format = "hours";
  else if (minutes > 0) format = "minutes";

  return { format, days, hours, minutes, seconds };
}

export interface OverviewItem {
  isPublished?: boolean;
  _count: { bids: number };
}

export interface AuctionItemStats {
  /** Items the viewer can see: published plus their own drafts. */
  totalItems: number;
  itemsWithBids: number;
  itemsWithoutBids: number;
  totalBids: number;
  /** Visible items that are unpublished (the viewer's own drafts). */
  draftItems: number;
}

/** Same rule as the results page: an item has bids when its bid count is positive. */
export function hasBids(item: OverviewItem): boolean {
  return item._count.bids > 0;
}

export function getAuctionItemStats(items: OverviewItem[]): AuctionItemStats {
  let itemsWithBids = 0;
  let totalBids = 0;
  let draftItems = 0;

  for (const item of items) {
    totalBids += Math.max(0, item._count.bids);
    if (hasBids(item)) itemsWithBids += 1;
    if (item.isPublished === false) draftItems += 1;
  }

  return {
    totalItems: items.length,
    itemsWithBids,
    itemsWithoutBids: items.length - itemsWithBids,
    totalBids,
    draftItems,
  };
}

/**
 * Items in the auction the viewer cannot see (other members' drafts).
 * Closing the auction ends them too, so the close summary names them.
 */
export function getHiddenItemCount(
  auctionItemCount: number,
  visibleItemCount: number,
): number {
  return Math.max(0, auctionItemCount - visibleItemCount);
}

export interface OverviewAccess {
  /** Owner and admins see the organizer strip with stats and actions. */
  isOrganizer: boolean;
  /**
   * Only the owner may close (the API is requireOwner), and only while any
   * item can still take bids.
   */
  canClose: boolean;
  canViewResults: boolean;
}

export function getOverviewAccess(
  role: string,
  phase: AuctionPhase,
): OverviewAccess {
  const isOwner = role === "OWNER";
  const isOrganizer = isOwner || role === "ADMIN";
  return {
    isOrganizer,
    canClose: isOwner && phase !== "ended",
    canViewResults: isOrganizer,
  };
}
