import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyMigrations,
  listMigrations,
} from "@/lib/testing/apply-migrations";

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

// Relative to now, because the migration treats items that ended more than
// 14 days before it runs differently.
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);
const OLDER_WIN = daysAgo(5);
const LATER_WIN = daysAgo(4);
const LATEST_OTHER = daysAgo(3);
const PAST_END = daysAgo(2);
const STALE_END = daysAgo(30);
const STALE_WIN = daysAgo(31);
const FUTURE_END = new Date(Date.now() + 2 * DAY_MS);

type Prisma = typeof import("@/lib/prisma").prisma;
let prisma: Prisma;

type ItemSeed = {
  id: string;
  auctionId?: string;
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
     VALUES (?, ?, ?, 'EUR', ?, ?, 1, NULL, ?, ?, 'owner')`,
    item.id,
    item.auctionId ?? "ended",
    item.id,
    item.currentBid,
    item.highestBidderId,
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
  auctionId = "ended",
) {
  await prisma.notification.create({
    data: {
      id,
      userId,
      itemId,
      auctionId,
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

  const migrations = listMigrations();
  assert.ok(migrations.includes(BACKFILL_MIGRATION), "migration missing");
  const earlierMigrations = migrations.filter(
    (name) => name < BACKFILL_MIGRATION,
  );
  assert.ok(earlierMigrations.length > 0);
  await applyMigrations(prisma, earlierMigrations);

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
  // Items follow their auction's end date (none of their own).
  await prisma.auction.createMany({
    data: [
      { id: "ended", name: "Ended", endDate: PAST_END, creatorId: "owner" },
      { id: "stale", name: "Stale", endDate: STALE_END, creatorId: "owner" },
      { id: "open", name: "Open", endDate: FUTURE_END, creatorId: "owner" },
    ],
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

  // Extended, but the auction ended more than 14 days ago: Bob is recorded
  // and nobody is messaged this late.
  await insertItem({
    id: "extended-stale",
    auctionId: "stale",
    highestBidderId: "bob",
    currentBid: 130,
    winnerNotified: true,
  });
  await wonNotification(
    "n-extended-stale",
    "alice",
    "extended-stale",
    STALE_WIN,
    "AUCTION_WON",
    "stale",
  );

  // Extended and still open: pending, so Bob is notified once it ends.
  await insertItem({
    id: "extended-open",
    auctionId: "open",
    highestBidderId: "bob",
    currentBid: 140,
    winnerNotified: true,
  });
  await wonNotification(
    "n-extended-open",
    "alice",
    "extended-open",
    OLDER_WIN,
    "AUCTION_WON",
    "open",
  );

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

  await applyMigrations(prisma, [BACKFILL_MIGRATION]);
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

test("auction extended before the upgrade that ended over 14 days ago records the new winner without re-queuing", async () => {
  assert.deepEqual(await record("extended-stale"), {
    winnerNotified: true,
    winnerNotifiedUserId: "bob",
    winnerNotifiedAmount: 130,
    winnerNotifiedAt: null,
    highestBidderId: "bob",
    currentBid: 130,
  });
});

test("auction extended before the upgrade and still open becomes pending", async () => {
  assert.deepEqual(await record("extended-open"), {
    winnerNotified: false,
    winnerNotifiedUserId: "alice",
    winnerNotifiedAmount: null,
    winnerNotifiedAt: OLDER_WIN,
    highestBidderId: "bob",
    currentBid: 140,
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

test("the backfill only re-queues the items whose winner changed recently or that are open", async () => {
  const pending = await prisma.auctionItem.findMany({
    where: { winnerNotified: false },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  assert.deepEqual(
    pending.map((item) => item.id),
    ["extended", "extended-open", "pending"],
  );
});
