import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import {
  diagnoseTable,
  migrateLikeTurso,
  readUpgradeSql,
  runV122Notifier,
  seedV122Data,
  v122Migrations,
} from "@/lib/testing/v1-22-upgrade-fixture";
import {
  runSqlStatements,
  splitSqlStatements,
} from "../../../scripts/upgrade/sql-file";

/**
 * The v1.22.0 -> v1.23.0 transition on libSQL when code and schema are out
 * of step, run as one sequence on one database:
 *
 * 1. v1.23.0 code before the migration (deploy first): it cannot read
 *    auction items at all.
 * 2. The migration, then v1.22.0 code still serving (the window between
 *    `npm run db:migrate:turso` and the v1.23.0 deploy, or a self-hosted
 *    rebuild): its notifier messages the right users but leaves the new
 *    winner records stale.
 * 3. scripts/upgrade/v1.23.0/repair.sql, then v1.23.0: records are fixed and
 *    nobody is messaged twice.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-window-"));
const dbUrl = `file:${path.join(tmpDir, "prod.db").replace(/\\/g, "/")}`;
const NOW = new Date();

let migrator: Client;
let prisma: PrismaClient;
let auctionEnd: typeof import("@/lib/services/auction-end.service");
let smtpStub: net.Server;

/** What the v1.22.0 notifier sends in the window. */
const SENT_IN_WINDOW = [
  "charity-own:bob",
  "edge-13d:bob",
  "own-pending-ended:carol",
];
/** What v1.23.0 sends after the window and the repair. */
const SENT_AFTER_DEPLOY = [
  "charity-follow:bob",
  "recent-ms-follow-changed:bob",
];

before(async () => {
  smtpStub = net.createServer((socket) => socket.destroy());
  await new Promise<void>((resolve) =>
    smtpStub.listen(0, "127.0.0.1", resolve),
  );
  process.env.DATABASE_URL = dbUrl;
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String((smtpStub.address() as net.AddressInfo).port);
  delete process.env.SMTP_USER;

  migrator = createClient({ url: dbUrl });
  prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: dbUrl }) });
  (globalThis as unknown as { prisma?: unknown }).prisma = prisma;
  auctionEnd = await import("@/lib/services/auction-end.service");

  await migrateLikeTurso(migrator, v122Migrations());
  await seedV122Data(prisma, NOW);
});

after(async () => {
  await prisma?.$disconnect();
  migrator?.close();
  await new Promise<void>((resolve) => smtpStub.close(() => resolve()));
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // Windows keeps local libSQL files open after close().
    if ((err as NodeJS.ErrnoException).code !== "EBUSY") throw err;
  }
});

async function wonSince(since: Date): Promise<string[]> {
  const rows = await prisma.notification.findMany({
    where: { type: "AUCTION_WON", createdAt: { gte: since } },
    select: { itemId: true, userId: true },
  });
  return rows.map((n) => `${n.itemId}:${n.userId}`).sort();
}

async function records(ids: string[]) {
  return prisma.auctionItem.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      highestBidderId: true,
      winnerNotified: true,
      winnerNotifiedUserId: true,
      winnerNotifiedAmount: true,
      winnerNotifiedAt: true,
    },
    orderBy: { id: "asc" },
  });
}

async function verifyChecks() {
  const [, checks] = await runSqlStatements(
    migrator,
    splitSqlStatements(readUpgradeSql("verify.sql")),
  );
  return Object.fromEntries(
    checks.rows.map((row) => [row.check as string, row.items as number]),
  );
}

test("deploy first: v1.23.0 code cannot read items on the v1.22.0 schema", async (t) => {
  const error = await prisma.auctionItem
    .findFirst({ where: { id: "charity-own" } })
    .then(
      () => null,
      (err: Error) => err,
    );
  assert.ok(error, "the item query should fail");
  t.diagnostic(`auctionItem.findFirst: ${error.message.split("\n").pop()}`);
  assert.match(error.message, /winnerNotified(UserId|Amount|At)/);

  // The notifier logs the error and sends nothing; the data is untouched.
  assert.equal(await auctionEnd.processEndedItems(), 0);
  assert.deepEqual(await wonSince(NOW), []);
});

test("window: the v1.22.0 notifier on the migrated schema", async (t) => {
  const run = await migrateLikeTurso(migrator);
  assert.equal(run.applied.length, 2);

  const windowStart = new Date();
  const sent = await runV122Notifier(prisma);
  t.diagnostic(`v1.22.0 notifier sent: ${sent.join(", ")}`);
  // Only items with their own end date: items that follow the auction are
  // invisible to v1.22.0, and items ended over 14 days ago were not queued.
  assert.deepEqual(sent, SENT_IN_WINDOW);
  assert.deepEqual(await wonSince(windowStart), SENT_IN_WINDOW);
  assert.deepEqual(await runV122Notifier(prisma), []);

  const rows = await records(SENT_IN_WINDOW.map((id) => id.split(":")[0]));
  diagnoseTable(t, "records after the window", rows);
  // The right users were told, but the records still name Alice (or no
  // one), so a later reopen would tell the wrong user.
  assert.deepEqual(
    rows.map((row) => [row.id, row.winnerNotified, row.winnerNotifiedUserId]),
    [
      ["charity-own", true, "alice"],
      ["edge-13d", true, "alice"],
      ["own-pending-ended", true, null],
    ],
  );
  const checks = await verifyChecks();
  t.diagnostic(`verify before repair: ${JSON.stringify(checks)}`);
  assert.equal(checks.notified_without_record, 1);
  assert.equal(checks.notified_record_not_highest_bidder, 2);
});

test("repair: records the users the v1.22.0 notifier told, and is idempotent", async (t) => {
  const statements = splitSqlStatements(readUpgradeSql("repair.sql"));
  const [first] = await runSqlStatements(migrator, statements);
  const [second] = await runSqlStatements(migrator, statements);
  t.diagnostic(
    `repair rows affected: first ${first.rowsAffected}, second ${second.rowsAffected}`,
  );
  assert.equal(first.rowsAffected, 3);
  assert.equal(second.rowsAffected, 0);

  const rows = await records(SENT_IN_WINDOW.map((id) => id.split(":")[0]));
  diagnoseTable(t, "records after the repair", rows);
  for (const row of rows) {
    const won = await prisma.notification.findFirstOrThrow({
      where: { itemId: row.id, type: "AUCTION_WON" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    assert.equal(row.winnerNotifiedUserId, row.highestBidderId, row.id);
    assert.equal(row.winnerNotifiedAt?.getTime(), won.createdAt.getTime());
  }
});

test("after the deploy: v1.23.0 sends the rest once and nobody twice", async (t) => {
  const deployedAt = new Date();
  assert.equal(await auctionEnd.processEndedItems(), SENT_AFTER_DEPLOY.length);
  assert.equal(await auctionEnd.processEndedItems(), 0);
  assert.deepEqual(await wonSince(deployedAt), SENT_AFTER_DEPLOY);

  const all = await wonSince(NOW);
  t.diagnostic(`all AUCTION_WON since the upgrade: ${all.join(", ")}`);
  assert.deepEqual(all, [...SENT_IN_WINDOW, ...SENT_AFTER_DEPLOY].sort());
  assert.equal(new Set(all).size, all.length);

  const checks = await verifyChecks();
  t.diagnostic(`verify after deploy: ${JSON.stringify(checks)}`);
  assert.deepEqual(checks, {
    notified_without_record: 0,
    notified_record_not_highest_bidder: 0,
    pending_ended_items: 0,
  });
});
