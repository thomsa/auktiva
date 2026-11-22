import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Runs the winner-notification backfill migration against a throwaway SQLite
 * database that holds data written before the upgrade, then checks the
 * recorded notified winner and pending flag for each case.
 */

const BACKFILL_MIGRATION = "20261122180000_add_winner_notification_record";

const tmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "auktiva-winner-backfill-"),
);
const dbFile = path.join(tmpDir, "test.db");
const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

const OLDER_WIN = new Date("2026-10-01T12:00:00.000Z");
const LATER_WIN = new Date("2026-10-05T08:30:00.000Z");
const LATEST_OTHER = new Date("2026-10-09T09:00:00.000Z");
const PAST_END = new Date("2026-09-30T18:00:00.000Z");

type Prisma = typeof import("@/lib/prisma").prisma;
let prisma: Prisma;

/** Splits a migration the same way the notifier test harness does. */
function migrationStatements(name: string): string[] {
  return fs
    .readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function applyMigration(name: string) {
  for (const statement of migrationStatements(name)) {
    await prisma.$executeRawUnsafe(statement);
  }
}

type ItemSeed = {
  id: string;
  highestBidderId: string | null;
  currentBid: number | null;
  winnerNotified: boolean;
};

/**
 * Inserts an item with raw SQL: the generated client already knows the new
 * columns, so a model write would fail before the migration adds them.
 */
async function insertItem(item: ItemSeed) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "auction_items"
      ("id", "auctionId", "name", "currencyCode", "currentBid",
       "highestBidderId", "isPublished", "endDate", "winnerNotified",
       "updatedAt", "creatorId")
     VALUES (?, 'ended', ?, 'EUR', ?, ?, 1, ?, ?, ?, 'owner')`,
    item.id,
    item.id,
    item.currentBid,
    item.highestBidderId,
    PAST_END.toISOString(),
    item.winnerNotified ? 1 : 0,
    PAST_END.toISOString(),
  );
}

async function wonNotification(
  id: string,
  userId: string,
  itemId: string,
  createdAt: Date,
  type: "AUCTION_WON" | "OUTBID" = "AUCTION_WON",
) {
  await prisma.notification.create({
    data: {
      id,
      userId,
      itemId,
      auctionId: "ended",
      type,
      title: type === "AUCTION_WON" ? "Congratulations! You won!" : "Outbid",
      message: `${type} for ${itemId}`,
      createdAt,
    },
  });
}

before(async () => {
  process.env.DATABASE_URL = `file:${dbFile.replace(/\\/g, "/")}`;
  ({ prisma } = await import("@/lib/prisma"));

  const earlierMigrations = fs
    .readdirSync(migrationsDir)
    .filter((name) =>
      fs.existsSync(path.join(migrationsDir, name, "migration.sql")),
    )
    .sort()
    .filter((name) => name < BACKFILL_MIGRATION);
  assert.ok(earlierMigrations.length > 0);
  for (const name of earlierMigrations) await applyMigration(name);

  // Tables the migration does not touch can use the generated client.
  await prisma.currency.create({
    data: { code: "EUR", name: "Euro", symbol: "€" },
  });
  await prisma.user.createMany({
    data: [
      { id: "owner", email: "owner@example.test", name: "Owner" },
      { id: "alice", email: "alice@example.test", name: "Alice" },
      { id: "bob", email: "bob@example.test", name: "Bob" },
    ],
  });
  await prisma.auction.create({
    data: { id: "ended", name: "Ended", endDate: PAST_END, creatorId: "owner" },
  });

  // Unchanged past auction: Alice was told and still holds the highest bid.
  await insertItem({
    id: "unchanged",
    highestBidderId: "alice",
    currentBid: 120,
    winnerNotified: true,
  });
  await wonNotification("n-unchanged", "alice", "unchanged", OLDER_WIN);

  // Auction extended before the upgrade: Alice was told, Bob now leads.
  await insertItem({
    id: "extended",
    highestBidderId: "bob",
    currentBid: 150,
    winnerNotified: true,
  });
  await wonNotification("n-extended", "alice", "extended", OLDER_WIN);

  // Won notification was deleted: nothing left to copy from.
  await insertItem({
    id: "deleted",
    highestBidderId: "bob",
    currentBid: 90,
    winnerNotified: true,
  });

  // Several won notifications: the latest one is the record, and other
  // notification types for the item are ignored.
  await insertItem({
    id: "renotified",
    highestBidderId: "bob",
    currentBid: 200,
    winnerNotified: true,
  });
  await wonNotification("n-renotified-a", "alice", "renotified", OLDER_WIN);
  await wonNotification("n-renotified-b", "bob", "renotified", LATER_WIN);
  await wonNotification(
    "n-renotified-outbid",
    "alice",
    "renotified",
    LATEST_OTHER,
    "OUTBID",
  );

  // Still pending: the backfill must leave it alone.
  await insertItem({
    id: "pending",
    highestBidderId: "alice",
    currentBid: 75,
    winnerNotified: false,
  });
  await wonNotification("n-pending", "alice", "pending", OLDER_WIN);

  // Marked as notified with no highest bidder: nobody to record or notify.
  await insertItem({
    id: "no-bidder",
    highestBidderId: null,
    currentBid: null,
    winnerNotified: true,
  });

  await applyMigration(BACKFILL_MIGRATION);
});

after(async () => {
  await prisma?.$disconnect();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function record(id: string) {
  return prisma.auctionItem.findUniqueOrThrow({
    where: { id },
    select: {
      winnerNotified: true,
      winnerNotifiedUserId: true,
      winnerNotifiedAmount: true,
      winnerNotifiedAt: true,
      highestBidderId: true,
      currentBid: true,
    },
  });
}

test("unchanged past auction keeps the notified winner and stays notified", async () => {
  assert.deepEqual(await record("unchanged"), {
    winnerNotified: true,
    winnerNotifiedUserId: "alice",
    winnerNotifiedAmount: 120,
    winnerNotifiedAt: OLDER_WIN,
    highestBidderId: "alice",
    currentBid: 120,
  });
});

test("auction extended before the upgrade becomes pending for the new winner", async () => {
  assert.deepEqual(await record("extended"), {
    winnerNotified: false,
    winnerNotifiedUserId: "alice",
    winnerNotifiedAmount: null,
    winnerNotifiedAt: OLDER_WIN,
    highestBidderId: "bob",
    currentBid: 150,
  });
});

test("deleted won notification records the current highest bidder", async () => {
  assert.deepEqual(await record("deleted"), {
    winnerNotified: true,
    winnerNotifiedUserId: "bob",
    winnerNotifiedAmount: 90,
    winnerNotifiedAt: null,
    highestBidderId: "bob",
    currentBid: 90,
  });
});

test("the latest won notification wins over older ones and other types", async () => {
  assert.deepEqual(await record("renotified"), {
    winnerNotified: true,
    winnerNotifiedUserId: "bob",
    winnerNotifiedAmount: 200,
    winnerNotifiedAt: LATER_WIN,
    highestBidderId: "bob",
    currentBid: 200,
  });
});

test("pending items are left untouched", async () => {
  assert.deepEqual(await record("pending"), {
    winnerNotified: false,
    winnerNotifiedUserId: null,
    winnerNotifiedAmount: null,
    winnerNotifiedAt: null,
    highestBidderId: "alice",
    currentBid: 75,
  });
});

test("notified items without a highest bidder stay notified with no record", async () => {
  assert.deepEqual(await record("no-bidder"), {
    winnerNotified: true,
    winnerNotifiedUserId: null,
    winnerNotifiedAmount: null,
    winnerNotifiedAt: null,
    highestBidderId: null,
    currentBid: null,
  });
});

test("the backfill only re-queues the item whose winner changed", async () => {
  const pending = await prisma.auctionItem.findMany({
    where: { winnerNotified: false },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  assert.deepEqual(
    pending.map((item) => item.id),
    ["extended", "pending"],
  );
});
