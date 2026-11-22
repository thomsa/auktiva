import test from "node:test";
import assert from "node:assert/strict";
import { wouldReopenEndedItem } from "@/lib/api/handlers/item.handlers";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const PAST = new Date("2026-06-14T12:00:00.000Z");
const FUTURE = new Date("2026-06-16T12:00:00.000Z");

test("wouldReopenEndedItem refuses a later date for a null-dated item in an ended auction", () => {
  assert.equal(wouldReopenEndedItem(null, FUTURE, PAST, NOW), true);
});

test("wouldReopenEndedItem refuses extending or clearing an item's own past date", () => {
  assert.equal(wouldReopenEndedItem(PAST, FUTURE, FUTURE, NOW), true);
  // Clearing would make it follow the still-running auction.
  assert.equal(wouldReopenEndedItem(PAST, null, FUTURE, NOW), true);
  assert.equal(wouldReopenEndedItem(PAST, null, null, NOW), true);
});

test("wouldReopenEndedItem allows changes that keep an ended item ended", () => {
  // Clearing the date while the auction has ended keeps it ended.
  assert.equal(wouldReopenEndedItem(PAST, null, PAST, NOW), false);
  assert.equal(wouldReopenEndedItem(null, null, PAST, NOW), false);
  assert.equal(wouldReopenEndedItem(PAST, PAST, FUTURE, NOW), false);
});

test("wouldReopenEndedItem leaves open items alone", () => {
  assert.equal(wouldReopenEndedItem(null, FUTURE, FUTURE, NOW), false);
  assert.equal(wouldReopenEndedItem(FUTURE, null, null, NOW), false);
  // Ending an open item now is not a reopen.
  assert.equal(wouldReopenEndedItem(FUTURE, PAST, FUTURE, NOW), false);
});
