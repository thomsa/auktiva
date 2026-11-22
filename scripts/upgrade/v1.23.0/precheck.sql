-- Auktiva v1.23.0 upgrade pre-check. Read-only.
--
-- Run it on the v1.22.0 database BEFORE the migrations. It predicts, per
-- item, what migrations 20261122170000 and 20261122180000 do and what the
-- v1.23.0 notifier does on its first runs:
--
--   marked_notified_follows_ended_auction  item without its own end date in
--       an auction that has ended: marked as notified, nobody is messaged
--   pending                                not notified yet; left as is
--   notified_winner_unchanged              keeps its winner; nothing is sent
--   winner_changed_recorded_over_14_days   the winner changed after the
--       "You won" message but the item ended more than 14 days ago: the
--       current highest bidder is recorded, nobody is messaged
--   winner_changed_requeued_ended          the winner changed and the item
--       ended within 14 days: the new winner is told they won
--   winner_changed_requeued_open           the winner changed and the item
--       is open again: the winner is told once it ends
--
-- notifyAfterDeploy counts the published items whose current highest bidder
-- the v1.23.0 notifier will message right after the deploy.
-- recordedAfterDeploy counts the published items it will record without a
-- message (pending, ended more than 14 days ago).
-- The second query lists the items whose winner changed or who get a
-- message (IDs only).

WITH "item" AS (
  SELECT
    "i"."id" AS "itemId",
    "i"."name" AS "itemName",
    "i"."auctionId" AS "auctionId",
    "i"."isPublished" AS "isPublished",
    "i"."winnerNotified" AS "winnerNotified",
    "i"."highestBidderId" AS "highestBidderId",
    "i"."endDate" IS NULL AS "followsAuction",
    (
      SELECT "n"."userId"
      FROM "notifications" AS "n"
      WHERE "n"."itemId" = "i"."id"
        AND "n"."type" = 'AUCTION_WON'
      ORDER BY "n"."createdAt" DESC, "n"."id" DESC
      LIMIT 1
    ) AS "lastWonUserId",
    CASE
      WHEN typeof("a"."endDate") IN ('integer', 'real') THEN "a"."endDate" / 1000
      ELSE CAST(strftime('%s', "a"."endDate") AS INTEGER)
    END AS "auctionEndS",
    CASE
      WHEN typeof(COALESCE("i"."endDate", "a"."endDate")) IN ('integer', 'real')
        THEN COALESCE("i"."endDate", "a"."endDate") / 1000
      ELSE CAST(strftime('%s', COALESCE("i"."endDate", "a"."endDate")) AS INTEGER)
    END AS "endS",
    CAST(strftime('%s', 'now') AS INTEGER) AS "nowS"
  FROM "auction_items" AS "i"
  JOIN "auctions" AS "a" ON "a"."id" = "i"."auctionId"
),
"classified" AS (
  SELECT
    *,
    CASE
      WHEN "winnerNotified" = 0
        AND "followsAuction"
        AND "highestBidderId" IS NOT NULL
        AND "auctionEndS" < "nowS"
        THEN 'marked_notified_follows_ended_auction'
      WHEN "winnerNotified" = 0 THEN 'pending'
      WHEN "highestBidderId" IS NULL
        OR COALESCE("lastWonUserId", "highestBidderId") = "highestBidderId"
        THEN 'notified_winner_unchanged'
      WHEN "endS" < "nowS" - 1209600 THEN 'winner_changed_recorded_over_14_days'
      WHEN "endS" < "nowS" THEN 'winner_changed_requeued_ended'
      ELSE 'winner_changed_requeued_open'
    END AS "outcome"
  FROM "item"
),
"predicted" AS (
  SELECT
    *,
    CASE
      WHEN "outcome" IN ('pending', 'winner_changed_requeued_ended')
        AND "isPublished" = 1
        AND "highestBidderId" IS NOT NULL
        AND "endS" < "nowS"
        AND "endS" >= "nowS" - 1209600
        THEN 1
      ELSE 0
    END AS "notifyAfterDeploy",
    CASE
      WHEN "outcome" = 'pending'
        AND "isPublished" = 1
        AND "highestBidderId" IS NOT NULL
        AND "endS" < "nowS" - 1209600
        THEN 1
      ELSE 0
    END AS "recordedAfterDeploy"
  FROM "classified"
)
SELECT
  "outcome",
  COUNT(*) AS "items",
  SUM("notifyAfterDeploy") AS "notifyAfterDeploy",
  SUM("recordedAfterDeploy") AS "recordedAfterDeploy"
FROM "predicted"
GROUP BY "outcome"
ORDER BY "outcome";

WITH "item" AS (
  SELECT
    "i"."id" AS "itemId",
    "i"."name" AS "itemName",
    "i"."auctionId" AS "auctionId",
    "i"."isPublished" AS "isPublished",
    "i"."winnerNotified" AS "winnerNotified",
    "i"."highestBidderId" AS "highestBidderId",
    "i"."endDate" IS NULL AS "followsAuction",
    (
      SELECT "n"."userId"
      FROM "notifications" AS "n"
      WHERE "n"."itemId" = "i"."id"
        AND "n"."type" = 'AUCTION_WON'
      ORDER BY "n"."createdAt" DESC, "n"."id" DESC
      LIMIT 1
    ) AS "lastWonUserId",
    CASE
      WHEN typeof("a"."endDate") IN ('integer', 'real') THEN "a"."endDate" / 1000
      ELSE CAST(strftime('%s', "a"."endDate") AS INTEGER)
    END AS "auctionEndS",
    CASE
      WHEN typeof(COALESCE("i"."endDate", "a"."endDate")) IN ('integer', 'real')
        THEN COALESCE("i"."endDate", "a"."endDate") / 1000
      ELSE CAST(strftime('%s', COALESCE("i"."endDate", "a"."endDate")) AS INTEGER)
    END AS "endS",
    CAST(strftime('%s', 'now') AS INTEGER) AS "nowS"
  FROM "auction_items" AS "i"
  JOIN "auctions" AS "a" ON "a"."id" = "i"."auctionId"
),
"classified" AS (
  SELECT
    *,
    CASE
      WHEN "winnerNotified" = 0
        AND "followsAuction"
        AND "highestBidderId" IS NOT NULL
        AND "auctionEndS" < "nowS"
        THEN 'marked_notified_follows_ended_auction'
      WHEN "winnerNotified" = 0 THEN 'pending'
      WHEN "highestBidderId" IS NULL
        OR COALESCE("lastWonUserId", "highestBidderId") = "highestBidderId"
        THEN 'notified_winner_unchanged'
      WHEN "endS" < "nowS" - 1209600 THEN 'winner_changed_recorded_over_14_days'
      WHEN "endS" < "nowS" THEN 'winner_changed_requeued_ended'
      ELSE 'winner_changed_requeued_open'
    END AS "outcome"
  FROM "item"
)
SELECT
  "outcome",
  "auctionId",
  "itemId",
  "itemName",
  "lastWonUserId" AS "previouslyToldUserId",
  "highestBidderId",
  datetime("endS", 'unixepoch') AS "endsAtUtc"
FROM "classified"
WHERE "outcome" LIKE 'winner_changed_%'
  OR (
    "outcome" = 'pending'
    AND "isPublished" = 1
    AND "highestBidderId" IS NOT NULL
    AND "endS" < "nowS"
    AND "endS" >= "nowS" - 1209600
  )
ORDER BY "outcome", "auctionId", "itemId";
