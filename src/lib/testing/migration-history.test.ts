import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import {
  checkMigrationHistory,
  listMigrationFolders,
  prismaSchemaMatcher,
  readMigrationSnapshot,
} from "../../../scripts/migration-history";

/**
 * scripts/migration-history.ts, which scripts/update.sh runs (through
 * scripts/check-migration-history.ts) before it migrates: it must stop on a
 * database whose schema `prisma db push` moved ahead of its migration
 * history, and let a migrated database through.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-history-"));
const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const migrations = listMigrationFolders(migrationsDir);
const clients: Client[] = [];
let dbCount = 0;

after(() => {
  for (const client of clients) client.close();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // Windows keeps local libSQL files open after close().
    if ((err as NodeJS.ErrnoException).code !== "EBUSY") throw err;
  }
});

function newDatabase() {
  const url = `file:${path.join(tmpDir, `db${++dbCount}.db`).replace(/\\/g, "/")}`;
  const client = createClient({ url });
  clients.push(client);
  return { url, client };
}

/** Builds the schema from the migration files, recording none of them. */
async function applySchema(client: Client, names: string[] = migrations) {
  for (const name of names) {
    await client.executeMultiple(
      fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8"),
    );
  }
}

/** The table `prisma migrate deploy` keeps. */
async function recordLikePrisma(
  client: Client,
  rows: { name: string; finished?: boolean; rolledBack?: boolean }[],
) {
  await client.execute(`CREATE TABLE "_prisma_migrations" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
  )`);
  for (const [i, row] of rows.entries()) {
    await client.execute({
      sql: `INSERT INTO "_prisma_migrations"
        ("id", "checksum", "finished_at", "migration_name", "rolled_back_at")
        VALUES (?, '', ?, ?, ?)`,
      args: [
        `m${i}`,
        row.finished === false ? null : "2026-01-01T00:00:00Z",
        row.name,
        row.rolledBack ? "2026-01-01T00:00:00Z" : null,
      ],
    });
  }
}

/** The table scripts/migrate-turso.ts keeps. */
async function recordLikeMigrateTurso(client: Client, names: string[]) {
  await client.execute(`CREATE TABLE "_prisma_migrations" (
    id TEXT PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  for (const [i, name] of names.entries()) {
    await client.execute({
      sql: `INSERT INTO "_prisma_migrations" (id, migration_name) VALUES (?, ?)`,
      args: [`m${i}`, name],
    });
  }
}

function realMatcher(url: string) {
  return prismaSchemaMatcher({
    projectRoot: process.cwd(),
    migrationsDir,
    env: { ...process.env, DATABASE_URL: url },
  });
}

const neverCalled = async () => {
  throw new Error("the schema comparison should not run");
};

test("an empty database is safe to migrate", async () => {
  const { client } = newDatabase();
  assert.deepEqual(
    await checkMigrationHistory({
      snapshot: await readMigrationSnapshot(client),
      migrations,
      schemaMatches: neverCalled,
    }),
    { status: "ok", reason: "empty-database" },
  );
});

test("a db push database without history needs a baseline, and matches all migrations", async () => {
  const { url, client } = newDatabase();
  await applySchema(client);
  const check = await checkMigrationHistory({
    snapshot: await readMigrationSnapshot(client),
    migrations,
    schemaMatches: realMatcher(url),
  });
  assert.deepEqual(check, {
    status: "baseline-required",
    reason: "no-history",
    unrecorded: migrations,
    schemaMatchesAllMigrations: true,
  });
});

test("a database migrated up to an older version is safe to migrate", async () => {
  const { url, client } = newDatabase();
  const older = migrations.slice(0, -2);
  await applySchema(client, older);
  await recordLikePrisma(
    client,
    older.map((name) => ({ name })),
  );
  assert.deepEqual(
    await checkMigrationHistory({
      snapshot: await readMigrationSnapshot(client),
      migrations,
      schemaMatches: realMatcher(url),
    }),
    { status: "ok", reason: "history-matches-schema" },
  );
});

test("a schema pushed ahead of its history needs a baseline for the missing migrations", async () => {
  const { url, client } = newDatabase();
  await applySchema(client);
  await recordLikePrisma(
    client,
    migrations.slice(0, 3).map((name) => ({ name })),
  );
  const check = await checkMigrationHistory({
    snapshot: await readMigrationSnapshot(client),
    migrations,
    schemaMatches: realMatcher(url),
  });
  assert.deepEqual(check, {
    status: "baseline-required",
    reason: "schema-ahead-of-history",
    unrecorded: migrations.slice(3),
    schemaMatchesAllMigrations: true,
  });
});

test("a schema that matches neither the history nor all migrations is reported as such", async () => {
  const { url, client } = newDatabase();
  await applySchema(client, migrations.slice(0, 5));
  await client.execute(`CREATE TABLE "extra" ("id" INTEGER PRIMARY KEY)`);
  await recordLikePrisma(
    client,
    migrations.slice(0, 5).map((name) => ({ name })),
  );
  const check = await checkMigrationHistory({
    snapshot: await readMigrationSnapshot(client),
    migrations,
    schemaMatches: realMatcher(url),
  });
  assert.equal(check.status, "baseline-required");
  assert.equal(
    check.status === "baseline-required" && check.schemaMatchesAllMigrations,
    false,
  );
});

test("an unfinished migration stops the update; rolled-back ones are ignored", async () => {
  const { client } = newDatabase();
  await applySchema(client, migrations.slice(0, 2));
  await recordLikePrisma(client, [
    { name: migrations[0] },
    { name: migrations[1], rolledBack: true, finished: false },
    { name: migrations[1], finished: false },
  ]);
  assert.deepEqual(
    await checkMigrationHistory({
      snapshot: await readMigrationSnapshot(client),
      migrations,
      schemaMatches: neverCalled,
    }),
    { status: "failed-migrations", failed: [migrations[1]] },
  );
});

test("a history with migrations this version does not have stops the update", async () => {
  const { client } = newDatabase();
  await applySchema(client, migrations.slice(0, 1));
  await recordLikePrisma(client, [
    { name: migrations[0] },
    { name: "20991231000000_from_the_future" },
  ]);
  assert.deepEqual(
    await checkMigrationHistory({
      snapshot: await readMigrationSnapshot(client),
      migrations,
      schemaMatches: neverCalled,
    }),
    {
      status: "unknown-migrations",
      unknown: ["20991231000000_from_the_future"],
    },
  );
});

test("Turso: the migrate-turso history is trusted, an empty one needs a baseline", async () => {
  const tracked = newDatabase().client;
  await applySchema(tracked, migrations.slice(0, 4));
  await recordLikeMigrateTurso(tracked, migrations.slice(0, 4));
  assert.deepEqual(
    await checkMigrationHistory({
      snapshot: await readMigrationSnapshot(tracked),
      migrations,
    }),
    { status: "ok", reason: "history-recorded" },
  );

  // migrate-turso.ts creates its table before it fails on a db push
  // database, so an empty table must count as no history.
  const pushed = newDatabase().client;
  await applySchema(pushed, migrations.slice(0, 4));
  await recordLikeMigrateTurso(pushed, []);
  assert.deepEqual(
    await checkMigrationHistory({
      snapshot: await readMigrationSnapshot(pushed),
      migrations,
    }),
    {
      status: "baseline-required",
      reason: "no-history",
      unrecorded: migrations,
      schemaMatchesAllMigrations: null,
    },
  );
});
