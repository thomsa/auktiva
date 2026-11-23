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
  ITEMS,
  MIGRATIONS_DIR,
  V1_23_MIGRATIONS,
  diagnoseTable,
  migrateLikeTurso,
  readUpgradeSql,
  seedV122Data,
  seededWonAt,
  v122Migrations,
  type MigrateRun,
} from "@/lib/testing/v1-22-upgrade-fixture";
import {
  runSqlStatements,
  splitSqlStatements,
  type SqlStatementResult,
} from "../../../scripts/upgrade/sql-file";

/**
 * Dry run of the v1.22.0 -> v1.23.0 production upgrade on libSQL (the
 * Turso driver): a database at the v1.22.0 schema with v1.22.0 data, the
 * pre-check, the migrations applied the way `npm run db:migrate:turso` does
 * (twice, to show the second run skips), then the v1.23.0 notifier through
 * the libSQL Prisma adapter. This is the recommended order: migrate, then
 * deploy v1.23.0 at once, so the v1.22.0 notifier never sees the migrated
 * data. winner-migration-window.test.ts covers the other orders.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-upgrade-"));
const dbUrl = `file:${path.join(tmpDir, "prod.db").replace(/\\/g, "/")}`;
const NOW = new Date();

let migrator: Client;
let prisma: PrismaClient;
let auctionEnd: typeof import("@/lib/services/auction-end.service");
let smtpStub: net.Server;
let beforeRows: Record<string, unknown>[];
let migratedRows: {
  id: string;
  highestBidderId: string | null;
  winnerNotified: boolean;
  winnerNotifiedUserId: string | null;
  winnerNotifiedAmount: number | null;
  winnerNotifiedAt: Date | null;
}[];
let precheck: SqlStatementResult[];
let firstRun: MigrateRun;
let secondRun: MigrateRun;
let notifierCounts: number[];

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

  // v1.22.0 production: its migrations applied and recorded, then its data.
  await migrateLikeTurso(migrator, v122Migrations());
  await seedV122Data(prisma, NOW);

  const seeded = await migrator.execute(`
    SELECT "i"."id", "i"."highestBidderId", "i"."winnerNotified",
      (SELECT "n"."userId" FROM "notifications" AS "n"
        WHERE "n"."itemId" = "i"."id" AND "n"."type" = 'AUCTION_WON') AS "toldUser",
      "i"."endDate" AS "itemEnd", "a"."endDate" AS "auctionEnd"
    FROM "auction_items" AS "i" JOIN "auctions" AS "a" ON "a"."id" = "i"."auctionId"
    ORDER BY "i"."id"`);
  beforeRows = seeded.rows.map((row) =>
    Object.fromEntries(seeded.columns.map((name, i) => [name, row[i]])),
  );

  precheck = await runSqlStatements(
    migrator,
    splitSqlStatements(readUpgradeSql("precheck.sql")),
    { readOnly: true },
  );
  firstRun = await migrateLikeTurso(migrator);
  secondRun = await migrateLikeTurso(migrator);
  migratedRows = await prisma.auctionItem.findMany({
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

  // v1.23.0 is live: notification polls run the notifier.
  auctionEnd = await import("@/lib/services/auction-end.service");
  notifierCounts = [
    await auctionEnd.processEndedItems(),
    await auctionEnd.processEndedItems(),
  ];
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

/** Expected record after the migrations, before any notifier run. */
type Migrated = {
  winnerNotified: boolean;
  winnerNotifiedUserId: string | null;
  winnerNotifiedAmount: number | null;
  /** True when winnerNotifiedAt is the seeded AUCTION_WON time. */
  atFromWon: boolean;
};

const MIGRATED: Record<string, Migrated> = {
  // Re-queued: Alice stays recorded, Bob is notified by the new notifier.
  "charity-follow": rec(false, "alice", null, true),
  "charity-own": rec(false, "alice", null, true),
  "running-follow": rec(false, "alice", null, true),
  "recent-ms-follow-changed": rec(false, "alice", null, true),
  "edge-13d": rec(false, "alice", null, true),
  // Unchanged winner keeps the notification time and amount.
  "charity-same": rec(true, "alice", 60, true),
  // Marked by 20261122170000, then recorded as the highest bidder.
  "charity-new-follow": rec(true, "carol", 40, false),
  "old-follow-unnotified": rec(true, "carol", 20, false),
  // Winner changed more than 14 days ago: recorded, not re-queued.
  "old-follow-changed": rec(true, "bob", 50, false),
  "old-own-changed": rec(true, "bob", 55, false),
  "old-ms-follow-changed": rec(true, "bob", 45, false),
  "edge-15d": rec(true, "bob", 25, false),
  // Won notification deleted: the highest bidder, no time.
  "old-deleted": rec(true, "dave", 90, false),
  "old-no-bidder": rec(true, null, null, false),
  // Pending items are left alone.
  "running-pending": rec(false, null, null, false),
  "own-pending-ended": rec(false, null, null, false),
  "own-running": rec(false, null, null, false),
};

function rec(
  winnerNotified: boolean,
  winnerNotifiedUserId: string | null,
  winnerNotifiedAmount: number | null,
  atFromWon: boolean,
): Migrated {
  return { winnerNotified, winnerNotifiedUserId, winnerNotifiedAmount, atFromWon };
}

/** Messages the v1.23.0 notifier sends right after the deploy. */
const NOTIFIED_AFTER_DEPLOY = [
  "charity-follow:bob",
  "charity-own:bob",
  "edge-13d:bob",
  "own-pending-ended:carol",
  "recent-ms-follow-changed:bob",
];

test("the pre-check predicts what the upgrade does", (t) => {
  const [summary, details] = precheck;
  diagnoseTable(t, "v1.22.0 data before the upgrade", beforeRows);
  diagnoseTable(t, "pre-check summary", summary.rows);
  diagnoseTable(t, "pre-check details", details.rows);
  assert.deepEqual(
    summary.rows.map((row) => ({ ...row })),
    [
      { outcome: "marked_notified_follows_ended_auction", items: 2, notifyAfterDeploy: 0, recordedAfterDeploy: 0 },
      { outcome: "notified_winner_unchanged", items: 3, notifyAfterDeploy: 0, recordedAfterDeploy: 0 },
      { outcome: "pending", items: 3, notifyAfterDeploy: 1, recordedAfterDeploy: 0 },
      { outcome: "winner_changed_recorded_over_14_days", items: 4, notifyAfterDeploy: 0, recordedAfterDeploy: 0 },
      { outcome: "winner_changed_requeued_ended", items: 4, notifyAfterDeploy: 4, recordedAfterDeploy: 0 },
      { outcome: "winner_changed_requeued_open", items: 1, notifyAfterDeploy: 0, recordedAfterDeploy: 0 },
    ],
  );
  const notifyIds = details.rows
    .filter(
      (row) =>
        row.outcome === "winner_changed_requeued_ended" ||
        row.outcome === "pending",
    )
    .map((row) => `${row.itemId}:${row.highestBidderId}`)
    .sort();
  assert.deepEqual(notifyIds, NOTIFIED_AFTER_DEPLOY);
});

test("the first migration run applies only the two v1.23.0 migrations", (t) => {
  t.diagnostic(`first run applied: ${firstRun.applied.join(", ")}`);
  assert.deepEqual(firstRun.applied, V1_23_MIGRATIONS);
  assert.deepEqual(firstRun.skipped, v122Migrations());
});

test("a second migration run skips everything", (t) => {
  t.diagnostic(
    `second run applied: ${secondRun.applied.length}, skipped: ${secondRun.skipped.length}`,
  );
  assert.deepEqual(secondRun.applied, []);
  assert.deepEqual(secondRun.skipped, [
    ...v122Migrations(),
    ...V1_23_MIGRATIONS,
  ]);
});

test("the migrations leave each item with the expected winner record and pending flag", (t) => {
  diagnoseTable(t, "after the migrations, before the v1.23.0 notifier", migratedRows);
  assert.deepEqual(
    migratedRows.map((row) => row.id).sort(),
    ITEMS.map((item) => item.id).sort(),
  );
  for (const row of migratedRows) {
    const item = ITEMS.find((seed) => seed.id === row.id)!;
    const expected = MIGRATED[row.id];
    assert.deepEqual(
      {
        winnerNotified: row.winnerNotified,
        winnerNotifiedUserId: row.winnerNotifiedUserId,
        winnerNotifiedAmount: row.winnerNotifiedAmount,
        winnerNotifiedAt: row.winnerNotifiedAt,
      },
      {
        winnerNotified: expected.winnerNotified,
        winnerNotifiedUserId: expected.winnerNotifiedUserId,
        winnerNotifiedAmount: expected.winnerNotifiedAmount,
        winnerNotifiedAt: expected.atFromWon ? seededWonAt(item, NOW) : null,
      },
      row.id,
    );
  }
});

test("the v1.23.0 notifier messages only the re-queued recent winners and the pending item", async (t) => {
  const won = await prisma.notification.findMany({
    where: { type: "AUCTION_WON", createdAt: { gte: NOW } },
    select: { itemId: true, userId: true },
  });
  const sent = won.map((n) => `${n.itemId}:${n.userId}`).sort();
  const emails = await prisma.emailLog.findMany({
    where: { type: "ITEM_WON" },
    select: { toEmail: true, metadata: true },
  });
  t.diagnostic(`notifier runs returned ${notifierCounts.join(", ")}`);
  t.diagnostic(`AUCTION_WON sent: ${sent.join(", ")}`);
  t.diagnostic(
    `ITEM_WON e-mails: ${emails
      .map((e) => `${(JSON.parse(e.metadata!) as { itemId: string }).itemId}:${e.toEmail}`)
      .sort()
      .join(", ")}`,
  );
  assert.deepEqual(notifierCounts, [NOTIFIED_AFTER_DEPLOY.length, 0]);
  assert.deepEqual(sent, NOTIFIED_AFTER_DEPLOY);
  // Only Bob opted into item-won e-mails.
  assert.deepEqual(
    emails
      .map((e) => (JSON.parse(e.metadata!) as { itemId: string }).itemId)
      .sort(),
    NOTIFIED_AFTER_DEPLOY.filter((id) => id.endsWith(":bob"))
      .map((id) => id.split(":")[0])
      .sort(),
  );

  // The claimed items record the user who was just told.
  for (const id of NOTIFIED_AFTER_DEPLOY) {
    const [itemId, userId] = id.split(":");
    const row = await prisma.auctionItem.findUniqueOrThrow({
      where: { id: itemId },
    });
    assert.equal(row.winnerNotified, true, itemId);
    assert.equal(row.winnerNotifiedUserId, userId, itemId);
    assert.equal(row.winnerNotifiedAmount, row.currentBid, itemId);
  }

  // Every other item is exactly as the migrations left it: nothing was
  // recorded silently and no stale item was touched.
  const claimed = new Set(NOTIFIED_AFTER_DEPLOY.map((id) => id.split(":")[0]));
  const after = await prisma.auctionItem.findMany({
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
  diagnoseTable(t, "after two v1.23.0 notifier runs", after);
  assert.deepEqual(
    after.filter((row) => !claimed.has(row.id)),
    migratedRows.filter((row) => !claimed.has(row.id)),
  );
});

test("after the deploy the verify checks pass and the repair changes nothing", async (t) => {
  const repair = await runSqlStatements(
    migrator,
    splitSqlStatements(readUpgradeSql("repair.sql")),
  );
  assert.deepEqual(
    repair.map((result) => result.rowsAffected),
    [0, 0, 0, 0, 0],
  );

  const [columns, checks] = await runSqlStatements(
    migrator,
    splitSqlStatements(readUpgradeSql("verify.sql")),
    { readOnly: true },
  );
  diagnoseTable(t, "verify.sql", columns.rows);
  diagnoseTable(t, "verify.sql checks", checks.rows);
  assert.equal(columns.rows[0].winnerRecordColumns, 3);
  for (const row of checks.rows) {
    assert.equal(row.items, row.expected, String(row.check));
  }
});

test("the open re-queued item notifies Bob once the extended auction ends", async () => {
  await prisma.auction.update({
    where: { id: "charity-running" },
    data: { endDate: new Date(Date.now() - 1000) },
  });
  assert.equal(await auctionEnd.processEndedItems(), 2);
  const won = await prisma.notification.findMany({
    where: { itemId: { in: ["running-follow", "running-pending"] }, type: "AUCTION_WON" },
    select: { itemId: true, userId: true },
    orderBy: { itemId: "asc" },
  });
  assert.deepEqual(
    won.map((n) => `${n.itemId}:${n.userId}`),
    ["running-follow:alice", "running-follow:bob", "running-pending:carol"],
  );
});

test("backfill.sql holds exactly the data statements of the two migrations", () => {
  const dataStatements = V1_23_MIGRATIONS.flatMap((name) =>
    splitSqlStatements(
      fs.readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf-8"),
    ),
  ).filter((sql) => !/^ALTER TABLE/i.test(sql));
  assert.equal(dataStatements.length, 5);
  assert.deepEqual(
    splitSqlStatements(readUpgradeSql("backfill.sql")),
    dataStatements,
  );
});

test("repair.sql repeats the migration's amount, stale-record and re-queue steps unchanged", () => {
  const migration = splitSqlStatements(
    fs.readFileSync(
      path.join(MIGRATIONS_DIR, V1_23_MIGRATIONS[1], "migration.sql"),
      "utf-8",
    ),
  );
  const repair = splitSqlStatements(readUpgradeSql("repair.sql"));
  assert.equal(repair.length, 5);
  assert.deepEqual(repair.slice(2), migration.slice(-3));
});
