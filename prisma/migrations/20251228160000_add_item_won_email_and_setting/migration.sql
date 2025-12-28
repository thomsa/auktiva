-- Add emailOnItemWon column to user_settings table
ALTER TABLE "user_settings" ADD COLUMN "emailOnItemWon" BOOLEAN NOT NULL DEFAULT false;
