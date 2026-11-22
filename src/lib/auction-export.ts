import { formatAuctionBidDisplay } from "@/lib/currency-display";
import {
  buildAuctionResults,
  groupTotalsByCurrency,
  isResultItemEnded,
  type AuctionResultRow,
  type ResultItemState,
  type ResultSourceItem,
} from "@/lib/results-summary";

/**
 * Pure builders for the admin results export (JSON and CSV). Item status,
 * totals and bidder visibility follow the results page (`buildAuctionResults`)
 * so the export never labels an open item's leader as its winner.
 */

type DateInput = Date | string | null | undefined;

function toIso(value: DateInput): string | null {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export interface ExportSourceItem extends ResultSourceItem {
  description: string | null;
  startingBid: number;
  currentBid: number | null;
}

export interface ExportSourceMember {
  role: string;
  joinedAt: DateInput;
  user: { name: string | null; email: string };
}

export interface ExportSourceAuction {
  id: string;
  name: string;
  description: string | null;
  endDate: DateInput;
  createdAt: DateInput;
  bidderVisibility: string;
}

export interface ExportBid {
  name: string | null;
  email: string | null;
  amount: number;
  normalizedAmount: number | null;
  displayRepresentation: string;
}

export interface ExportItem {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  currencySymbol: string;
  startingBid: number;
  currentBid: number | null;
  bidCount: number;
  /** won, leading (still open), unsold (ended, no bids) or open (no bids yet). */
  status: ResultItemState;
  /** Set for won items only. */
  winner: ExportBid | null;
  /** The top bid for won and leading items. */
  highestBid: ExportBid | null;
  endDate: string | null;
}

export interface ExportCurrencyTotal {
  currency: string;
  total: number;
  formatted: string;
  itemCount: number;
}

export interface AuctionExportData {
  auction: {
    id: string;
    name: string;
    description: string | null;
    endDate: string | null;
    createdAt: string | null;
  };
  summary: {
    /** Published items. */
    totalItems: number;
    itemsWithBids: number;
    totalBids: number;
    wonItems: number;
    leadingItems: number;
    unsoldItems: number;
    /** Winning bids of ended items, one entry per currency. */
    totalValueByCurrency: ExportCurrencyTotal[];
    memberCount: number;
  };
  items: ExportItem[];
  members: {
    name: string | null;
    email: string;
    role: string;
    joinedAt: string | null;
  }[];
}

function toExportBid(row: AuctionResultRow): ExportBid {
  return {
    name: row.winner?.name ?? null,
    email: row.winner?.email ?? null,
    amount: row.winningBid,
    normalizedAmount: row.normalizedWinningBid,
    displayRepresentation: formatAuctionBidDisplay({
      amount: row.winningBid,
      enteredRepresentation: row.enteredRepresentation,
      profile: row.currencyProfile,
      fallbackSymbol: row.currencySymbol,
    }),
  };
}

export function buildAuctionExport(input: {
  auction: ExportSourceAuction;
  items: ExportSourceItem[];
  members: ExportSourceMember[];
  viewerId: string;
  /** The export is admin-only; kept explicit so the rule is visible. */
  isAdmin: boolean;
  now?: Date;
}): AuctionExportData {
  const now = input.now ?? new Date();
  const model = buildAuctionResults({
    items: input.items,
    auction: input.auction,
    viewerId: input.viewerId,
    isAdmin: input.isAdmin,
    now,
  });
  const rowsById = new Map(model.results.map((row) => [row.itemId, row]));
  const published = input.items.filter((item) => item.isPublished);

  const items: ExportItem[] = published.map((item) => {
    const row = rowsById.get(item.id);
    const status: ResultItemState =
      row?.status ??
      (isResultItemEnded(item.endDate, input.auction.endDate, now)
        ? "unsold"
        : "open");
    const highestBid = row ? toExportBid(row) : null;

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      currency: item.currencyCode,
      currencySymbol: item.currency.symbol,
      startingBid: item.startingBid,
      currentBid: item.currentBid,
      bidCount: item._count.bids,
      status,
      winner: status === "won" ? highestBid : null,
      highestBid,
      endDate: toIso(item.endDate),
    };
  });

  const wonRows = model.results.filter((row) => row.status === "won");
  const totalValueByCurrency = groupTotalsByCurrency(
    wonRows.map((row) => ({
      amount: row.winningBid,
      currencyCode: row.currencyCode,
      currencySymbol: row.currencySymbol,
      currencyProfile: row.currencyProfile,
    })),
  ).map((total) => ({
    currency: total.code,
    total: total.total,
    formatted: total.formatted,
    itemCount: total.count,
  }));

  return {
    auction: {
      id: input.auction.id,
      name: input.auction.name,
      description: input.auction.description,
      endDate: toIso(input.auction.endDate),
      createdAt: toIso(input.auction.createdAt),
    },
    summary: {
      totalItems: model.totalItems,
      itemsWithBids: model.results.length,
      totalBids: model.totalBids,
      wonItems: wonRows.length,
      leadingItems: model.results.length - wonRows.length,
      unsoldItems: model.unsold.length,
      totalValueByCurrency,
      memberCount: input.members.length,
    },
    items,
    members: input.members.map((member) => ({
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      joinedAt: toIso(member.joinedAt),
    })),
  };
}

/**
 * Spreadsheet apps run a cell that starts with one of these as a formula.
 * Such text cells get a leading apostrophe so they open as plain text.
 */
const CSV_FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function csvText(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const safe = CSV_FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * The legacy columns keep their names and order; new columns are appended.
 * "Winning Bid" and "Winner …" columns are only filled for won items; the
 * appended "Highest …" columns also cover items still open for bidding.
 */
export const AUCTION_EXPORT_CSV_HEADER = [
  "Item Name",
  "Currency",
  "Starting Bid",
  "Winning Bid",
  "Winning Bid Display",
  "Winning Bid Normalized",
  "Winner Name",
  "Winner Email",
  "Bid Count",
  "Status",
  "Highest Bid",
  "Highest Bid Display",
  "Highest Bidder Name",
  "Highest Bidder Email",
  "End Date",
];

export function auctionExportToCsv(data: AuctionExportData): string {
  const rows = data.items.map((item) =>
    [
      csvText(item.name),
      item.currency,
      csvNumber(item.startingBid),
      item.winner ? csvNumber(item.currentBid ?? item.winner.amount) : "",
      csvText(item.winner?.displayRepresentation),
      csvNumber(item.winner?.normalizedAmount),
      item.winner ? csvText(item.winner.name ?? "") : "",
      csvText(item.winner?.email),
      csvNumber(item.bidCount),
      item.status,
      csvNumber(item.highestBid?.amount),
      csvText(item.highestBid?.displayRepresentation),
      csvText(item.highestBid?.name),
      csvText(item.highestBid?.email),
      item.endDate ?? "",
    ].join(","),
  );

  return [AUCTION_EXPORT_CSV_HEADER.join(","), ...rows].join("\n");
}
