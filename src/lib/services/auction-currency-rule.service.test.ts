import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateBidRules,
  normalizeBidValue,
} from "@/lib/services/auction-currency-rule.service";

test("normalizeBidValue supports scalar conversion", () => {
  const normalized = normalizeBidValue(
    {
      conversionRateToBase: 2,
      inputMode: "SCALAR",
      denominationConfig: null,
    },
    { amount: 10 },
  );

  assert.equal(normalized, 20);
});

test("normalizeBidValue supports denomination input", () => {
  const normalized = normalizeBidValue(
    {
      conversionRateToBase: 1,
      inputMode: "DENOMINATION",
      denominationConfig: {
        components: [
          { key: "gold", factor: 100 },
          { key: "silver", factor: 10 },
        ],
      },
    },
    { enteredRepresentation: { components: { gold: 3, silver: 4 } } },
  );

  assert.equal(normalized, 340);
});

test("evaluateBidRules rejects equal normalized amount", () => {
  const violations = evaluateBidRules({
    normalizedAmount: 100,
    currentHighestNormalized: 100,
    rules: [],
  });

  assert.equal(violations[0]?.code, "EQUAL_NOT_HIGHER");
});

test("evaluateBidRules checks minimum increment", () => {
  const violations = evaluateBidRules({
    normalizedAmount: 103,
    currentHighestNormalized: 100,
    rules: [
      {
        type: "MIN_INCREMENT",
        isEnabled: true,
        config: { minIncrementBaseUnits: 5 },
      },
    ],
  });

  assert.equal(violations[0]?.code, "MIN_INCREMENT_NOT_MET");
});
