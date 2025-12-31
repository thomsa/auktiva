-- Add ACCOUNT_EXISTS to EmailType enum
-- SQLite doesn't have native enums, so this is handled by Prisma at the application level
-- This migration is a no-op for SQLite but documents the schema change

-- No SQL changes needed for SQLite enum additions
-- The EmailType is stored as TEXT and validated by Prisma
SELECT 1;
