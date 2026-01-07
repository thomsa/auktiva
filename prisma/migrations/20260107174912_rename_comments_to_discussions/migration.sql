/*
  Warnings:

  - You are about to drop the `item_comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `commentsEnabled` on the `auction_items` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "item_comments_auctionItemId_createdAt_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "item_comments";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "item_discussions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "item_discussions_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "item_discussions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "item_discussions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "item_discussions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_auction_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "startingBid" REAL NOT NULL DEFAULT 0,
    "minBidIncrement" REAL NOT NULL DEFAULT 1,
    "currentBid" REAL,
    "highestBidderId" TEXT,
    "bidderAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "endDate" DATETIME,
    "winnerNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    "discussionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "auction_items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_items_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auction_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_auction_items" ("auctionId", "bidderAnonymous", "createdAt", "creatorId", "currencyCode", "currentBid", "description", "endDate", "highestBidderId", "id", "isPublished", "minBidIncrement", "name", "startingBid", "updatedAt", "winnerNotified") SELECT "auctionId", "bidderAnonymous", "createdAt", "creatorId", "currencyCode", "currentBid", "description", "endDate", "highestBidderId", "id", "isPublished", "minBidIncrement", "name", "startingBid", "updatedAt", "winnerNotified" FROM "auction_items";
DROP TABLE "auction_items";
ALTER TABLE "new_auction_items" RENAME TO "auction_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "item_discussions_auctionItemId_createdAt_idx" ON "item_discussions"("auctionItemId", "createdAt");

-- CreateIndex
CREATE INDEX "item_discussions_parentId_idx" ON "item_discussions"("parentId");
