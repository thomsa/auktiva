-- AlterTable
ALTER TABLE "auction_items" ADD COLUMN "winnerNotifiedAmount" REAL;
ALTER TABLE "auction_items" ADD COLUMN "winnerNotifiedAt" DATETIME;
ALTER TABLE "auction_items" ADD COLUMN "winnerNotifiedUserId" TEXT;

-- The statements below only fill in records that are still empty, so they
-- can be run again on their own (scripts/upgrade/v1.23.0/backfill.sql).

-- Backfill the notified winner for items already marked as notified:
-- the user and time of the item's latest AUCTION_WON notification, or the
-- current highest bidder (with no time) when that notification is gone.
-- createdAt is only used to order the notifications.
UPDATE "auction_items"
SET
    "winnerNotifiedUserId" = COALESCE(
        (
            SELECT "n"."userId"
            FROM "notifications" AS "n"
            WHERE "n"."itemId" = "auction_items"."id"
              AND "n"."type" = 'AUCTION_WON'
            ORDER BY "n"."createdAt" DESC, "n"."id" DESC
            LIMIT 1
        ),
        "highestBidderId"
    ),
    "winnerNotifiedAt" = (
        SELECT "n"."createdAt"
        FROM "notifications" AS "n"
        WHERE "n"."itemId" = "auction_items"."id"
          AND "n"."type" = 'AUCTION_WON'
        ORDER BY "n"."createdAt" DESC, "n"."id" DESC
        LIMIT 1
    )
WHERE "winnerNotified" = 1
  AND "winnerNotifiedUserId" IS NULL;

-- The notified amount is only known when the notified user still holds the
-- highest bid.
UPDATE "auction_items"
SET "winnerNotifiedAmount" = "currentBid"
WHERE "winnerNotified" = 1
  AND "winnerNotifiedAmount" IS NULL
  AND "winnerNotifiedUserId" IS NOT NULL
  AND "winnerNotifiedUserId" = "highestBidderId";

-- An item whose winner changed after the notification, and whose effective
-- end (its own end date, else the auction's) is more than 14 days before
-- this migration runs, is not queued again. The current highest bidder is
-- recorded with no notification time, the state the notifier's 14-day rule
-- (STALE_WINNER_NOTIFICATION_MS) leaves. The previous release's notifier
-- has no such rule and would otherwise send late "You won" messages for
-- these items until the new release is live. Dates are compared in Unix
-- seconds as in 20261122170000 (ISO text, or epoch milliseconds in older
-- rows).
UPDATE "auction_items"
SET
    "winnerNotifiedUserId" = "highestBidderId",
    "winnerNotifiedAmount" = "currentBid",
    "winnerNotifiedAt" = NULL
WHERE "winnerNotified" = 1
  AND "highestBidderId" IS NOT NULL
  AND "winnerNotifiedUserId" IS NOT "highestBidderId"
  AND (
    SELECT
      CASE
        WHEN typeof(COALESCE("auction_items"."endDate", "a"."endDate")) IN ('integer', 'real')
          THEN COALESCE("auction_items"."endDate", "a"."endDate") / 1000
        ELSE CAST(strftime('%s', COALESCE("auction_items"."endDate", "a"."endDate")) AS INTEGER)
      END
    FROM "auctions" AS "a"
    WHERE "a"."id" = "auction_items"."auctionId"
  ) < CAST(strftime('%s', 'now') AS INTEGER) - 1209600;

-- Re-queue the other items whose winner changed after the notification
-- (auctions extended before this upgrade), so the current highest bidder
-- is notified once the item has ended.
UPDATE "auction_items"
SET "winnerNotified" = 0
WHERE "winnerNotified" = 1
  AND "highestBidderId" IS NOT NULL
  AND "winnerNotifiedUserId" IS NOT "highestBidderId";
