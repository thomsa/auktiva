-- Auktiva v1.23.0 data backfill for databases whose schema was updated
-- with `prisma db push` (the Deployment Admin updater and scripts/update.sh
-- do this). db push adds the new columns but does not run the data steps of
-- migrations 20261122170000 and 20261122180000. This file is those data
-- steps, unchanged (a test keeps them in step with the migrations).
--
-- Run it once, right after `prisma db push` and before the v1.23.0 server
-- starts if you can. Running it again straight away leaves the same end
-- state. Run much later, its first statement would mark the winners of
-- items that ended since the upgrade and are still pending as notified,
-- without a message.
--
-- Do not use it on a database that `npm run db:migrate:turso` or the
-- migration files already migrated: the migrations did this there.

-- From 20261122170000_mark_past_null_dated_winners_notified:
-- Items without their own end date now end with their auction, and the
-- auction-end notifier sends their winners a "won" notification. Mark the
-- winners of such items in auctions that had already ended when this
-- migration runs as notified, so the release does not send a burst of
-- notifications for old auctions. Auctions that end after this point are
-- notified as usual.
--
-- Dates are compared in Unix seconds: Prisma stores DATETIME as ISO text,
-- and epoch milliseconds are handled in case older rows hold integers.
UPDATE "auction_items"
SET "winnerNotified" = 1
WHERE "endDate" IS NULL
  AND "winnerNotified" = 0
  AND "highestBidderId" IS NOT NULL
  AND "auctionId" IN (
    SELECT "id"
    FROM "auctions"
    WHERE "endDate" IS NOT NULL
      AND (
        CASE
          WHEN typeof("endDate") IN ('integer', 'real') THEN "endDate" / 1000
          ELSE CAST(strftime('%s', "endDate") AS INTEGER)
        END
      ) < CAST(strftime('%s', 'now') AS INTEGER)
  );

-- From 20261122180000_add_winner_notification_record (without the
-- ALTER TABLE statements):

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
-- this migration runs, is not queued again. The current highest bidder and
-- bid are recorded, as the notifier's 14-day rule
-- (STALE_WINNER_NOTIFICATION_MS) would record them, but with no
-- notification time, because nobody is told (the notifier stores its run
-- time there instead). The previous release's notifier
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
