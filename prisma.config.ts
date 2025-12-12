/**
 * Prisma CLI Configuration
 *
 * The Prisma CLI (db push, migrate) only works with local SQLite.
 * For Turso databases, use: npm run db:migrate:turso
 *
 * This config automatically detects the database type:
 * - SQLite (file:./...) → Uses DATABASE_URL directly
 * - Turso (libsql://...) → Falls back to local SQLite for CLI commands
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const isTurso =
  databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI needs SQLite - use DATABASE_URL if local, otherwise fallback
    url: isTurso ? "file:./dev.db" : databaseUrl,
  },
});
