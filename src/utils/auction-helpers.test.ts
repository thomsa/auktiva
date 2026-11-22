import test from "node:test";
import assert from "node:assert/strict";
import {
  getBidStatus,
  getEffectiveItemEndDate,
  isItemEnded,
} from "@/utils/auction-helpers";
import { isBiddingClosed } from "@/lib/api/handlers/bid.handlers";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const PAST = "2026-06-14T12:00:00.000Z";
const FUTURE = "2026-06-16T12:00:00.000Z";

test("isItemEnded ends a null-dated item with the auction", () => {
  assert.equal(isItemEnded(null, PAST, NOW), true);
  assert.equal(isItemEnded(null, FUTURE, NOW), false);
});

test("isItemEnded keeps a null-dated item open when the auction has no end", () => {
  assert.equal(isItemEnded(null, null, NOW), false);
});

test("isItemEnded lets the item's own end date win", () => {
  assert.equal(isItemEnded(PAST, FUTURE, NOW), true);
  assert.equal(isItemEnded(PAST, null, NOW), true);
  // An anti-snipe extension past an ended auction keeps the item open.
  assert.equal(isItemEnded(FUTURE, PAST, NOW), false);
});

test("isItemEnded accepts Date values", () => {
  assert.equal(isItemEnded(null, new Date(PAST), NOW), true);
});

test("isItemEnded agrees with the bid API in every combination", () => {
  const dates = [null, PAST, FUTURE];
  for (const itemEnd of dates) {
    for (const auctionEnd of dates) {
      assert.equal(
        isItemEnded(itemEnd, auctionEnd, NOW),
        isBiddingClosed(itemEnd, auctionEnd, NOW),
        `item ${itemEnd} / auction ${auctionEnd}`,
      );
    }
  }
});

test("a winning bid on a null-dated item in an ended auction reads as won", () => {
  const ended = isItemEnded(null, PAST, NOW);
  assert.equal(getBidStatus(true, ended), "won");
  assert.equal(getBidStatus(false, ended), "lost");
});

test("getEffectiveItemEndDate prefers the item's own date", () => {
  assert.equal(getEffectiveItemEndDate(PAST, FUTURE), PAST);
  assert.equal(getEffectiveItemEndDate(null, FUTURE), FUTURE);
  assert.equal(getEffectiveItemEndDate(null, null), null);
});
