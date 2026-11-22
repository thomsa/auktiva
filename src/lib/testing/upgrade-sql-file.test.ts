import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import {
  runSqlStatements,
  splitSqlStatements,
} from "../../../scripts/upgrade/sql-file";

/**
 * scripts/upgrade/sql-file.ts, used by scripts/upgrade/run-sql.ts: a file
 * applies in full or not at all, whatever its statements look like.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-sql-file-"));
let client: Client;

before(async () => {
  client = createClient({
    url: `file:${path.join(tmpDir, "test.db").replace(/\\/g, "/")}`,
  });
  await client.execute(`CREATE TABLE "t" ("id" INTEGER PRIMARY KEY, "v" INTEGER)`);
});

after(() => {
  client?.close();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // Windows keeps local libSQL files open after close().
    if ((err as NodeJS.ErrnoException).code !== "EBUSY") throw err;
  }
});

async function reset() {
  await client.execute(`DELETE FROM "t"`);
  await client.execute(`INSERT INTO "t" ("id", "v") VALUES (1, 0)`);
  await client.execute("PRAGMA user_version = 0");
}

async function state() {
  const row = (await client.execute(`SELECT "v" FROM "t" WHERE "id" = 1`)).rows[0];
  const version = (await client.execute("PRAGMA user_version")).rows[0];
  return { v: Number(row.v), userVersion: Number(version.user_version) };
}

const WRITES_THAT_LOOK_READ_ONLY = `
-- A CTE update and a write pragma start like reads.
WITH "x" AS (SELECT 2 AS "v")
UPDATE "t" SET "v" = (SELECT "v" FROM "x") WHERE "id" = 1;

PRAGMA user_version = 7;

SELECT "v" FROM "t";
`;

test("splits on line-ending semicolons and drops comment lines", () => {
  assert.deepEqual(splitSqlStatements(WRITES_THAT_LOOK_READ_ONLY), [
    `WITH "x" AS (SELECT 2 AS "v")\nUPDATE "t" SET "v" = (SELECT "v" FROM "x") WHERE "id" = 1`,
    "PRAGMA user_version = 7",
    `SELECT "v" FROM "t"`,
  ]);
});

test("writes that start like reads are committed", async () => {
  await reset();
  const results = await runSqlStatements(
    client,
    splitSqlStatements(WRITES_THAT_LOOK_READ_ONLY),
  );
  assert.equal(results[0].rowsAffected, 1);
  assert.deepEqual(results[2].rows, [{ v: 2 }]);
  assert.deepEqual(await state(), { v: 2, userVersion: 7 });
});

test("a dry run reports the effect and rolls it back", async () => {
  await reset();
  const results = await runSqlStatements(
    client,
    splitSqlStatements(WRITES_THAT_LOOK_READ_ONLY),
    { dryRun: true },
  );
  assert.equal(results[0].rowsAffected, 1);
  assert.deepEqual(results[2].rows, [{ v: 2 }]);
  assert.deepEqual(await state(), { v: 0, userVersion: 0 });
});

test("a failing statement rolls back the statements before it", async () => {
  await reset();
  await assert.rejects(
    runSqlStatements(client, [
      `UPDATE "t" SET "v" = 5 WHERE "id" = 1`,
      `UPDATE "missing" SET "v" = 1`,
    ]),
    /no such table: missing/,
  );
  assert.deepEqual(await state(), { v: 0, userVersion: 0 });
});
