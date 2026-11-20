-- CreateTable
CREATE TABLE "pending_auction_destinations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "pending_auction_destinations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pending_auction_destinations_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_auction_destinations_userId_key" ON "pending_auction_destinations"("userId");

-- CreateIndex
CREATE INDEX "pending_auction_destinations_auctionId_idx" ON "pending_auction_destinations"("auctionId");
