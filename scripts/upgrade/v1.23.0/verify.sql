-- Auktiva v1.23.0 post-upgrade checks. Read-only.
--
-- Run it after the v1.23.0 deploy and repair.sql. Every row's "items"
-- should equal "expected". pending_ended_items drops to 0 once the
-- notifier has run, which happens on the next notification poll of any
-- signed-in user.

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
