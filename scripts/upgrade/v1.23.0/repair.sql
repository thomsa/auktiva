-- Auktiva v1.23.0 post-deploy repair. Safe to run more than once.
--
-- Run it once the v1.23.0 release serves all traffic, after
-- `npm run db:migrate:turso` (or the migration files) were applied.
--
-- Between the migration and the v1.23.0 deploy, the v1.22.0 notifier may
-- still run. It sends the right "You won" message, but it only sets
-- winnerNotified and leaves the new winner record empty or naming the
-- previous winner. A later reopen would then tell the wrong user that
-- their win is no longer final. This sets the record to the current highest
-- bidder wherever the item's latest AUCTION_WON notification went to that
-- bidder but the record says otherwise.

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
