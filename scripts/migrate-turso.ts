#!/usr/bin/env npx tsx
/**
 * Apply Prisma migrations to Turso database
 *
 * This script applies ONLY NEW migrations to your Turso database.
 * It tracks applied migrations in a _prisma_migrations table.
 * Works in any environment (local, Vercel, etc.) using @libsql/client.
 *
 * Usage: npx tsx scripts/migrate-turso.ts
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// Load .env file if it exists (for local development)
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

async function main() {
  // Validate environment
  if (!DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not set");
    process.exit(1);
  }

  // Check if it's a Turso/libsql URL
  if (
    !DATABASE_URL.startsWith("libsql://") &&
    !DATABASE_URL.startsWith("https://")
  ) {
    console.log(
      "ℹ️  DATABASE_URL is not a Turso URL, skipping remote migrations",
    );
    console.log("   For local SQLite, use: npm run db:migrate");
    process.exit(0);
  }

  // Create libsql client
  const client = createClient({
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
  });

  const migrationsDir = path.join(process.cwd(), "prisma/migrations");

  // Get all migration folders sorted chronologically
  const migrationFolders = fs
    .readdirSync(migrationsDir)
    .filter(
      (f) =>
        f !== "migration_lock.toml" &&
        fs.statSync(path.join(migrationsDir, f)).isDirectory(),
    )
    .sort();

  if (migrationFolders.length === 0) {
    console.error("❌ Error: No migrations found in prisma/migrations");
    process.exit(1);
  }

  console.log("🚀 Applying migrations to Turso database");
  console.log("");

  // Create migrations tracking table if it doesn't exist
  console.log("📋 Checking migration tracking table...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id TEXT PRIMARY KEY,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get list of already applied migrations
  const appliedResult = await client.execute(
    "SELECT migration_name FROM _prisma_migrations",
  );
  const appliedMigrations = new Set(
    appliedResult.rows.map((row) => row.migration_name as string),
  );

  let applied = 0;
  let skipped = 0;
  const total = migrationFolders.length;

  // Apply each migration in order
  for (let i = 0; i < migrationFolders.length; i++) {
    const migrationFolder = migrationFolders[i];
    const migrationFile = path.join(
      migrationsDir,
      migrationFolder,
      "migration.sql",
    );

    if (!fs.existsSync(migrationFile)) {
      console.log(
        `⚠️  [${i + 1}/${total}] Skipping ${migrationFolder} (no migration.sql found)`,
      );
      continue;
    }

    // Check if migration was already applied
    if (appliedMigrations.has(migrationFolder)) {
      console.log(
        `⏭️  [${i + 1}/${total}] Already applied: ${migrationFolder}`,
      );
      skipped++;
      continue;
    }

    console.log(`🔄 [${i + 1}/${total}] Applying: ${migrationFolder}`);

    try {
      // Read and execute migration SQL
      const sql = fs.readFileSync(migrationFile, "utf-8");

      // Use executeMultiple to run the entire migration as a batch
      // This handles PRAGMA statements and table dependencies correctly
      await client.executeMultiple(sql);

      // Record the migration as applied
      const migrationId = randomUUID();
      await client.execute({
        sql: "INSERT INTO _prisma_migrations (id, migration_name) VALUES (?, ?)",
        args: [migrationId, migrationFolder],
      });

      console.log("   ✓ Done");
      applied++;
    } catch (error) {
      console.error(`   ❌ Failed to apply migration: ${migrationFolder}`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log("");
  console.log("✅ Migration complete!");
  console.log(`   Applied: ${applied} new migration(s)`);
  console.log(`   Skipped: ${skipped} already applied`);

  client.close();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
