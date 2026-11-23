import type { Client } from "@libsql/client";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

/**
 * Checks, before an update migrates a database, that its migration history
 * (`_prisma_migrations`) describes its schema. A database created or updated
 * with `prisma db push` has tables the history does not record, and
 * `prisma migrate deploy` then fails (P3005 with no history, or a
 * "table already exists" error halfway through the pending migrations).
 * Used by scripts/check-migration-history.ts and scripts/update.sh.
 */

export const BASELINE_DOCS_URL =
  "https://docs.auktiva.org/developers/upgrading#migration-history-and-baselining";

export interface RecordedMigration {
  name: string;
  /** False for a migration Prisma recorded as started but not finished. */
  finished: boolean;
}

export interface MigrationSnapshot {
  /** Application tables (not SQLite, libSQL or migration bookkeeping). */
  tables: string[];
  /** Recorded migrations, without rolled-back ones. Empty when none. */
  history: RecordedMigration[];
}

export type MigrationCheck =
  | {
      status: "ok";
      reason: "empty-database" | "history-matches-schema" | "history-recorded";
    }
  | { status: "failed-migrations"; failed: string[] }
  | { status: "unknown-migrations"; unknown: string[] }
  | {
      status: "baseline-required";
      reason: "no-history" | "schema-ahead-of-history";
      /** This version's migrations that the history does not record. */
      unrecorded: string[];
      /**
       * Whether the schema matches all of this version's migrations, so
       * recording the unrecorded ones as applied is correct. `null` when it
       * could not be checked (Turso).
       */
      schemaMatchesAllMigrations: boolean | null;
    };

/** Migration folder names in `dir`, in the order Prisma applies them. */
export function listMigrationFolders(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => fs.existsSync(path.join(dir, name, "migration.sql")))
    .sort();
}

export async function readMigrationSnapshot(
  client: Client,
): Promise<MigrationSnapshot> {
  const tableRows = await client.execute(
    `SELECT "name" FROM "sqlite_master" WHERE "type" = 'table' ORDER BY "name"`,
  );
  const allTables = tableRows.rows.map((row) => String(row.name));
  const tables = allTables.filter(
    (name) =>
      name !== "_prisma_migrations" &&
      !/^(sqlite_|libsql_|_litestream_)/.test(name),
  );
  if (!allTables.includes("_prisma_migrations")) {
    return { tables, history: [] };
  }

  // Prisma's table has finished_at and rolled_back_at; the one
  // scripts/migrate-turso.ts creates records applied migrations only.
  const columnRows = await client.execute(
    `SELECT "name" FROM pragma_table_info('_prisma_migrations')`,
  );
  const columns = new Set(columnRows.rows.map((row) => String(row.name)));
  const tracksState =
    columns.has("finished_at") && columns.has("rolled_back_at");
  const historyRows = await client.execute(
    tracksState
      ? `SELECT "migration_name", "finished_at" IS NOT NULL AS "finished"
         FROM "_prisma_migrations" WHERE "rolled_back_at" IS NULL`
      : `SELECT "migration_name", 1 AS "finished" FROM "_prisma_migrations"`,
  );
  return {
    tables,
    history: historyRows.rows.map((row) => ({
      name: String(row.migration_name),
      finished: Number(row.finished) === 1,
    })),
  };
}

/**
 * Decides whether migrating is safe.
 *
 * @param migrations this version's migration folders, in order.
 * @param schemaMatches compares the database schema with the schema the
 *   given migrations produce (SQLite only). Without it (Turso) the history
 *   is trusted once it records anything.
 */
export async function checkMigrationHistory(options: {
  snapshot: MigrationSnapshot;
  migrations: string[];
  schemaMatches?: (migrations: string[]) => Promise<boolean>;
}): Promise<MigrationCheck> {
  const { snapshot, migrations, schemaMatches } = options;
  if (snapshot.tables.length === 0) {
    return { status: "ok", reason: "empty-database" };
  }

  const failed = snapshot.history
    .filter((migration) => !migration.finished)
    .map((migration) => migration.name);
  if (failed.length > 0) {
    return { status: "failed-migrations", failed };
  }

  const applied = new Set(snapshot.history.map((migration) => migration.name));
  const unrecorded = migrations.filter((name) => !applied.has(name));
  const matchesAll = async () =>
    schemaMatches ? schemaMatches(migrations) : null;

  if (applied.size === 0) {
    return {
      status: "baseline-required",
      reason: "no-history",
      unrecorded,
      schemaMatchesAllMigrations: await matchesAll(),
    };
  }
  if (!schemaMatches) {
    return { status: "ok", reason: "history-recorded" };
  }

  const unknown = [...applied].filter((name) => !migrations.includes(name));
  if (unknown.length > 0) {
    return { status: "unknown-migrations", unknown };
  }

  const appliedInOrder = migrations.filter((name) => applied.has(name));
  if (await schemaMatches(appliedInOrder)) {
    return { status: "ok", reason: "history-matches-schema" };
  }
  return {
    status: "baseline-required",
    reason: "schema-ahead-of-history",
    unrecorded,
    schemaMatchesAllMigrations: await matchesAll(),
  };
}

/**
 * Compares the database Prisma's config points at (`DATABASE_URL`, a SQLite
 * `file:` URL) with the schema the given migrations produce, using
 * `prisma migrate diff --exit-code`. Read-only.
 */
export function prismaSchemaMatcher(options: {
  projectRoot: string;
  migrationsDir: string;
  env?: NodeJS.ProcessEnv;
}): (migrations: string[]) => Promise<boolean> {
  const require = createRequire(path.join(options.projectRoot, "package.json"));
  const prismaCli = require.resolve("prisma/build/index.js");

  return async (migrations) => {
    if (migrations.length === 0) return false;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-migrations-"));
    try {
      const lockFile = path.join(options.migrationsDir, "migration_lock.toml");
      if (fs.existsSync(lockFile)) {
        fs.copyFileSync(lockFile, path.join(tmp, "migration_lock.toml"));
      }
      for (const name of migrations) {
        fs.cpSync(
          path.join(options.migrationsDir, name),
          path.join(tmp, name),
          {
            recursive: true,
          },
        );
      }
      const result = spawnSync(
        process.execPath,
        [
          prismaCli,
          "migrate",
          "diff",
          "--from-migrations",
          tmp,
          "--to-config-datasource",
          "--exit-code",
        ],
        {
          cwd: options.projectRoot,
          env: {
            ...(options.env ?? process.env),
            PRISMA_HIDE_UPDATE_MESSAGE: "1",
          },
          encoding: "utf8",
        },
      );
      if (result.status === 0) return true;
      if (result.status === 2) return false;
      throw new Error(
        `prisma migrate diff failed (exit ${result.status ?? result.signal}):\n${result.stderr}${result.stdout}`,
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  };
}
