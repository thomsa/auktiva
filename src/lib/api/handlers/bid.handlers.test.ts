import test from "node:test";
import assert from "node:assert/strict";
import {
  createBidSchema,
  isBiddingClosed,
} from "@/lib/api/handlers/bid.handlers";

test("createBidSchema accepts scalar payload", () => {
  const parsed = createBidSchema.safeParse({
    amount: 12,
    currencyProfileId: "profile_123",
    isAnonymous: false,
  });

  assert.equal(parsed.success, true);
});

test("createBidSchema accepts denomination payload", () => {
  const parsed = createBidSchema.safeParse({
    enteredRepresentation: {
      components: { gold: 1, silver: 25 },
    },
    currencyProfileId: "profile_123",
  });

  assert.equal(parsed.success, true);
});

test("createBidSchema rejects payload when both amount and enteredRepresentation are missing", () => {
  const parsed = createBidSchema.safeParse({
    currencyProfileId: "profile_123",
  });

  assert.equal(parsed.success, false);
  assert.equal(
    parsed.success ? undefined : parsed.error.issues[0]?.message,
    "Either amount or entered representation is required",
  );
});

const NOW = new Date("2026-06-15T12:00:00.000Z");
const PAST = new Date("2026-06-14T12:00:00.000Z");
const FUTURE = new Date("2026-06-16T12:00:00.000Z");

test("isBiddingClosed rejects a null-dated item once the auction has ended", () => {
  assert.equal(isBiddingClosed(null, PAST, NOW), true);
});

test("isBiddingClosed accepts a null-dated item while the auction runs", () => {
  assert.equal(isBiddingClosed(null, FUTURE, NOW), false);
});

test("isBiddingClosed accepts a null-dated item in an auction without end", () => {
  assert.equal(isBiddingClosed(null, null, NOW), false);
});

test("isBiddingClosed uses the item end date when the item has one", () => {
  assert.equal(isBiddingClosed(PAST, FUTURE, NOW), true);
  assert.equal(isBiddingClosed(PAST, null, NOW), true);
  // Items stamped by "end auction" get their own (past) end date.
  assert.equal(isBiddingClosed(PAST, PAST, NOW), true);
  // An extended (anti-snipe) item end date keeps bidding open.
  assert.equal(isBiddingClosed(FUTURE, null, NOW), false);
});

test("isBiddingClosed accepts ISO strings", () => {
  assert.equal(isBiddingClosed(null, PAST.toISOString(), NOW), true);
});
