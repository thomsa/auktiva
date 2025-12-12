import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

function createAdapter() {
  if (
    databaseUrl.startsWith("libsql://") ||
    databaseUrl.startsWith("https://")
  ) {
    // Turso/LibSQL
    return new PrismaLibSql({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  } else {
    // SQLite
    return new PrismaBetterSqlite3({ url: databaseUrl });
  }
}

/**
 * Check if using Turso/LibSQL database
 */
export function isTurso(): boolean {
  return (
    databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://")
  );
}

/**
 * Create a new PrismaClient instance.
 * Used by seed scripts that need their own client.
 */
export function createPrismaClient() {
  return new PrismaClient({ adapter: createAdapter() });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
