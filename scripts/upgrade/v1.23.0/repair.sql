-- Auktiva v1.23.0 post-deploy repair. Safe to run more than once: a second
-- run affects no rows.
--
-- Run it once the v1.23.0 release serves all traffic, after
-- `npm run db:migrate:turso` (or the migration files) were applied.
--
-- Between the migration and the v1.23.0 deploy, v1.22.0 code may still run
-- against the migrated database:
--
-- * Its notifier sends the right "You won" message, but it only sets
--   winnerNotified and leaves the new winner record empty or naming the
--   previous winner. A later reopen would then tell the wrong user that
--   their win is no longer final. Statement 1 records the user the latest
--   AUCTION_WON notification went to, when that is the current highest
--   bidder.
-- * An owner who extends an auction in v1.22.0 does not reset winnerNotified,
--   so a new bid on an item that follows the auction leaves the item marked
--   notified for its previous winner. Statements 2 to 5 repeat the data
--   steps of migration 20261122180000 for such rows: fill in empty records,
--   record the current highest bidder of items that ended more than 14 days
--   ago, and queue the others again, so v1.23.0 tells the new winner once
--   the item has ended. In v1.23.0 a notified item's highest bidder only
--   changes after a reopen, which resets winnerNotified itself, so these
--   statements find nothing else to change.

-- 1. Winner records the v1.22.0 notifier left stale.
UPDATE "auction_items"
SET
    "winnerNotifiedUserId" = "highestBidderId",
    "winnerNotifiedAmount" = "currentBid",
    "winnerNotifiedAt" = (
        SELECT "n"."createdAt"
        FROM "notifications" AS "n"
        WHERE "n"."itemId" = "auction_items"."id"
          AND "n"."type" = 'AUCTION_WON'
        ORDER BY "n"."createdAt" DESC, "n"."id" DESC
        LIMIT 1
    )
WHERE "winnerNotified" = 1
  AND "highestBidderId" IS NOT NULL
  AND "winnerNotifiedUserId" IS NOT "highestBidderId"
  AND (
    SELECT "n"."userId"
    FROM "notifications" AS "n"
    WHERE "n"."itemId" = "auction_items"."id"
      AND "n"."type" = 'AUCTION_WON'
    ORDER BY "n"."createdAt" DESC, "n"."id" DESC
    LIMIT 1
  ) = "highestBidderId";

-- 2. Empty records of notified items, as in the migration (skipping rows
-- with nothing to record, so a second run changes nothing).
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
  AND "winnerNotifiedUserId" IS NULL
  AND (
    "highestBidderId" IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM "notifications" AS "n"
      WHERE "n"."itemId" = "auction_items"."id"
        AND "n"."type" = 'AUCTION_WON'
    )
  );

-- 3. The amount, when the recorded user still holds the highest bid.
UPDATE "auction_items"
SET "winnerNotifiedAmount" = "currentBid"
WHERE "winnerNotified" = 1
  AND "winnerNotifiedAmount" IS NULL
  AND "winnerNotifiedUserId" IS NOT NULL
  AND "winnerNotifiedUserId" = "highestBidderId";

-- 4. Changed winners of items whose effective end is more than 14 days ago:
-- record the current highest bidder, message nobody.
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

-- 5. Other changed winners: queue them again for the current highest bidder.
UPDATE "auction_items"
SET "winnerNotified" = 0
WHERE "winnerNotified" = 1
  AND "highestBidderId" IS NOT NULL
  AND "winnerNotifiedUserId" IS NOT "highestBidderId";
