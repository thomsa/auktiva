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
