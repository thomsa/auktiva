import {
  formatAuctionAmount,
  type CurrencyDisplayProfile,
} from "@/lib/currency-display";

/**
 * Pure helpers for the auction results page: when an item counts as ended,
 * which result state it is in, who may see the top bidder, and how amounts
 * are totalled without mixing currencies.
 */

type DateInput = Date | string | null | undefined;

function toDate(value: DateInput): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * An item ends at its own end date; when it has none it follows the
 * auction's end date. With neither set the item stays open.
 */
export function isResultItemEnded(
  itemEndDate: DateInput,
  auctionEndDate: DateInput,
  now: Date = new Date(),
): boolean {
  const effectiveEnd = toDate(itemEndDate) ?? toDate(auctionEndDate);
  if (!effectiveEnd) return false;
  return effectiveEnd < now;
}

/**
 * - `won`: ended with at least one bid
 * - `leading`: still open, with at least one bid
 * - `unsold`: ended without any bid
 * - `open`: still open, no bids yet
 */
export type ResultItemState = "won" | "leading" | "unsold" | "open";

export function classifyResultItem(params: {
  isEnded: boolean;
  bidCount: number;
}): ResultItemState {
  const hasBids = params.bidCount > 0;
  if (params.isEnded) return hasBids ? "won" : "unsold";
  return hasBids ? "leading" : "open";
}

export interface WinnerVisibilityInput {
  /** The auction's `bidderVisibility` (VISIBLE, ANONYMOUS or PER_BID). */
  bidderVisibility: string;
  /** `Bid.isAnonymous` of the top bid. */
  bidIsAnonymous: boolean;
  viewerIsItemCreator: boolean;
  viewerIsAdmin: boolean;
  /** The viewer placed the top bid themselves. */
  viewerIsBidder: boolean;
  /** Whether the item has ended (contact details are for settlement only). */
  isEnded: boolean;
}

export interface WinnerVisibility {
  showIdentity: boolean;
  showEmail: boolean;
}

/**
 * Mirrors the bid visibility rules of the item detail page: the item creator
 * always sees the bidder, VISIBLE shows, ANONYMOUS hides, PER_BID hides
 * anonymous bids. Auction admins also see the bidder, and viewers always
 * see themselves. Unknown modes hide the bidder.
 *
 * The email is only shared with the item creator and admins once the item
 * has ended, so they can settle offline.
 */
export function resolveWinnerVisibility(
  input: WinnerVisibilityInput,
): WinnerVisibility {
  const privileged = input.viewerIsItemCreator || input.viewerIsAdmin;

  let showIdentity: boolean;
  if (privileged || input.viewerIsBidder) {
    showIdentity = true;
  } else if (input.bidderVisibility === "VISIBLE") {
    showIdentity = true;
  } else if (input.bidderVisibility === "PER_BID") {
    showIdentity = !input.bidIsAnonymous;
  } else {
    showIdentity = false;
  }

  return {
    showIdentity,
    showEmail: showIdentity && privileged && input.isEnded,
  };
}

export interface ResultBidder {
  id: string;
  name: string | null;
  email: string | null;
}

/** Applies a visibility decision to the top bidder's user record. */
export function toVisibleBidder(
  user: { id: string; name: string | null; email: string },
  visibility: WinnerVisibility,
): ResultBidder | null {
  if (!visibility.showIdentity) return null;
  return {
    id: user.id,
    name: user.name,
    email: visibility.showEmail ? user.email : null,
  };
}

export interface CurrencyTotalEntry {
  amount: number;
  /** Item currency code, used when the bid has no currency profile. */
  currencyCode: string;
  /** Item currency symbol, used when the bid has no currency profile. */
  currencySymbol: string;
  currencyProfile:
    | (CurrencyDisplayProfile & { id: string; code?: string | null })
    | null;
}

export interface CurrencyTotal {
  /** `profile:<id>` or `code:<currencyCode>`. */
  key: string;
  code: string;
  total: number;
  count: number;
  formatted: string;
}

/**
 * Sums amounts per currency, never across currencies. Bids placed with a
 * currency profile are grouped by that profile; the rest by the item's
 * currency code. Each total is formatted like the rows it sums.
 * Groups keep the order in which they first appear.
 */
export function groupTotalsByCurrency(
  entries: CurrencyTotalEntry[],
): CurrencyTotal[] {
  const groups = new Map<
    string,
    {
      code: string;
      total: number;
      count: number;
      profile: CurrencyDisplayProfile;
    }
  >();

  for (const entry of entries) {
    if (!Number.isFinite(entry.amount)) continue;
    const profile = entry.currencyProfile;
    const key = profile
      ? `profile:${profile.id}`
      : `code:${entry.currencyCode}`;
    const existing = groups.get(key);

    if (existing) {
      existing.total += entry.amount;
      existing.count += 1;
      continue;
    }

    groups.set(key, {
      code: profile?.code || entry.currencyCode,
      total: entry.amount,
      count: 1,
      profile: profile
        ? {
            symbol: profile.symbol,
            inputMode: profile.inputMode,
            fractionMode: profile.fractionMode,
            precision: profile.precision,
            denominationConfig: profile.denominationConfig,
          }
        : { symbol: entry.currencySymbol },
    });
  }

  return Array.from(groups.entries()).map(([key, group]) => ({
    key,
    code: group.code,
    total: group.total,
    count: group.count,
    formatted: formatAuctionAmount(group.total, group.profile),
  }));
}
