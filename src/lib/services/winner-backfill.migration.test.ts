import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyMigrations, listMigrations } from "@/lib/testing/apply-migrations";

/**
 * The release that ends null-dated items with their auction must not notify
 * the winners of auctions that ended before it. A data migration marks those
 * winners as notified; this test runs it against a real SQLite database.
 */

const BACKFILL = "20261122170000_mark_past_null_dated_winners_notified";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-backfill-"));
const dbFile = path.join(tmpDir, "test.db");

const NOW = new Date();
const PAST = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
const FUTURE = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);

let prisma: typeof import("@/lib/prisma").prisma;
let auctionEnd: typeof import("@/lib/services/auction-end.service");

async function notifiedIds(): Promise<string[]> {
  const rows = await prisma.auctionItem.findMany({
    where: { winnerNotified: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return rows.map((row) => row.id);
}

before(async () => {
  process.env.DATABASE_URL = `file:${dbFile.replace(/\\/g, "/")}`;
  ({ prisma } = await import("@/lib/prisma"));
  auctionEnd = await import("@/lib/services/auction-end.service");

  const migrations = listMigrations();
  assert.equal(
    migrations.at(-1),
    BACKFILL,
    "the backfill must be the latest migration",
  );
  await applyMigrations(prisma, migrations.slice(0, -1));

  await prisma.currency.create({
    data: { code: "EUR", name: "Euro", symbol: "€" },
  });
  await prisma.user.createMany({
    data: [
      { id: "owner", email: "owner@example.test", name: "Owner" },
      { id: "winner", email: "winner@example.test", name: "Winner" },
    ],
  });
  await prisma.auction.createMany({
    data: [
      { id: "ended", name: "Ended", endDate: PAST, creatorId: "owner" },
      { id: "ended-z", name: "Ended Z", endDate: PAST, creatorId: "owner" },
      { id: "ended-ms", name: "Ended ms", endDate: PAST, creatorId: "owner" },
      { id: "running", name: "Running", endDate: FUTURE, creatorId: "owner" },
      { id: "open", name: "No end", endDate: null, creatorId: "owner" },
    ],
  });
  // Other date encodings an older database may hold.
  await prisma.$executeRawUnsafe(
    `UPDATE "auctions" SET "endDate" = '${PAST.toISOString()}' WHERE "id" = 'ended-z'`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "auctions" SET "endDate" = ${PAST.getTime()} WHERE "id" = 'ended-ms'`,
  );

  const base = {
    currencyCode: "EUR",
    creatorId: "owner",
    currentBid: 10,
    highestBidderId: "winner",
    isPublished: true,
  };
  await prisma.auctionItem.createMany({
    data: [
      { ...base, id: "null-in-ended", name: "a", auctionId: "ended" },
      { ...base, id: "null-in-ended-z", name: "b", auctionId: "ended-z" },
      { ...base, id: "null-in-ended-ms", name: "c", auctionId: "ended-ms" },
      { ...base, id: "null-in-running", name: "d", auctionId: "running" },
      { ...base, id: "null-in-open", name: "e", auctionId: "open" },
      {
        ...base,
        id: "no-bidder",
        name: "f",
        auctionId: "ended",
        highestBidderId: null,
        currentBid: null,
      },
      // Own past date: the old notifier already handles these, leave alone.
      {
        ...base,
        id: "own-past",
        name: "g",
        auctionId: "running",
        endDate: PAST,
      },
    ],
  });

  await applyMigrations(prisma, [BACKFILL]);
});

after(async () => {
  await prisma?.$disconnect();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("the backfill marks winners of null-dated items in ended auctions", async () => {
  assert.deepEqual(await notifiedIds(), [
    "null-in-ended",
    "null-in-ended-ms",
    "null-in-ended-z",
  ]);
});

test("after the backfill only items that still need it are notified", async () => {
  assert.equal(await auctionEnd.processEndedItems(), 1);
  assert.deepEqual(await notifiedIds(), [
    "null-in-ended",
    "null-in-ended-ms",
    "null-in-ended-z",
    "own-past",
  ]);

  const notifications = await prisma.notification.findMany({
    select: { itemId: true },
  });
  assert.deepEqual(
    notifications.map((n) => n.itemId),
    ["own-past"],
  );
});
