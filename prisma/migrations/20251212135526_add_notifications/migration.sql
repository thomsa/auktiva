-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemSidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "auctionId" TEXT,
    "itemId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "auctions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_auctions" ("bidderVisibility", "createdAt", "creatorId", "description", "endDate", "id", "inviteToken", "itemEndMode", "joinMode", "memberCanInvite", "name", "updatedAt") SELECT "bidderVisibility", "createdAt", "creatorId", "description", "endDate", "id", "inviteToken", "itemEndMode", "joinMode", "memberCanInvite", "name", "updatedAt" FROM "auctions";
DROP TABLE "auctions";
ALTER TABLE "new_auctions" RENAME TO "auctions";
CREATE UNIQUE INDEX "auctions_inviteToken_key" ON "auctions"("inviteToken");
CREATE TABLE "new_bids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bids_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bids" ("amount", "auctionItemId", "createdAt", "id", "userId") SELECT "amount", "auctionItemId", "createdAt", "id", "userId" FROM "bids";
DROP TABLE "bids";
ALTER TABLE "new_bids" RENAME TO "bids";
CREATE INDEX "bids_auctionItemId_amount_idx" ON "bids"("auctionItemId", "amount");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
