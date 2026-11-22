import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyMigrations } from "@/lib/testing/apply-migrations";

/**
 * Runs the auction-end notifier against a throwaway SQLite database built
 * from the checked-in migrations, so the Prisma query is exercised for real.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-auction-end-"));
const dbFile = path.join(tmpDir, "test.db");

const NOW = new Date();
const PAST = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
const FUTURE = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);

type Services = {
  prisma: typeof import("@/lib/prisma").prisma;
  auctionEnd: typeof import("@/lib/services/auction-end.service");
};
let services: Services;

before(async () => {
  process.env.DATABASE_URL = `file:${dbFile.replace(/\\/g, "/")}`;
  const { prisma } = await import("@/lib/prisma");
  const auctionEnd = await import("@/lib/services/auction-end.service");
  services = { prisma, auctionEnd };
  await applyMigrations(prisma);

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
      { id: "running", name: "Running", endDate: FUTURE, creatorId: "owner" },
      { id: "open", name: "No end", endDate: null, creatorId: "owner" },
    ],
  });

  const base = {
    currencyCode: "EUR",
    creatorId: "owner",
    currentBid: 10,
    highestBidderId: "winner",
    isPublished: true,
  };
  await prisma.auctionItem.createMany({
    data: [
      // Ends with the auction: the case this query used to miss.
      { ...base, id: "null-in-ended", name: "a", auctionId: "ended" },
      // Own past end date.
      {
        ...base,
        id: "own-past",
        name: "b",
        auctionId: "running",
        endDate: PAST,
      },
      // Own future end date (e.g. anti-snipe) wins over an ended auction.
      {
        ...base,
        id: "own-future-in-ended",
        name: "c",
        auctionId: "ended",
        endDate: FUTURE,
      },
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
      {
        ...base,
        id: "already-notified",
        name: "g",
        auctionId: "ended",
        winnerNotified: true,
      },
      {
        ...base,
        id: "draft",
        name: "h",
        auctionId: "ended",
        isPublished: false,
      },
    ],
  });
});

after(async () => {
  await services?.prisma.$disconnect();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("the ended-items query follows the auction end for null-dated items", async () => {
  const { prisma, auctionEnd } = services;
  const found = await prisma.auctionItem.findMany({
    where: auctionEnd.endedItemsAwaitingNotificationWhere(NOW),
    select: { id: true },
    orderBy: { id: "asc" },
  });

  assert.deepEqual(
    found.map((item) => item.id),
    ["null-in-ended", "own-past"],
  );
});

test("processEndedItems notifies winners of items that end with the auction", async () => {
  const { prisma, auctionEnd } = services;

  const processed = await auctionEnd.processEndedItems();
  assert.equal(processed, 2);

  const notified = await prisma.auctionItem.findMany({
    where: { winnerNotified: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  assert.deepEqual(
    notified.map((item) => item.id),
    ["already-notified", "null-in-ended", "own-past"],
  );

  const notifications = await prisma.notification.findMany({
    where: { userId: "winner", type: "AUCTION_WON" },
    select: { itemId: true },
    orderBy: { itemId: "asc" },
  });
  assert.deepEqual(
    notifications.map((n) => n.itemId),
    ["null-in-ended", "own-past"],
  );

  // A second run finds nothing left to notify.
  assert.equal(await auctionEnd.processEndedItems(), 0);
});
