-- AlterTable
ALTER TABLE "auction_items" ADD COLUMN "minBidConstraint" JSONB;
ALTER TABLE "auction_items" ADD COLUMN "minBidNormalized" REAL;
ALTER TABLE "auction_items" ADD COLUMN "minIncrementNormalized" REAL;

-- CreateTable
CREATE TABLE "auction_currency_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "conversionRateToBase" REAL NOT NULL DEFAULT 1,
    "fractionMode" TEXT NOT NULL DEFAULT 'DECIMAL',
    "precision" INTEGER NOT NULL DEFAULT 2,
    "inputMode" TEXT NOT NULL DEFAULT 'SCALAR',
    "denominationConfig" JSONB,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "auction_currency_profiles_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auction_currency_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currencyProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "auction_currency_rules_currencyProfileId_fkey" FOREIGN KEY ("currencyProfileId") REFERENCES "auction_currency_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "normalizedAmount" REAL,
    "enteredRepresentation" JSONB,
    "currencyProfileId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bids_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bids_currencyProfileId_fkey" FOREIGN KEY ("currencyProfileId") REFERENCES "auction_currency_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_bids" ("amount", "auctionItemId", "createdAt", "id", "isAnonymous", "userId") SELECT "amount", "auctionItemId", "createdAt", "id", "isAnonymous", "userId" FROM "bids";
DROP TABLE "bids";
ALTER TABLE "new_bids" RENAME TO "bids";
CREATE INDEX "bids_auctionItemId_amount_idx" ON "bids"("auctionItemId", "amount");
CREATE INDEX "bids_auctionItemId_normalizedAmount_idx" ON "bids"("auctionItemId", "normalizedAmount");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "auction_currency_profiles_auctionId_isArchived_idx" ON "auction_currency_profiles"("auctionId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "auction_currency_profiles_auctionId_code_key" ON "auction_currency_profiles"("auctionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "auction_currency_rules_currencyProfileId_type_key" ON "auction_currency_rules"("currencyProfileId", "type");
