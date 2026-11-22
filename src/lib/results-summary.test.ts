import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyResultItem,
  groupTotalsByCurrency,
  isResultItemEnded,
  resolveWinnerVisibility,
  toVisibleBidder,
  type CurrencyTotalEntry,
  type WinnerVisibilityInput,
} from "@/lib/results-summary";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const PAST = "2026-06-14T12:00:00.000Z";
const FUTURE = "2026-06-16T12:00:00.000Z";

// ---------------------------------------------------------------------------
// isResultItemEnded
// ---------------------------------------------------------------------------

test("isResultItemEnded uses the item's own end date first", () => {
  assert.equal(isResultItemEnded(PAST, FUTURE, NOW), true);
  assert.equal(isResultItemEnded(FUTURE, PAST, NOW), false);
});

test("isResultItemEnded falls back to the auction end date", () => {
  assert.equal(isResultItemEnded(null, PAST, NOW), true);
  assert.equal(isResultItemEnded(null, FUTURE, NOW), false);
  assert.equal(isResultItemEnded(null, new Date(PAST), NOW), true);
});

test("isResultItemEnded keeps items open when neither date is set", () => {
  assert.equal(isResultItemEnded(null, null, NOW), false);
  assert.equal(isResultItemEnded(undefined, undefined, NOW), false);
});

// ---------------------------------------------------------------------------
// classifyResultItem
// ---------------------------------------------------------------------------

test("classifyResultItem separates won, leading, unsold and open", () => {
  assert.equal(classifyResultItem({ isEnded: true, bidCount: 3 }), "won");
  assert.equal(classifyResultItem({ isEnded: false, bidCount: 1 }), "leading");
  assert.equal(classifyResultItem({ isEnded: true, bidCount: 0 }), "unsold");
  assert.equal(classifyResultItem({ isEnded: false, bidCount: 0 }), "open");
});

// ---------------------------------------------------------------------------
// resolveWinnerVisibility
// ---------------------------------------------------------------------------

function visibility(overrides: Partial<WinnerVisibilityInput>) {
  return resolveWinnerVisibility({
    bidderVisibility: "VISIBLE",
    bidIsAnonymous: false,
    viewerIsItemCreator: false,
    viewerIsAdmin: false,
    viewerIsBidder: false,
    isEnded: true,
    ...overrides,
  });
}

const HIDDEN = { showIdentity: false, showEmail: false };
const NAME_ONLY = { showIdentity: true, showEmail: false };
const NAME_AND_EMAIL = { showIdentity: true, showEmail: true };

test("plain bidder: VISIBLE shows the name, never the email", () => {
  assert.deepEqual(visibility({ bidderVisibility: "VISIBLE" }), NAME_ONLY);
});

test("plain bidder: ANONYMOUS hides the winner", () => {
  assert.deepEqual(visibility({ bidderVisibility: "ANONYMOUS" }), HIDDEN);
});

test("plain bidder: PER_BID follows the bid's own flag", () => {
  assert.deepEqual(
    visibility({ bidderVisibility: "PER_BID", bidIsAnonymous: true }),
    HIDDEN,
  );
  assert.deepEqual(
    visibility({ bidderVisibility: "PER_BID", bidIsAnonymous: false }),
    NAME_ONLY,
  );
});

test("plain bidder: an unknown mode hides the winner", () => {
  assert.deepEqual(visibility({ bidderVisibility: "SOMETHING_ELSE" }), HIDDEN);
});

test("item creator sees name and email in every mode once ended", () => {
  for (const mode of ["VISIBLE", "ANONYMOUS", "PER_BID"]) {
    assert.deepEqual(
      visibility({
        bidderVisibility: mode,
        bidIsAnonymous: true,
        viewerIsItemCreator: true,
      }),
      NAME_AND_EMAIL,
      mode,
    );
  }
});

test("admin sees name and email in every mode once ended", () => {
  for (const mode of ["VISIBLE", "ANONYMOUS", "PER_BID"]) {
    assert.deepEqual(
      visibility({
        bidderVisibility: mode,
        bidIsAnonymous: true,
        viewerIsAdmin: true,
      }),
      NAME_AND_EMAIL,
      mode,
    );
  }
});

test("creator and admin get no email while the item is still open", () => {
  assert.deepEqual(
    visibility({ viewerIsItemCreator: true, isEnded: false }),
    NAME_ONLY,
  );
  assert.deepEqual(
    visibility({
      bidderVisibility: "ANONYMOUS",
      viewerIsAdmin: true,
      isEnded: false,
    }),
    NAME_ONLY,
  );
});

test("the winning bidder always sees themselves, without the email", () => {
  for (const mode of ["VISIBLE", "ANONYMOUS", "PER_BID"]) {
    assert.deepEqual(
      visibility({
        bidderVisibility: mode,
        bidIsAnonymous: true,
        viewerIsBidder: true,
      }),
      NAME_ONLY,
      mode,
    );
  }
});

test("toVisibleBidder strips identity and email as decided", () => {
  const user = { id: "u1", name: "Ada", email: "ada@example.test" };

  assert.equal(toVisibleBidder(user, HIDDEN), null);
  assert.deepEqual(toVisibleBidder(user, NAME_ONLY), {
    id: "u1",
    name: "Ada",
    email: null,
  });
  assert.deepEqual(toVisibleBidder(user, NAME_AND_EMAIL), user);
});

// ---------------------------------------------------------------------------
// groupTotalsByCurrency
// ---------------------------------------------------------------------------

function entry(overrides: Partial<CurrencyTotalEntry>): CurrencyTotalEntry {
  return {
    amount: 10,
    currencyCode: "USD",
    currencySymbol: "$",
    currencyProfile: null,
    ...overrides,
  };
}

test("groupTotalsByCurrency returns nothing for no entries", () => {
  assert.deepEqual(groupTotalsByCurrency([]), []);
});

test("groupTotalsByCurrency sums a single currency into one total", () => {
  const totals = groupTotalsByCurrency([
    entry({ amount: 10 }),
    entry({ amount: 25.5 }),
  ]);

  assert.equal(totals.length, 1);
  assert.equal(totals[0].key, "code:USD");
  assert.equal(totals[0].code, "USD");
  assert.equal(totals[0].count, 2);
  assert.equal(totals[0].total, 35.5);
  assert.equal(totals[0].formatted, "$35.50");
});

test("groupTotalsByCurrency never adds different currencies together", () => {
  const totals = groupTotalsByCurrency([
    entry({ amount: 10 }),
    entry({ amount: 5000, currencyCode: "HUF", currencySymbol: "Ft" }),
    entry({ amount: 15 }),
    entry({ amount: 20, currencyCode: "EUR", currencySymbol: "€" }),
  ]);

  assert.deepEqual(
    totals.map((t) => [t.code, t.total, t.formatted]),
    [
      ["USD", 25, "$25.00"],
      ["HUF", 5000, "Ft5000.00"],
      ["EUR", 20, "€20.00"],
    ],
  );
});

test("groupTotalsByCurrency keys and formats by currency profile when present", () => {
  const gold = {
    id: "p-gold",
    code: "GLD",
    symbol: "G ",
    inputMode: "SCALAR" as const,
    fractionMode: "INTEGER_ONLY" as const,
    precision: 0,
    denominationConfig: null,
  };
  const credits = {
    id: "p-credits",
    symbol: "Cr",
    inputMode: "SCALAR" as const,
    fractionMode: "DECIMAL" as const,
    precision: 3,
    denominationConfig: null,
  };

  const totals = groupTotalsByCurrency([
    entry({ amount: 12, currencyProfile: gold }),
    entry({ amount: 8, currencyProfile: gold }),
    // Same item currency, but a different profile: its own group.
    entry({ amount: 1.5, currencyProfile: credits }),
    // No profile: falls back to the item's currency symbol.
    entry({ amount: 4, currencyCode: "USD", currencySymbol: "$" }),
  ]);

  assert.deepEqual(
    totals.map((t) => [t.key, t.code, t.count, t.formatted]),
    [
      ["profile:p-gold", "GLD", 2, "G 20"],
      ["profile:p-credits", "USD", 1, "Cr1.500"],
      ["code:USD", "USD", 1, "$4.00"],
    ],
  );
});

test("groupTotalsByCurrency skips non-finite amounts", () => {
  const totals = groupTotalsByCurrency([
    entry({ amount: Number.NaN }),
    entry({ amount: 3 }),
  ]);
  assert.equal(totals.length, 1);
  assert.equal(totals[0].total, 3);
});
