-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "joinMode" TEXT NOT NULL DEFAULT 'INVITE_ONLY',
    "memberCanInvite" BOOLEAN NOT NULL DEFAULT false,
    "inviteToken" TEXT,
    "bidderVisibility" TEXT NOT NULL DEFAULT 'ITEM_CHOICE',
    "endDate" DATETIME,
    "itemEndMode" TEXT NOT NULL DEFAULT 'CUSTOM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "auctions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auction_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BIDDER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedById" TEXT,
    CONSTRAINT "auction_members_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auction_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BIDDER',
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT NOT NULL,
    CONSTRAINT "auction_invites_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_invites_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "auction_items" (
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
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "auction_items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_items_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auction_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auction_item_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionItemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auction_item_images_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bids_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_inviteToken_key" ON "auctions"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "auction_members_auctionId_userId_key" ON "auction_members"("auctionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_invites_token_key" ON "auction_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "auction_invites_auctionId_email_key" ON "auction_invites"("auctionId", "email");

-- CreateIndex
CREATE INDEX "bids_auctionItemId_amount_idx" ON "bids"("auctionItemId", "amount");
