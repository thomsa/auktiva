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
    "isEditableByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "endDate" DATETIME,
    "antiSnipeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiSnipeThresholdSeconds" INTEGER NOT NULL DEFAULT 300,
    "antiSnipeExtensionSeconds" INTEGER NOT NULL DEFAULT 300,
    "winnerNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    "lastUpdatedById" TEXT,
    "discussionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "auction_items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_items_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auction_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_items_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_auction_items" ("auctionId", "bidderAnonymous", "createdAt", "creatorId", "currencyCode", "currentBid", "description", "discussionsEnabled", "endDate", "highestBidderId", "id", "isEditableByAdmin", "isPublished", "lastUpdatedById", "minBidIncrement", "name", "startingBid", "updatedAt", "winnerNotified") SELECT "auctionId", "bidderAnonymous", "createdAt", "creatorId", "currencyCode", "currentBid", "description", "discussionsEnabled", "endDate", "highestBidderId", "id", "isEditableByAdmin", "isPublished", "lastUpdatedById", "minBidIncrement", "name", "startingBid", "updatedAt", "winnerNotified" FROM "auction_items";
DROP TABLE "auction_items";
ALTER TABLE "new_auction_items" RENAME TO "auction_items";
CREATE TABLE "new_auctions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "joinMode" TEXT NOT NULL DEFAULT 'INVITE_ONLY',
    "memberCanInvite" BOOLEAN NOT NULL DEFAULT false,
    "inviteToken" TEXT,
    "bidderVisibility" TEXT NOT NULL DEFAULT 'VISIBLE',
    "endDate" DATETIME,
    "itemEndMode" TEXT NOT NULL DEFAULT 'CUSTOM',
    "thumbnailUrl" TEXT,
    "defaultItemsEditableByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "defaultAntiSnipe" BOOLEAN NOT NULL DEFAULT false,
    "defaultAntiSnipeThreshold" INTEGER NOT NULL DEFAULT 300,
    "defaultAntiSnipeExtension" INTEGER NOT NULL DEFAULT 300,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "auctions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_auctions" ("bidderVisibility", "createdAt", "creatorId", "defaultItemsEditableByAdmin", "description", "endDate", "id", "inviteToken", "itemEndMode", "joinMode", "memberCanInvite", "name", "thumbnailUrl", "updatedAt") SELECT "bidderVisibility", "createdAt", "creatorId", "defaultItemsEditableByAdmin", "description", "endDate", "id", "inviteToken", "itemEndMode", "joinMode", "memberCanInvite", "name", "thumbnailUrl", "updatedAt" FROM "auctions";
DROP TABLE "auctions";
ALTER TABLE "new_auctions" RENAME TO "auctions";
CREATE UNIQUE INDEX "auctions_inviteToken_key" ON "auctions"("inviteToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
