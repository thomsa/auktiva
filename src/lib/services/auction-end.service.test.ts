import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { applyMigrations } from "@/lib/testing/apply-migrations";

/**
 * Runs the auction-end notifier against a throwaway SQLite database built
 * from the checked-in migrations, so the Prisma query is exercised for real.
 * E-mail goes to a local SMTP stub that drops every connection, so
 * `sendEmail` writes its `EmailLog` row and then fails without leaving the
 * machine. Only users with `emailOnItemWon` enabled get a win e-mail.
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
let smtpStub: net.Server;

before(async () => {
  smtpStub = net.createServer((socket) => socket.destroy());
  await new Promise<void>((resolve) =>
    smtpStub.listen(0, "127.0.0.1", resolve),
  );
  const { port } = smtpStub.address() as net.AddressInfo;

  process.env.DATABASE_URL = `file:${dbFile.replace(/\\/g, "/")}`;
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(port);
  delete process.env.SMTP_USER;
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
  await new Promise<void>((resolve) => smtpStub.close(() => resolve()));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** ITEM_WON e-mails logged for an item, as sorted recipient addresses. */
async function wonEmailsFor(itemId: string) {
  const emails = await services.prisma.emailLog.findMany({
    where: { type: "ITEM_WON" },
    select: { toEmail: true, metadata: true },
  });
  return emails
    .filter(
      (email) =>
        email.metadata !== null &&
        (JSON.parse(email.metadata) as { itemId?: string }).itemId === itemId,
    )
    .map((email) => email.toEmail)
    .sort();
}

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

test("overlapping processEndedItems runs notify each winner once", async () => {
  const { prisma, auctionEnd } = services;
  // The winner opted into win e-mails, so each claim also sends one.
  await prisma.userSettings.create({
    data: { userId: "winner", emailOnItemWon: true },
  });
  await prisma.auctionItem.createMany({
    data: ["race-1", "race-2", "race-3"].map((id) => ({
      id,
      name: id,
      auctionId: "ended",
      currencyCode: "EUR",
      creatorId: "owner",
      currentBid: 10,
      highestBidderId: "winner",
      isPublished: true,
    })),
  });

  const counts = await Promise.all([
    auctionEnd.processEndedItems(),
    auctionEnd.processEndedItems(),
    auctionEnd.processEndedItems(),
  ]);
  assert.equal(
    counts.reduce((sum, count) => sum + count, 0),
    3,
  );

  const notifications = await prisma.notification.groupBy({
    by: ["itemId"],
    where: { itemId: { in: ["race-1", "race-2", "race-3"] } },
    _count: { _all: true },
    orderBy: { itemId: "asc" },
  });
  assert.deepEqual(
    notifications.map((n) => [n.itemId, n._count._all]),
    [
      ["race-1", 1],
      ["race-2", 1],
      ["race-3", 1],
    ],
  );

  // At most one win e-mail per item: exactly one, as the winner opted in.
  for (const itemId of ["race-1", "race-2", "race-3"]) {
    assert.deepEqual(
      await wonEmailsFor(itemId),
      ["winner@example.test"],
      itemId,
    );
  }

  const records = await prisma.auctionItem.findMany({
    where: { id: { in: ["race-1", "race-2", "race-3"] } },
    select: {
      winnerNotified: true,
      winnerNotifiedUserId: true,
      winnerNotifiedAmount: true,
      winnerNotifiedAt: true,
    },
  });
  assert.equal(records.length, 3);
  for (const record of records) {
    assert.equal(record.winnerNotified, true);
    assert.equal(record.winnerNotifiedUserId, "winner");
    assert.equal(record.winnerNotifiedAmount, 10);
    assert.ok(record.winnerNotifiedAt instanceof Date);
  }
});

// ---------------------------------------------------------------------------
// Winner record, re-notification and stale guard. Each test seeds its own
// users, auctions and items under a unique prefix and only asserts on those,
// and leaves no ended item pending, so the tests do not depend on order.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);

async function seedUsers(...ids: string[]) {
  await services.prisma.user.createMany({
    data: ids.map((id) => ({ id, email: `${id}@example.test`, name: id })),
  });
}

async function seedAuction(id: string, endDate: Date | null) {
  await services.prisma.auction.create({
    data: { id, name: id, endDate, creatorId: "owner" },
  });
}

async function seedItem(
  id: string,
  auctionId: string,
  data: Partial<{
    highestBidderId: string | null;
    currentBid: number | null;
    endDate: Date | null;
    isPublished: boolean;
    winnerNotified: boolean;
    winnerNotifiedUserId: string | null;
    winnerNotifiedAmount: number | null;
    winnerNotifiedAt: Date | null;
  }> = {},
) {
  await services.prisma.auctionItem.create({
    data: {
      id,
      name: id,
      auctionId,
      currencyCode: "EUR",
      creatorId: "owner",
      currentBid: 10,
      isPublished: true,
      ...data,
    },
  });
}

/** AUCTION_WON notifications for an item, as sorted user IDs. */
async function wonBy(itemId: string) {
  const notifications = await services.prisma.notification.findMany({
    where: { itemId, type: "AUCTION_WON" },
    select: { userId: true },
  });
  return notifications.map((n) => n.userId).sort();
}

async function winnerRecord(itemId: string) {
  return services.prisma.auctionItem.findUniqueOrThrow({
    where: { id: itemId },
    select: {
      winnerNotified: true,
      winnerNotifiedUserId: true,
      winnerNotifiedAmount: true,
      winnerNotifiedAt: true,
    },
  });
}

test("the stale window is 14 days", () => {
  assert.equal(
    services.auctionEnd.STALE_WINNER_NOTIFICATION_MS,
    14 * 24 * 60 * 60 * 1000,
  );
});

test("Record written on notification: user, amount and time", async () => {
  const { auctionEnd } = services;
  await seedUsers("rec-a");
  await seedAuction("rec-auction", daysFromNow(-1));
  await seedItem("rec-item", "rec-auction", {
    highestBidderId: "rec-a",
    currentBid: 120,
  });

  const before = Date.now();
  await auctionEnd.processEndedItems();
  const after = Date.now();

  assert.deepEqual(await wonBy("rec-item"), ["rec-a"]);
  const rec = await winnerRecord("rec-item");
  assert.equal(rec.winnerNotified, true);
  assert.equal(rec.winnerNotifiedUserId, "rec-a");
  assert.equal(rec.winnerNotifiedAmount, 120);
  assert.ok(rec.winnerNotifiedAt);
  assert.ok(rec.winnerNotifiedAt.getTime() >= before);
  assert.ok(rec.winnerNotifiedAt.getTime() <= after);
});

test("Auction that ended long ago: record written, no notification", async () => {
  const { auctionEnd } = services;
  await seedUsers("stale-a", "stale-b");
  await seedAuction("stale-old-auction", daysFromNow(-20));
  await seedAuction("stale-running-auction", daysFromNow(1));
  // Follows an auction that ended 20 days ago.
  await seedItem("stale-follows", "stale-old-auction", {
    highestBidderId: "stale-a",
    currentBid: 30,
  });
  // Own end date 20 days ago.
  await seedItem("stale-own", "stale-running-auction", {
    highestBidderId: "stale-b",
    currentBid: 40,
    endDate: daysFromNow(-20),
  });

  await auctionEnd.processEndedItems();

  const expected = [
    ["stale-follows", "stale-a", 30],
    ["stale-own", "stale-b", 40],
  ] as const;
  for (const [itemId, userId, amount] of expected) {
    assert.deepEqual(await wonBy(itemId), [], itemId);
    const rec = await winnerRecord(itemId);
    assert.equal(rec.winnerNotified, true, itemId);
    assert.equal(rec.winnerNotifiedUserId, userId, itemId);
    assert.equal(rec.winnerNotifiedAmount, amount, itemId);
    assert.ok(rec.winnerNotifiedAt, itemId);
  }

  // Recorded items are not picked up again.
  await auctionEnd.processEndedItems();
  assert.deepEqual(await wonBy("stale-follows"), []);
  assert.deepEqual(await wonBy("stale-own"), []);
});

test("Recently ended item: notified, including items following the auction", async () => {
  const { auctionEnd } = services;
  await seedUsers("recent-a", "recent-b", "recent-c");
  await seedAuction("recent-auction", daysFromNow(-2));
  await seedAuction("recent-old-auction", daysFromNow(-20));
  // Follows an auction that ended 2 days ago.
  await seedItem("recent-follows", "recent-auction", {
    highestBidderId: "recent-a",
  });
  // Own end date 2 days ago.
  await seedItem("recent-own", "recent-auction", {
    highestBidderId: "recent-b",
    endDate: daysFromNow(-2),
  });
  // Own end date 2 days ago wins over an auction that ended 20 days ago.
  await seedItem("recent-own-in-old", "recent-old-auction", {
    highestBidderId: "recent-c",
    endDate: daysFromNow(-2),
  });

  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("recent-follows"), ["recent-a"]);
  assert.deepEqual(await wonBy("recent-own"), ["recent-b"]);
  assert.deepEqual(await wonBy("recent-own-in-old"), ["recent-c"]);
});

test("New winner after an extension: B is notified and recorded, A gets nothing", async () => {
  const { auctionEnd } = services;
  await seedUsers("ext-a", "ext-b");
  await seedAuction("ext-auction", daysFromNow(-1));
  const previousAt = daysFromNow(-3);
  // State after a reopen and a new highest bid by B, ended again.
  await seedItem("ext-item", "ext-auction", {
    highestBidderId: "ext-b",
    currentBid: 80,
    winnerNotified: false,
    winnerNotifiedUserId: "ext-a",
    winnerNotifiedAmount: 50,
    winnerNotifiedAt: previousAt,
  });

  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("ext-item"), ["ext-b"]);
  const rec = await winnerRecord("ext-item");
  assert.equal(rec.winnerNotified, true);
  assert.equal(rec.winnerNotifiedUserId, "ext-b");
  assert.equal(rec.winnerNotifiedAmount, 80);
  assert.ok(rec.winnerNotifiedAt);
  assert.ok(rec.winnerNotifiedAt.getTime() > previousAt.getTime());
});

test("Previous winner is not told they won again", async () => {
  const { prisma, auctionEnd } = services;
  await seedUsers("prev-a", "prev-b");
  await seedAuction("prev-auction", daysFromNow(-1));
  await seedItem("prev-item", "prev-auction", {
    highestBidderId: "prev-a",
    currentBid: 50,
  });

  // First close: A wins.
  await auctionEnd.processEndedItems();
  assert.deepEqual(await wonBy("prev-item"), ["prev-a"]);

  // Reopen (pending flag reset), B outbids A, and the item ends again.
  await prisma.auctionItem.update({
    where: { id: "prev-item" },
    data: { winnerNotified: false, highestBidderId: "prev-b", currentBid: 60 },
  });
  await auctionEnd.processEndedItems();

  // A still has only the original notification; B has one.
  assert.deepEqual(await wonBy("prev-item"), ["prev-a", "prev-b"]);
  assert.equal(
    (await winnerRecord("prev-item")).winnerNotifiedUserId,
    "prev-b",
  );
});

test("Same winner after a reopen is notified again", async () => {
  const { prisma, auctionEnd } = services;
  await seedUsers("same-a");
  await prisma.userSettings.create({
    data: { userId: "same-a", emailOnItemWon: true },
  });
  await seedAuction("same-auction", daysFromNow(-1));
  await seedItem("same-item", "same-auction", {
    highestBidderId: "same-a",
    currentBid: 70,
  });

  await auctionEnd.processEndedItems();
  const first = await winnerRecord("same-item");
  assert.deepEqual(await wonBy("same-item"), ["same-a"]);
  assert.deepEqual(await wonEmailsFor("same-item"), ["same-a@example.test"]);

  // Reopen resets the pending flag and keeps the record; nobody outbids A.
  await prisma.auctionItem.update({
    where: { id: "same-item" },
    data: { winnerNotified: false },
  });
  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("same-item"), ["same-a", "same-a"]);
  // The opted-in win e-mail is sent again too, confirming the final win.
  assert.deepEqual(await wonEmailsFor("same-item"), [
    "same-a@example.test",
    "same-a@example.test",
  ]);
  const second = await winnerRecord("same-item");
  assert.equal(second.winnerNotified, true);
  assert.equal(second.winnerNotifiedUserId, "same-a");
  assert.ok(first.winnerNotifiedAt && second.winnerNotifiedAt);
  assert.ok(
    second.winnerNotifiedAt.getTime() >= first.winnerNotifiedAt.getTime(),
  );
});

test("E-mail disabled: in-app win notification, no win e-mail", async () => {
  const { prisma, auctionEnd } = services;
  // One winner turned item-won e-mails off; the other never changed the
  // setting, which defaults to off.
  await seedUsers("mailoff-a", "mailoff-b");
  await prisma.userSettings.create({
    data: { userId: "mailoff-a", emailOnItemWon: false },
  });
  await seedAuction("mailoff-auction", daysFromNow(-1));
  await seedItem("mailoff-explicit", "mailoff-auction", {
    highestBidderId: "mailoff-a",
  });
  await seedItem("mailoff-default", "mailoff-auction", {
    highestBidderId: "mailoff-b",
  });

  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("mailoff-explicit"), ["mailoff-a"]);
  assert.deepEqual(await wonBy("mailoff-default"), ["mailoff-b"]);
  assert.deepEqual(await wonEmailsFor("mailoff-explicit"), []);
  assert.deepEqual(await wonEmailsFor("mailoff-default"), []);
  assert.equal(
    await prisma.emailLog.count({
      where: {
        toEmail: { in: ["mailoff-a@example.test", "mailoff-b@example.test"] },
      },
    }),
    0,
  );
});

test("Repeated runs after notification send nothing more", async () => {
  const { auctionEnd } = services;
  await seedUsers("rep-a");
  await seedAuction("rep-auction", daysFromNow(-1));
  await seedItem("rep-item", "rep-auction", { highestBidderId: "rep-a" });

  await auctionEnd.processEndedItems();
  const first = await winnerRecord("rep-item");
  await auctionEnd.processEndedItems();
  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("rep-item"), ["rep-a"]);
  assert.deepEqual(await winnerRecord("rep-item"), first);
});

test("Draft item: no notification and no record", async () => {
  const { auctionEnd } = services;
  await seedUsers("draft-a");
  await seedAuction("draft-auction", daysFromNow(-1));
  await seedItem("draft-item", "draft-auction", {
    highestBidderId: "draft-a",
    endDate: daysFromNow(-1),
    isPublished: false,
  });

  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("draft-item"), []);
  const rec = await winnerRecord("draft-item");
  assert.equal(rec.winnerNotified, false);
  assert.equal(rec.winnerNotifiedUserId, null);
});

test("Item in an auction without an end date: no notification", async () => {
  const { auctionEnd } = services;
  await seedUsers("noend-a");
  await seedAuction("noend-auction", null);
  await seedItem("noend-item", "noend-auction", {
    highestBidderId: "noend-a",
  });

  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("noend-item"), []);
  const rec = await winnerRecord("noend-item");
  assert.equal(rec.winnerNotified, false);
  assert.equal(rec.winnerNotifiedUserId, null);
});

test("Reopened item that is still open: no notification, record kept", async () => {
  const { auctionEnd } = services;
  await seedUsers("open-a");
  await seedAuction("open-auction", daysFromNow(1));
  const previous = {
    winnerNotified: false,
    winnerNotifiedUserId: "open-a",
    winnerNotifiedAmount: 25,
    winnerNotifiedAt: daysFromNow(-2),
  };
  // Follows the extended auction, and one with its own future end.
  await seedItem("open-follows", "open-auction", {
    highestBidderId: "open-a",
    ...previous,
  });
  await seedItem("open-own", "open-auction", {
    highestBidderId: "open-a",
    endDate: daysFromNow(1),
    ...previous,
  });

  await auctionEnd.processEndedItems();

  for (const itemId of ["open-follows", "open-own"]) {
    assert.deepEqual(await wonBy(itemId), [], itemId);
    assert.deepEqual(await winnerRecord(itemId), previous, itemId);
  }
});

test("a claim whose highest-bidder snapshot is outdated does not claim", async () => {
  const { auctionEnd } = services;
  await seedUsers("snap-a", "snap-b");
  await seedAuction("snap-auction", daysFromNow(-1));
  // A run read A as the winner, then B became the highest bidder.
  await seedItem("snap-item", "snap-auction", {
    highestBidderId: "snap-b",
    currentBid: 90,
  });

  const now = new Date();
  assert.equal(
    await auctionEnd.claimWinnerNotification(
      { id: "snap-item", highestBidderId: "snap-a", currentBid: 80 },
      now,
    ),
    false,
  );
  const untouched = await winnerRecord("snap-item");
  assert.equal(untouched.winnerNotified, false);
  assert.equal(untouched.winnerNotifiedUserId, null);

  // The current snapshot claims once, and a second claim fails.
  const snapshot = {
    id: "snap-item",
    highestBidderId: "snap-b",
    currentBid: 90,
  };
  assert.equal(await auctionEnd.claimWinnerNotification(snapshot, now), true);
  assert.equal(await auctionEnd.claimWinnerNotification(snapshot, now), false);
  assert.deepEqual(await winnerRecord("snap-item"), {
    winnerNotified: true,
    winnerNotifiedUserId: "snap-b",
    winnerNotifiedAmount: 90,
    winnerNotifiedAt: now,
  });
  // Claimed directly, so no message was sent.
  assert.deepEqual(await wonBy("snap-item"), []);
});

test("a failed in-app notification releases the claim and restores the record", async () => {
  const { prisma, auctionEnd } = services;
  await seedUsers("rel-a", "rel-b");
  await seedAuction("rel-auction", daysFromNow(-1));
  const previous = {
    winnerNotified: false,
    winnerNotifiedUserId: "rel-a",
    winnerNotifiedAmount: 50,
    winnerNotifiedAt: daysFromNow(-3),
  };
  await seedItem("rel-item", "rel-auction", {
    highestBidderId: "rel-b",
    currentBid: 75,
    ...previous,
  });

  // Make creating the in-app notification for this item fail.
  await prisma.$executeRawUnsafe(
    "CREATE TRIGGER fail_rel_item_notification BEFORE INSERT ON notifications " +
      "WHEN NEW.itemId = 'rel-item' " +
      "BEGIN SELECT RAISE(ABORT, 'notification insert failed'); END",
  );
  try {
    await auctionEnd.processEndedItems();
    assert.deepEqual(await wonBy("rel-item"), []);
    assert.deepEqual(await winnerRecord("rel-item"), previous);
  } finally {
    await prisma.$executeRawUnsafe(
      "DROP TRIGGER IF EXISTS fail_rel_item_notification",
    );
  }

  // A later run retries and notifies the winner.
  await auctionEnd.processEndedItems();
  assert.deepEqual(await wonBy("rel-item"), ["rel-b"]);
  assert.equal((await winnerRecord("rel-item")).winnerNotifiedUserId, "rel-b");
});

test("an item reopened after the notifier read it is not claimed, and the next winner is notified", async () => {
  const { prisma, auctionEnd } = services;
  const reopen = await import("@/lib/services/auction-reopen.service");
  await seedUsers("race-a", "race-b");
  await seedAuction("race-auction", daysFromNow(-1));
  await seedItem("race-item", "race-auction", {
    highestBidderId: "race-a",
    currentBid: 10,
  });
  await prisma.bid.create({
    data: { auctionItemId: "race-item", userId: "race-a", amount: 10 },
  });

  // A notifier run reads the item as pending with A as the winner...
  const candidates = await prisma.auctionItem.findMany({
    where: {
      ...auctionEnd.endedItemsAwaitingNotificationWhere(new Date()),
      id: "race-item",
    },
  });
  assert.equal(candidates.length, 1);

  // ...then the owner reopens bidding before the run claims it.
  const reopened = await reopen.reopenBidding({
    auctionId: "race-auction",
    actorId: "owner",
    endDate: daysFromNow(1),
    itemIds: [],
  });
  assert.equal(reopened.reopenedCount, 1);

  // The run's claim fails, so A is not told they won an open item.
  assert.equal(
    await auctionEnd.claimWinnerNotification(
      { id: "race-item", highestBidderId: "race-a", currentBid: 10 },
      new Date(),
    ),
    false,
  );
  assert.deepEqual(await wonBy("race-item"), []);
  const pending = await winnerRecord("race-item");
  assert.equal(pending.winnerNotified, false);
  assert.equal(pending.winnerNotifiedUserId, null);

  // B outbids A and the auction ends again: B is notified and recorded.
  await prisma.bid.create({
    data: { auctionItemId: "race-item", userId: "race-b", amount: 20 },
  });
  await prisma.auctionItem.update({
    where: { id: "race-item" },
    data: { highestBidderId: "race-b", currentBid: 20 },
  });
  await prisma.auction.update({
    where: { id: "race-auction" },
    data: { endDate: new Date(Date.now() - 1000) },
  });
  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("race-item"), ["race-b"]);
  const rec = await winnerRecord("race-item");
  assert.equal(rec.winnerNotified, true);
  assert.equal(rec.winnerNotifiedUserId, "race-b");
  assert.equal(rec.winnerNotifiedAmount, 20);
});

test("a failure after the won notification was inserted keeps the claim", async () => {
  const { prisma, auctionEnd } = services;
  await seedUsers("kept-a");
  await seedAuction("kept-auction", daysFromNow(-1));
  await seedItem("kept-item", "kept-auction", {
    highestBidderId: "kept-a",
    currentBid: 35,
  });

  // Simulate a notification that is stored but whose create call still
  // throws: the trigger stores a copy of the row and drops the original
  // insert, so Prisma gets no row back and rejects.
  await prisma.$executeRawUnsafe(
    "CREATE TRIGGER store_then_fail_kept_item BEFORE INSERT ON notifications " +
      "WHEN NEW.itemId = 'kept-item' AND NEW.id NOT LIKE 'stored-%' " +
      "BEGIN " +
      'INSERT INTO notifications ("id", "userId", "type", "title", "message", ' +
      '"imageUrl", "auctionId", "itemId", "read", "createdAt") ' +
      "VALUES ('stored-' || NEW.id, NEW.userId, NEW.type, NEW.title, " +
      "NEW.message, NEW.imageUrl, NEW.auctionId, NEW.itemId, NEW.read, " +
      "NEW.createdAt); " +
      "SELECT RAISE(IGNORE); " +
      "END",
  );
  try {
    await auctionEnd.processEndedItems();
  } finally {
    await prisma.$executeRawUnsafe(
      "DROP TRIGGER IF EXISTS store_then_fail_kept_item",
    );
  }

  assert.deepEqual(await wonBy("kept-item"), ["kept-a"]);
  const rec = await winnerRecord("kept-item");
  assert.equal(rec.winnerNotified, true);
  assert.equal(rec.winnerNotifiedUserId, "kept-a");
  assert.equal(rec.winnerNotifiedAmount, 35);

  // A later run does not send a duplicate.
  await auctionEnd.processEndedItems();
  assert.deepEqual(await wonBy("kept-item"), ["kept-a"]);
});
