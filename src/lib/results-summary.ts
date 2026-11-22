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
  /**
   * Deprecated per-item `AuctionItem.bidderAnonymous` flag. The item API still
   * accepts it, so when set it hides the bidder from other members.
   */
  itemBidderAnonymous?: boolean;
}

export interface WinnerVisibility {
  showIdentity: boolean;
  showEmail: boolean;
}

/**
 * Mirrors the bid visibility rules of the item detail page: the item creator
 * always sees the bidder, VISIBLE shows, ANONYMOUS hides, PER_BID hides
 * anonymous bids. Auction admins also see the bidder, and viewers always
 * see themselves. Unknown modes hide the bidder, and so does the legacy
 * per-item `bidderAnonymous` flag for everyone else.
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
  } else if (input.itemBidderAnonymous) {
    showIdentity = false;
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

// ============================================================================
// Results page model
// ============================================================================

export interface ResultCurrencyProfile {
  id: string;
  code: string;
  symbol: string;
  inputMode: "SCALAR" | "DENOMINATION";
  fractionMode: "INTEGER_ONLY" | "DECIMAL";
  precision: number;
  denominationConfig: unknown;
}

export type AuctionResultRowStatus = Extract<
  ResultItemState,
  "won" | "leading"
>;

export interface AuctionResultRow {
  itemId: string;
  itemName: string;
  thumbnailUrl: string | null;
  status: AuctionResultRowStatus;
  winningBid: number;
  normalizedWinningBid: number | null;
  enteredRepresentation: unknown;
  currencyCode: string;
  currencySymbol: string;
  currencyProfile: ResultCurrencyProfile | null;
  winner: ResultBidder | null;
  isCurrentUser: boolean;
  isItemCreator: boolean;
}

export interface AuctionUnsoldItem {
  itemId: string;
  itemName: string;
  thumbnailUrl: string | null;
  isItemCreator: boolean;
}

/** The top bid of an item, as loaded for the results page. */
export interface ResultSourceBid {
  userId: string;
  amount: number;
  normalizedAmount: number | null;
  enteredRepresentation: unknown;
  isAnonymous: boolean;
  currencyProfile: ResultCurrencyProfile | null;
  user: { id: string; name: string | null; email: string };
}

/** An auction item, as loaded for the results page. */
export interface ResultSourceItem {
  id: string;
  name: string;
  creatorId: string;
  isPublished: boolean;
  endDate: DateInput;
  currencyCode: string;
  currency: { symbol: string };
  /** Deprecated per-item anonymity flag. */
  bidderAnonymous?: boolean;
  /** First image, if any. */
  images: { url: string }[];
  /** Highest bid first; only the first entry is used. */
  bids: ResultSourceBid[];
  _count: { bids: number };
}

export interface BuildAuctionResultsInput {
  items: ResultSourceItem[];
  auction: { endDate: DateInput; bidderVisibility: string };
  viewerId: string;
  isAdmin: boolean;
  now?: Date;
  /** Turns a stored image path into a public URL. */
  resolveImageUrl?: (path: string) => string;
}

export interface AuctionResultsModel {
  /** Ended items with bids (won) first, then open items with bids (leading). */
  results: AuctionResultRow[];
  /** Published, ended items without any bid. */
  unsold: AuctionUnsoldItem[];
  /** Ended items the viewer won. */
  userWins: AuctionResultRow[];
  /** Published items only. */
  totalItems: number;
  /** Bids on published items. */
  totalBids: number;
}

/**
 * Builds what the results page shows for one viewer: drafts are dropped,
 * every published item is routed to won, leading or unsold (open items
 * without bids are left out), and the top bidder is resolved with
 * `resolveWinnerVisibility`.
 */
export function buildAuctionResults(
  input: BuildAuctionResultsInput,
): AuctionResultsModel {
  const now = input.now ?? new Date();
  const resolveImageUrl = input.resolveImageUrl ?? ((path: string) => path);
  const published = input.items.filter((item) => item.isPublished);

  const won: AuctionResultRow[] = [];
  const leading: AuctionResultRow[] = [];
  const unsold: AuctionUnsoldItem[] = [];

  for (const item of published) {
    const isItemCreator = item.creatorId === input.viewerId;
    const isEnded = isResultItemEnded(item.endDate, input.auction.endDate, now);
    const topBid = item.bids[0];
    const state = classifyResultItem({
      isEnded,
      bidCount: topBid ? Math.max(item._count.bids, 1) : 0,
    });
    const thumbnailUrl = item.images[0]?.url
      ? resolveImageUrl(item.images[0].url)
      : null;

    if (state === "unsold") {
      unsold.push({
        itemId: item.id,
        itemName: item.name,
        thumbnailUrl,
        isItemCreator,
      });
      continue;
    }

    if ((state !== "won" && state !== "leading") || !topBid) continue;

    const isCurrentUser = topBid.userId === input.viewerId;
    const visibility = resolveWinnerVisibility({
      bidderVisibility: input.auction.bidderVisibility,
      bidIsAnonymous: topBid.isAnonymous,
      viewerIsItemCreator: isItemCreator,
      viewerIsAdmin: input.isAdmin,
      viewerIsBidder: isCurrentUser,
      isEnded,
      itemBidderAnonymous: item.bidderAnonymous ?? false,
    });

    const row: AuctionResultRow = {
      itemId: item.id,
      itemName: item.name,
      thumbnailUrl,
      status: state,
      winningBid: topBid.amount,
      normalizedWinningBid: topBid.normalizedAmount,
      enteredRepresentation: topBid.enteredRepresentation,
      currencyCode: item.currencyCode,
      currencySymbol: item.currency.symbol,
      currencyProfile: topBid.currencyProfile,
      winner: toVisibleBidder(topBid.user, visibility),
      isCurrentUser,
      isItemCreator,
    };

    (state === "won" ? won : leading).push(row);
  }

  return {
    results: [...won, ...leading],
    unsold,
    userWins: won.filter((row) => row.isCurrentUser),
    totalItems: published.length,
    totalBids: published.reduce((sum, item) => sum + item._count.bids, 0),
  };
}
