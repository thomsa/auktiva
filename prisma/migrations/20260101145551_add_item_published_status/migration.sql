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
    CONSTRAINT "auction_items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_items_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auction_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Grandfather existing items to isPublished = true (1 in SQLite)
INSERT INTO "new_auction_items" ("auctionId", "bidderAnonymous", "createdAt", "creatorId", "currencyCode", "currentBid", "description", "endDate", "highestBidderId", "id", "minBidIncrement", "name", "startingBid", "updatedAt", "winnerNotified", "isPublished") SELECT "auctionId", "bidderAnonymous", "createdAt", "creatorId", "currencyCode", "currentBid", "description", "endDate", "highestBidderId", "id", "minBidIncrement", "name", "startingBid", "updatedAt", "winnerNotified", 1 FROM "auction_items";
DROP TABLE "auction_items";
ALTER TABLE "new_auction_items" RENAME TO "auction_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
