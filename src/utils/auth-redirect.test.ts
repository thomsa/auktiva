import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuctionIdFromAuthRedirect,
  getAuthRedirectUrl,
} from "@/utils/auth-redirect";

test("login can distinguish a bare bookmark from an explicit dashboard", () => {
  assert.equal(getAuthRedirectUrl({}, ""), "");
  assert.equal(
    getAuthRedirectUrl({ redirectUrl: "/dashboard" }, ""),
    "/dashboard",
  );
});

test("a validated auction detail route supplies the pending auction ID", () => {
  assert.equal(
    getAuctionIdFromAuthRedirect("/auctions/auction-42"),
    "auction-42",
  );
  assert.equal(
    getAuctionIdFromAuthRedirect("/auctions/auction-42/?view=grid#items"),
    "auction-42",
  );
  assert.equal(
    getAuctionIdFromAuthRedirect("%2Fauctions%2Fauction-42"),
    "auction-42",
  );
});

test("other routes and ambiguous auction paths supply no pending auction ID", () => {
  for (const redirect of [
    "/dashboard",
    "/a/auction-42",
    "/AUCTIONS/auction-42",
    "/auctions/auction-42/items",
    "/auctions/auction-42/../other-auction",
    "/auctions/auction-42%2Fitems",
    "//example.test/auctions/auction-42",
    "https://example.test/auctions/auction-42",
  ]) {
    assert.equal(getAuctionIdFromAuthRedirect(redirect), null, redirect);
  }
});
