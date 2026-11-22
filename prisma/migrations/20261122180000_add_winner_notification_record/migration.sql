-- AlterTable
ALTER TABLE "auction_items" ADD COLUMN "winnerNotifiedAmount" REAL;
ALTER TABLE "auction_items" ADD COLUMN "winnerNotifiedAt" DATETIME;
ALTER TABLE "auction_items" ADD COLUMN "winnerNotifiedUserId" TEXT;

-- Backfill the notified winner for items already marked as notified:
-- the user and time of the item's latest AUCTION_WON notification, or the
-- current highest bidder (with no time) when that notification is gone.
-- No date comparisons: createdAt is only used to order the notifications.
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
WHERE "winnerNotified" = 1;

-- The notified amount is only known when the notified user still holds the
-- highest bid.
UPDATE "auction_items"
SET "winnerNotifiedAmount" = "currentBid"
WHERE "winnerNotified" = 1
  AND "winnerNotifiedUserId" IS NOT NULL
  AND "winnerNotifiedUserId" = "highestBidderId";

-- Re-queue items whose winner changed after the notification (auctions
-- extended before this upgrade), so the current highest bidder is notified.
UPDATE "auction_items"
SET "winnerNotified" = 0
WHERE "winnerNotified" = 1
  AND "highestBidderId" IS NOT NULL
  AND "winnerNotifiedUserId" IS NOT "highestBidderId";
