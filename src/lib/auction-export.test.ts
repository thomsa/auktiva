import test from "node:test";
import assert from "node:assert/strict";
import {
  AUCTION_EXPORT_CSV_HEADER,
  auctionExportToCsv,
  buildAuctionExport,
  type ExportSourceItem,
} from "@/lib/auction-export";
import type { ResultSourceBid } from "@/lib/results-summary";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const PAST = new Date("2026-06-14T12:00:00.000Z");
const FUTURE = new Date("2026-06-16T12:00:00.000Z");

const ADMIN = { id: "admin", name: "Ada Admin", email: "admin@example.test" };
const CREATOR = { id: "creator", name: "Cleo", email: "creator@example.test" };
const WINNER = { id: "winner", name: "Wanda", email: "winner@example.test" };
const LEADER = { id: "leader", name: "Leo", email: "leader@example.test" };

function bid(
  user: { id: string; name: string | null; email: string },
  amount: number,
  overrides: Partial<ResultSourceBid> = {},
): ResultSourceBid {
  return {
    userId: user.id,
    amount,
    normalizedAmount: amount,
    enteredRepresentation: null,
    isAnonymous: false,
    currencyProfile: null,
    user,
    ...overrides,
  };
}

function item(
  id: string,
  overrides: Partial<ExportSourceItem> & { bidCount?: number } = {},
): ExportSourceItem {
  const bids = overrides.bids ?? [];
  const { bidCount, ...rest } = overrides;
  return {
    id,
    name: `Item ${id}`,
    description: null,
    creatorId: CREATOR.id,
    isPublished: true,
    endDate: PAST,
    currencyCode: "USD",
    currency: { symbol: "$" },
    bidderAnonymous: false,
    images: [],
    bids,
    _count: { bids: bidCount ?? bids.length },
    startingBid: 1,
    currentBid: bids[0]?.amount ?? null,
    ...rest,
  };
}

const ITEMS: ExportSourceItem[] = [
  item("won-usd", { bids: [bid(WINNER, 40)], bidCount: 3 }),
  item("won-usd-2", {
    name: 'Quote "this", please',
    bids: [bid(WINNER, 10.5)],
  }),
  item("won-eur", {
    currencyCode: "EUR",
    currency: { symbol: "€" },
    bids: [bid(WINNER, 20)],
  }),
  item("leading", { endDate: FUTURE, bids: [bid(LEADER, 99)] }),
  item("open", { endDate: FUTURE }),
  item("unsold", {}),
  item("draft", { isPublished: false, bids: [bid(LEADER, 500)] }),
];

function build() {
  return buildAuctionExport({
    auction: {
      id: "a1",
      name: "Gala",
      description: null,
      endDate: null,
      createdAt: PAST,
      bidderVisibility: "ANONYMOUS",
    },
    items: ITEMS,
    members: [
      {
        role: "OWNER",
        joinedAt: PAST,
        user: { name: ADMIN.name, email: ADMIN.email },
      },
    ],
    viewerId: ADMIN.id,
    isAdmin: true,
    now: NOW,
  });
}

test("buildAuctionExport excludes drafts", () => {
  const data = build();
  assert.ok(!data.items.some((i) => i.id === "draft"));
  assert.equal(data.summary.totalItems, 6);
  assert.equal(data.summary.totalBids, 6);
});

test("buildAuctionExport marks each item won, leading, unsold or open", () => {
  const data = build();
  assert.deepEqual(
    data.items.map((i) => [i.id, i.status]),
    [
      ["won-usd", "won"],
      ["won-usd-2", "won"],
      ["won-eur", "won"],
      ["leading", "leading"],
      ["open", "open"],
      ["unsold", "unsold"],
    ],
  );
  assert.equal(data.summary.wonItems, 3);
  assert.equal(data.summary.leadingItems, 1);
  assert.equal(data.summary.unsoldItems, 1);
  assert.equal(data.summary.itemsWithBids, 4);
});

test("buildAuctionExport never labels an open item's leader as winner", () => {
  const leading = build().items.find((i) => i.id === "leading");
  assert.equal(leading?.winner, null);
  assert.equal(leading?.highestBid?.name, LEADER.name);
  // Same rule as the results page: no email before the item has ended.
  assert.equal(leading?.highestBid?.email, null);
});

test("buildAuctionExport gives admins winner names and emails for won items", () => {
  const won = build().items.find((i) => i.id === "won-usd");
  assert.deepEqual(won?.winner, {
    name: WINNER.name,
    email: WINNER.email,
    amount: 40,
    normalizedAmount: 40,
    displayRepresentation: "$40.00",
  });
  assert.equal(won?.bidCount, 3);
});

test("buildAuctionExport totals won items per currency", () => {
  assert.deepEqual(build().summary.totalValueByCurrency, [
    { currency: "USD", total: 50.5, formatted: "$50.50", itemCount: 2 },
    { currency: "EUR", total: 20, formatted: "€20.00", itemCount: 1 },
  ]);
});

test("auctionExportToCsv keeps legacy columns first and appends new ones", () => {
  const csv = auctionExportToCsv(build());
  const [header, ...rows] = csv.split("\n");

  assert.equal(header, AUCTION_EXPORT_CSV_HEADER.join(","));
  assert.deepEqual(AUCTION_EXPORT_CSV_HEADER.slice(0, 9), [
    "Item Name",
    "Currency",
    "Starting Bid",
    "Winning Bid",
    "Winning Bid Display",
    "Winning Bid Normalized",
    "Winner Name",
    "Winner Email",
    "Bid Count",
  ]);
  assert.equal(rows.length, 6);

  assert.equal(
    rows[0],
    `"Item won-usd",USD,1,40,"$40.00",40,"Wanda","winner@example.test",3,won,40,"$40.00","Wanda","winner@example.test",${PAST.toISOString()}`,
  );
  assert.ok(rows[1].startsWith(`"Quote ""this"", please",USD,`));
  // Leading: winner columns empty, highest-bid columns filled (no email).
  assert.equal(
    rows[3],
    `"Item leading",USD,1,,,,,,1,leading,99,"$99.00","Leo",,${FUTURE.toISOString()}`,
  );
  assert.equal(
    rows[5],
    `"Item unsold",USD,1,,,,,,0,unsold,,,,,${PAST.toISOString()}`,
  );
});

test("auctionExportToCsv neutralises spreadsheet formulas in text cells", () => {
  const data = build();
  const csv = auctionExportToCsv({
    ...data,
    items: [
      { ...data.items[0], name: '=HYPERLINK("http://evil.test","x")' },
      { ...data.items[1], name: "+1+1" },
      { ...data.items[2], name: "-2" },
      { ...data.items[3], name: "@SUM(A1)" },
      { ...data.items[4], name: "\tTabbed" },
      { ...data.items[5], name: "\rReturn" },
    ],
  });
  const rows = csv.split("\n").slice(1);
  const expected = [
    `"'=HYPERLINK(""http://evil.test"",""x"")"`,
    `"'+1+1"`,
    `"'-2"`,
    `"'@SUM(A1)"`,
    `"'\tTabbed"`,
    `"'\rReturn"`,
  ];

  assert.equal(rows.length, expected.length);
  expected.forEach((cell, index) => {
    assert.ok(
      rows[index].startsWith(`${cell},USD,`) ||
        rows[index].startsWith(`${cell},EUR,`),
      `row ${index}: ${rows[index]}`,
    );
  });
  // Ordinary names are left alone.
  assert.ok(
    auctionExportToCsv(data).split("\n")[1].startsWith('"Item won-usd",'),
  );
});
