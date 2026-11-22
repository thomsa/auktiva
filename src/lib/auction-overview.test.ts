import test from "node:test";
import assert from "node:assert/strict";
import {
  countOpenItems,
  getAuctionItemStats,
  getAuctionTiming,
  getCountdownParts,
  getHiddenItemCount,
  getOverviewAccess,
  getTickUntil,
  type OverviewItem,
  type TimingItem,
} from "@/lib/auction-overview";
import { isResultItemEnded } from "@/lib/results-summary";

const NOW = new Date("2026-11-22T12:00:00.000Z").getTime();
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

// ---------------------------------------------------------------------------
// getAuctionTiming
// ---------------------------------------------------------------------------

test("an auction with a future end date is live with time left", () => {
  const endDate = iso(NOW + 2 * HOUR);
  const timing = getAuctionTiming(
    { endDate, itemEndMode: "AUCTION_END" },
    [{ endDate: null }],
    NOW,
  );
  assert.deepEqual(timing, {
    phase: "live",
    perItem: false,
    endsAt: NOW + 2 * HOUR,
    msLeft: 2 * HOUR,
    openItemCount: 1,
    endedAt: null,
  });
});

test("an auction whose deadline passed with every item closed is ended", () => {
  const endDate = iso(NOW - HOUR);
  const timing = getAuctionTiming(
    { endDate, itemEndMode: "AUCTION_END" },
    [{ endDate: null }, { endDate: iso(NOW - 2 * HOUR) }],
    NOW,
  );
  assert.equal(timing.phase, "ended");
  assert.equal(timing.msLeft, 0);
  assert.equal(timing.openItemCount, 0);
});

test("the deadline instant itself is still open, matching the bid rule", () => {
  const endDate = iso(NOW);
  const timing = getAuctionTiming(
    { endDate, itemEndMode: "AUCTION_END" },
    [{ endDate: null }],
    NOW,
  );
  assert.equal(timing.phase, "live");
  assert.equal(timing.msLeft, 0);

  const oneMsLater = getAuctionTiming(
    { endDate, itemEndMode: "AUCTION_END" },
    [{ endDate: null }],
    NOW + 1,
  );
  assert.equal(oneMsLater.phase, "ended");
});

test("an item extended past the auction deadline keeps the auction in overtime", () => {
  const endDate = iso(NOW - HOUR);
  const timing = getAuctionTiming(
    { endDate, itemEndMode: "CUSTOM" },
    [{ endDate: iso(NOW + 5 * 60_000) }, { endDate: null }],
    NOW,
  );
  assert.equal(timing.phase, "overtime");
  assert.equal(timing.openItemCount, 1);
});

test("drafts never keep an auction open because they cannot take bids", () => {
  const endDate = iso(NOW - HOUR);
  const timing = getAuctionTiming(
    { endDate, itemEndMode: "CUSTOM" },
    [{ endDate: iso(NOW + HOUR), isPublished: false }],
    NOW,
  );
  assert.equal(timing.phase, "ended");
  assert.equal(timing.openItemCount, 0);
});

test("an auction without an end date is open and has no countdown", () => {
  const timing = getAuctionTiming(
    { endDate: null, itemEndMode: "NONE" },
    [],
    NOW,
  );
  assert.deepEqual(timing, {
    phase: "open",
    perItem: false,
    endsAt: null,
    msLeft: null,
    openItemCount: 0,
    endedAt: null,
  });
});

test("per-item end mode is flagged with and without an auction end date", () => {
  const withEnd = getAuctionTiming(
    { endDate: iso(NOW + HOUR), itemEndMode: "CUSTOM" },
    [],
    NOW,
  );
  assert.equal(withEnd.perItem, true);
  assert.equal(withEnd.phase, "live");

  const withoutEnd = getAuctionTiming(
    { endDate: null, itemEndMode: "CUSTOM" },
    [],
    NOW,
  );
  assert.equal(withoutEnd.perItem, true);
  assert.equal(withoutEnd.phase, "open");
});

test("an unparseable end date is treated as no end date", () => {
  const timing = getAuctionTiming(
    { endDate: "not a date", itemEndMode: "AUCTION_END" },
    [],
    NOW,
  );
  assert.equal(timing.phase, "open");
  assert.equal(timing.msLeft, null);
});

// ---------------------------------------------------------------------------
// Agreement with the canonical rule (bidding and results)
// ---------------------------------------------------------------------------

test("open items agree with isResultItemEnded, including late item ends", () => {
  const auctionEnd = iso(NOW - HOUR);
  const cases: TimingItem[] = [
    { endDate: null }, // follows the passed auction end: ended
    { endDate: iso(NOW - 1) }, // own end just passed: ended
    { endDate: iso(NOW) }, // own end is now: still open
    { endDate: iso(NOW + HOUR) }, // own end later than the auction's: open
    { endDate: iso(NOW + 2 * HOUR) }, // anti-snipe extension: open
  ];

  for (const item of cases) {
    const canonicalOpen = !isResultItemEnded(
      item.endDate,
      auctionEnd,
      new Date(NOW),
    );
    assert.equal(
      countOpenItems(auctionEnd, [item], NOW) === 1,
      canonicalOpen,
      `item ending ${item.endDate}`,
    );
  }
  assert.equal(countOpenItems(auctionEnd, cases, NOW), 3);
});

test("with no auction end, items follow only their own dates, like results", () => {
  const items: TimingItem[] = [
    { endDate: null },
    { endDate: iso(NOW - HOUR) },
    { endDate: iso(NOW + HOUR) },
  ];
  const canonical = items.filter(
    (item) => !isResultItemEnded(item.endDate, null, new Date(NOW)),
  ).length;
  assert.equal(countOpenItems(null, items, NOW), canonical);
  assert.equal(canonical, 2);
});

// ---------------------------------------------------------------------------
// getTickUntil
// ---------------------------------------------------------------------------

test("the clock runs until the latest effective end of auction or items", () => {
  const auction = { endDate: iso(NOW + HOUR) };
  assert.equal(getTickUntil(auction, []), NOW + HOUR);
  assert.equal(
    getTickUntil(auction, [{ endDate: iso(NOW + 3 * HOUR) }]),
    NOW + 3 * HOUR,
  );
  assert.equal(
    getTickUntil(auction, [
      { endDate: iso(NOW + 3 * HOUR), isPublished: false },
    ]),
    NOW + HOUR,
  );
});

test("an auction without a deadline needs no per-second clock", () => {
  assert.equal(
    getTickUntil({ endDate: null }, [{ endDate: iso(NOW + HOUR) }]),
    null,
  );
});

// ---------------------------------------------------------------------------
// getCountdownParts
// ---------------------------------------------------------------------------

test("countdown uses days and hours when a day or more is left", () => {
  const parts = getCountdownParts(2 * 24 * HOUR + 4 * HOUR + 59_000);
  assert.deepEqual(parts, {
    format: "days",
    days: 2,
    hours: 4,
    minutes: 0,
    seconds: 59,
  });
});

test("countdown uses hours and minutes under a day", () => {
  const parts = getCountdownParts(3 * HOUR + 12 * 60_000);
  assert.equal(parts.format, "hours");
  assert.equal(parts.hours, 3);
  assert.equal(parts.minutes, 12);
});

test("countdown uses minutes and seconds under an hour", () => {
  const parts = getCountdownParts(5 * 60_000 + 7_000);
  assert.equal(parts.format, "minutes");
  assert.equal(parts.minutes, 5);
  assert.equal(parts.seconds, 7);
});

test("countdown rounds partial seconds up for display only", () => {
  const parts = getCountdownParts(1);
  assert.equal(parts.format, "seconds");
  assert.equal(parts.seconds, 1);
});

test("countdown clamps negative input to zero", () => {
  const parts = getCountdownParts(-5_000);
  assert.deepEqual(parts, {
    format: "seconds",
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
});

// ---------------------------------------------------------------------------
// getAuctionItemStats
// ---------------------------------------------------------------------------

function item(bids: number, isPublished = true): OverviewItem {
  return { _count: { bids }, isPublished };
}

test("stats for zero items are all zero", () => {
  assert.deepEqual(getAuctionItemStats([]), {
    totalItems: 0,
    itemsWithBids: 0,
    itemsWithoutBids: 0,
    totalBids: 0,
    draftItems: 0,
  });
});

test("stats count bids, items with and without bids, and own drafts", () => {
  const stats = getAuctionItemStats([
    item(3),
    item(1),
    item(0),
    item(0, false),
  ]);
  assert.deepEqual(stats, {
    totalItems: 4,
    itemsWithBids: 2,
    itemsWithoutBids: 2,
    totalBids: 4,
    draftItems: 1,
  });
});

test("an item counts as bid on only by its bid count, like results", () => {
  const stats = getAuctionItemStats([
    { _count: { bids: 0 }, isPublished: true },
  ]);
  assert.equal(stats.itemsWithBids, 0);
  assert.equal(stats.itemsWithoutBids, 1);
});

test("items without an isPublished flag are not counted as drafts", () => {
  const stats = getAuctionItemStats([{ _count: { bids: 0 } }]);
  assert.equal(stats.draftItems, 0);
});

test("hidden items are the auction total minus what the viewer sees", () => {
  assert.equal(getHiddenItemCount(20, 3), 17);
  assert.equal(getHiddenItemCount(3, 3), 0);
  assert.equal(getHiddenItemCount(2, 3), 0);
});

// ---------------------------------------------------------------------------
// getOverviewAccess
// ---------------------------------------------------------------------------

test("the owner can close an active auction and view results", () => {
  assert.deepEqual(getOverviewAccess("OWNER", "live"), {
    isOrganizer: true,
    canClose: true,
    canViewResults: true,
  });
  assert.equal(getOverviewAccess("OWNER", "open").canClose, true);
});

test("the owner can still close while items run past the deadline", () => {
  assert.equal(getOverviewAccess("OWNER", "overtime").canClose, true);
});

test("the owner cannot close an auction that already ended", () => {
  assert.equal(getOverviewAccess("OWNER", "ended").canClose, false);
});

test("an admin sees the organizer strip and results but cannot close", () => {
  assert.deepEqual(getOverviewAccess("ADMIN", "live"), {
    isOrganizer: true,
    canClose: false,
    canViewResults: true,
  });
});

test("creators and bidders get neither organizer stats nor actions", () => {
  for (const role of ["CREATOR", "BIDDER"]) {
    assert.deepEqual(getOverviewAccess(role, "live"), {
      isOrganizer: false,
      canClose: false,
      canViewResults: false,
    });
  }
});

// ---------------------------------------------------------------------------
// endedAt
// ---------------------------------------------------------------------------

test("an ended auction reports when bidding really ended", () => {
  const auctionEnd = iso(NOW - 3 * HOUR);
  const lateItemEnd = iso(NOW - HOUR);
  const timing = getAuctionTiming(
    { endDate: auctionEnd, itemEndMode: "CUSTOM" },
    [{ endDate: null }, { endDate: lateItemEnd }],
    NOW,
  );
  assert.equal(timing.phase, "ended");
  assert.equal(timing.endedAt, NOW - HOUR);
});

test("endedAt is the auction deadline when no item outlived it", () => {
  const auctionEnd = iso(NOW - 3 * HOUR);
  const timing = getAuctionTiming(
    { endDate: auctionEnd, itemEndMode: "AUCTION_END" },
    [{ endDate: null }, { endDate: iso(NOW - 4 * HOUR) }],
    NOW,
  );
  assert.equal(timing.endedAt, NOW - 3 * HOUR);
});

test("endedAt is only set once bidding has ended", () => {
  const live = getAuctionTiming(
    { endDate: iso(NOW + HOUR), itemEndMode: "AUCTION_END" },
    [],
    NOW,
  );
  const overtime = getAuctionTiming(
    { endDate: iso(NOW - HOUR), itemEndMode: "CUSTOM" },
    [{ endDate: iso(NOW + HOUR) }],
    NOW,
  );
  assert.equal(live.endedAt, null);
  assert.equal(overtime.endedAt, null);
});

test("a draft with the latest end date does not push endedAt out", () => {
  const auctionEnd = iso(NOW - 3 * HOUR);
  const timing = getAuctionTiming(
    { endDate: auctionEnd, itemEndMode: "CUSTOM" },
    [
      { endDate: iso(NOW - 2 * HOUR) },
      { endDate: iso(NOW - HOUR), isPublished: false },
    ],
    NOW,
  );
  assert.equal(timing.phase, "ended");
  assert.equal(timing.endedAt, NOW - 2 * HOUR);
});
