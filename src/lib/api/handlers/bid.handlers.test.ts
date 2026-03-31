import test from "node:test";
import assert from "node:assert/strict";
import { createBidSchema } from "@/lib/api/handlers/bid.handlers";

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
