-- Auktiva v1.23.0 post-upgrade checks. Read-only.
-- run-sql: read-only
--
-- Run it after the v1.23.0 deploy and repair.sql. Two result sets:
--
-- 1. winnerRecordColumns: 3, the same as "expected". Fewer means migration
--    20261122180000 is not (fully) applied.
-- 2. One row per check; "items" should equal "expected" (0):
--    notified_without_record and notified_record_not_highest_bidder are 0
--    right after repair.sql. pending_ended_items counts ended items whose
--    winner the notifier has not handled yet, including the ones repair.sql
--    just queued again. It can be above 0 right after the repair and drops
--    to 0 once the notifier has run: on the next notification poll of any
--    signed-in user, 50 items per run.

SELECT COUNT(*) AS "winnerRecordColumns", 3 AS "expected"
FROM pragma_table_info('auction_items')
WHERE "name" IN ('winnerNotifiedUserId', 'winnerNotifiedAmount', 'winnerNotifiedAt');

SELECT 'notified_without_record' AS "check", COUNT(*) AS "items", 0 AS "expected"
FROM "auction_items"
WHERE "winnerNotified" = 1
  AND "highestBidderId" IS NOT NULL
  AND "winnerNotifiedUserId" IS NULL
UNION ALL
SELECT 'notified_record_not_highest_bidder', COUNT(*), 0
FROM "auction_items"
WHERE "winnerNotified" = 1
  AND "highestBidderId" IS NOT NULL
  AND "winnerNotifiedUserId" IS NOT NULL
  AND "winnerNotifiedUserId" <> "highestBidderId"
UNION ALL
SELECT 'pending_ended_items', COUNT(*), 0
FROM "auction_items" AS "i"
JOIN "auctions" AS "a" ON "a"."id" = "i"."auctionId"
WHERE "i"."winnerNotified" = 0
  AND "i"."isPublished" = 1
  AND "i"."highestBidderId" IS NOT NULL
  AND (
    CASE
      WHEN typeof(COALESCE("i"."endDate", "a"."endDate")) IN ('integer', 'real')
        THEN COALESCE("i"."endDate", "a"."endDate") / 1000
      ELSE CAST(strftime('%s', COALESCE("i"."endDate", "a"."endDate")) AS INTEGER)
    END
  ) < CAST(strftime('%s', 'now') AS INTEGER);
