#!/usr/bin/env npx tsx
/**
 * Checks that the database's migration history matches its schema, so that
 * `prisma migrate deploy` (SQLite) or `npm run db:migrate:turso` (Turso)
 * can update it. scripts/update.sh runs it before it changes anything.
 * Read-only: it never writes to the database and never baselines it.
 *
 * Usage: npx tsx scripts/check-migration-history.ts
 *
 * Reads DATABASE_URL and DATABASE_AUTH_TOKEN from the environment or .env,
 * and uses `file:./dev.db` when DATABASE_URL is unset, like the app.
 *
 * Exit codes: 0 safe to migrate, 3 the database needs your action first
 * (the output says what), 1 the check itself failed.
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";
import {
  BASELINE_DOCS_URL,
  checkMigrationHistory,
  listMigrationFolders,
  prismaSchemaMatcher,
  readMigrationSnapshot,
  type MigrationCheck,
} from "./migration-history";

const ACTION_REQUIRED = 3;

function sqlitePath(url: string): string {
  return path.resolve(process.cwd(), url.slice("file:".length).split("?")[0]);
}

function report(check: MigrationCheck, isSqlite: boolean): number {
  if (check.status === "ok") {
    const reasons = {
      "empty-database": "The database has no tables yet.",
      "history-matches-schema":
        "The migration history matches the database schema.",
      "history-recorded": "The database has a migration history.",
    };
    console.log(`${reasons[check.reason]} Safe to migrate.`);
    return 0;
  }

  console.error("");
  if (check.status === "failed-migrations") {
    console.error(
      "These migrations are recorded as started but never finished:",
    );
    for (const name of check.failed) console.error(`  ${name}`);
    console.error("");
    console.error(
      "Restore the backup taken before that migration, or finish it by hand and",
    );
    console.error(
      "record the result with `npx prisma migrate resolve --applied <name>` or",
    );
    console.error("`--rolled-back <name>`.");
  } else if (check.status === "unknown-migrations") {
    console.error(
      "The migration history records migrations this version does not have:",
    );
    for (const name of check.unknown) console.error(`  ${name}`);
    console.error("");
    console.error(
      "The database was migrated by a different (newer or development) version.",
    );
  } else {
    console.error(
      check.reason === "no-history"
        ? "The database has tables but no migration history. It was created with"
        : "The database schema is ahead of its migration history. It was updated with",
    );
    console.error(
      "`prisma db push` (older setups and update scripts did this), so the",
    );
    console.error(
      "migrations cannot update it until its history is baselined once.",
    );
    console.error("");
    if (check.schemaMatchesAllMigrations === true) {
      console.error(
        "Its schema matches all migrations of this version. After a backup, record",
      );
      console.error("the ones the history is missing as applied:");
      console.error("");
      for (const name of check.unrecorded) {
        console.error(`  npx prisma migrate resolve --applied ${name}`);
      }
      console.error("");
      console.error(
        "Recording a migration as applied does not run it. If one of them changes",
      );
      console.error(
        "data, not only the schema, check its release notes for a data step.",
      );
    } else if (check.schemaMatchesAllMigrations === false) {
      console.error(
        "Its schema does not match the migrations of this version either. Compare",
      );
      console.error("them before you change anything:");
      console.error("");
      console.error(
        "  npx prisma migrate diff --from-migrations prisma/migrations --to-config-datasource",
      );
    } else if (!isSqlite) {
      console.error(
        "This check cannot compare a Turso schema with the migrations. Compare a",
      );
      console.error("local copy of the database first.");
    }
  }
  console.error("");
  console.error(`Nothing was changed. See ${BASELINE_DOCS_URL}`);
  return ACTION_REQUIRED;
}

async function main() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const isSqlite = url.startsWith("file:");
  if (!isSqlite && !/^(libsql|https):\/\//.test(url)) {
    console.error("DATABASE_URL must start with file:, libsql:// or https://");
    return 1;
  }

  let clientUrl = url;
  if (isSqlite) {
    const file = sqlitePath(url);
    if (!fs.existsSync(file)) {
      console.log(
        `No database file at ${file} yet; the migrations will create it.`,
      );
      return 0;
    }
    clientUrl = `file:${file.replace(/\\/g, "/")}`;
  }

  const projectRoot = process.cwd();
  const migrationsDir = path.join(projectRoot, "prisma", "migrations");
  const client = createClient({
    url: clientUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  try {
    const check = await checkMigrationHistory({
      snapshot: await readMigrationSnapshot(client),
      migrations: listMigrationFolders(migrationsDir),
      schemaMatches: isSqlite
        ? prismaSchemaMatcher({
            projectRoot,
            migrationsDir,
            // Compare exactly the file read above.
            env: { ...process.env, DATABASE_URL: clientUrl },
          })
        : undefined,
    });
    return report(check, isSqlite);
  } finally {
    client.close();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error("Could not check the migration history:");
    console.error(error);
    process.exitCode = 1;
  });
