-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailVerified" DATETIME;

-- Grandfather existing users: set emailVerified to their createdAt date
UPDATE "users" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_createdAt_idx" ON "email_verification_tokens"("userId", "createdAt");
