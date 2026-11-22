import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Runs the reopen service and the auction form's end date path against a
 * throwaway SQLite database built from the checked-in migrations. E-mail is
 * not configured, so only in-app notifications are written.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-reopen-"));
const dbFile = path.join(tmpDir, "test.db");

const DAY = 24 * 60 * 60 * 1000;
const fromNow = (ms: number) => new Date(Date.now() + ms);

type Services = {
  prisma: typeof import("@/lib/prisma").prisma;
  reopen: typeof import("@/lib/services/auction-reopen.service");
  auctions: typeof import("@/lib/services/auction.service");
  errors: typeof import("@/lib/api/errors");
  helpers: typeof import("@/utils/auction-helpers");
};
let services: Services;

/** Applies every checked-in migration, one statement at a time. */
async function applyMigrations(prisma: Services["prisma"]) {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  for (const name of fs.readdirSync(migrationsDir).sort()) {
    const sqlFile = path.join(migrationsDir, name, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;
    const statements = fs
      .readFileSync(sqlFile, "utf8")
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(/;\s*(?:\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
  }
}

before(async () => {
  process.env.DATABASE_URL = `file:${dbFile.replace(/\\/g, "/")}`;
  delete process.env.EMAIL_PROVIDER;
  delete process.env.BREVO_API_KEY;
  const { prisma } = await import("@/lib/prisma");
  services = {
    prisma,
    reopen: await import("@/lib/services/auction-reopen.service"),
    auctions: await import("@/lib/services/auction.service"),
    errors: await import("@/lib/api/errors"),
    helpers: await import("@/utils/auction-helpers"),
  };
  await applyMigrations(prisma);

  await prisma.currency.create({
    data: { code: "EUR", name: "Euro", symbol: "€" },
  });
  await prisma.user.createMany({
    data: ["owner", "alice", "bob"].map((id) => ({
      id,
      email: `${id}@example.test`,
      name: id,
    })),
  });
});

after(async () => {
  await services?.prisma.$disconnect();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

type ItemSpec = {
  key: string;
  endDate?: Date | null;
  isPublished?: boolean;
  /** Bids as [userId, amount]; the last is the highest. */
  bids?: [string, number][];
  winnerNotifiedUserId?: string;
};

/** Creates an auction with items; ids are prefixed with the auction id. */
async function seedAuction(
  id: string,
  endDate: Date | null,
  items: ItemSpec[],
) {
  const { prisma } = services;
  await prisma.auction.create({
    data: { id, name: `Auction ${id}`, endDate, creatorId: "owner" },
  });
  for (const spec of items) {
    const bids = spec.bids ?? [];
    const top = bids.at(-1);
    await prisma.auctionItem.create({
      data: {
        id: `${id}-${spec.key}`,
        name: `Item ${spec.key}`,
        auctionId: id,
        currencyCode: "EUR",
        creatorId: "owner",
        isPublished: spec.isPublished ?? true,
        endDate: spec.endDate ?? null,
        currentBid: top?.[1] ?? null,
        highestBidderId: top?.[0] ?? null,
        winnerNotified: spec.winnerNotifiedUserId !== undefined,
        winnerNotifiedUserId: spec.winnerNotifiedUserId ?? null,
        winnerNotifiedAmount: spec.winnerNotifiedUserId
          ? (top?.[1] ?? null)
          : null,
        winnerNotifiedAt: spec.winnerNotifiedUserId ? fromNow(-DAY) : null,
      },
    });
    for (const [userId, amount] of bids) {
      await prisma.bid.create({
        data: { auctionItemId: `${id}-${spec.key}`, userId, amount },
      });
    }
  }
}

async function loadItem(id: string) {
  return services.prisma.auctionItem.findUniqueOrThrow({
    where: { id },
    include: { auction: { select: { endDate: true } } },
  });
}

async function isOpen(id: string) {
  const item = await loadItem(id);
  return !services.helpers.isItemEnded(item.endDate, item.auction.endDate);
}

async function reopenNotifications(auctionId: string) {
  return services.prisma.notification.findMany({
    where: { auctionId, type: "BIDDING_REOPENED" },
    select: { userId: true, title: true, message: true, itemId: true },
    orderBy: { userId: "asc" },
  });
}

/** Snapshot of everything a rejected request must leave untouched. */
async function snapshot(auctionId: string) {
  const { prisma } = services;
  return {
    auction: await prisma.auction.findUniqueOrThrow({
      where: { id: auctionId },
      select: { endDate: true, updatedAt: true },
    }),
    items: await prisma.auctionItem.findMany({
      where: { auctionId },
      select: {
        id: true,
        endDate: true,
        winnerNotified: true,
        lastUpdatedById: true,
      },
      orderBy: { id: "asc" },
    }),
    notifications: await prisma.notification.count({ where: { auctionId } }),
  };
}

async function assertBadRequest(promise: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof services.errors.BadRequestError, String(err));
    assert.match((err as Error).message, pattern);
    return true;
  });
}

// ----------------------------------------------------------------------------
// findClosedItems
// ----------------------------------------------------------------------------

test("findClosedItems lists published closed items under the bid API rule", async () => {
  await seedAuction("fc", fromNow(DAY), [
    { key: "b-stamped", endDate: fromNow(-DAY), bids: [["alice", 5]] },
    { key: "a-stamped", endDate: fromNow(-DAY) },
    { key: "follows", endDate: null },
    { key: "own-future", endDate: fromNow(2 * DAY) },
    { key: "draft", endDate: fromNow(-DAY), isPublished: false },
  ]);
  await seedAuction("fc-ended", fromNow(-DAY), [
    { key: "follows", endDate: null, bids: [["bob", 3]] },
    { key: "own-future", endDate: fromNow(DAY) },
  ]);

  const closed = await services.reopen.findClosedItems("fc");
  assert.deepEqual(
    closed.map((item) => [item.id, item.bidCount]),
    [
      ["fc-a-stamped", 0],
      ["fc-b-stamped", 1],
    ],
  );
  assert.equal(typeof closed[0].endDate, "string");

  const closedEnded = await services.reopen.findClosedItems("fc-ended");
  assert.deepEqual(
    closedEnded.map((item) => [item.id, item.endDate, item.bidCount]),
    [["fc-ended-follows", null, 1]],
  );
  assert.deepEqual(await services.reopen.findClosedItems("missing"), []);
});

// ----------------------------------------------------------------------------
// 4.1 reopenBidding
// ----------------------------------------------------------------------------

test("Owner reopens an ended auction: new end date, selected items accept bids", async () => {
  const stamped = fromNow(-DAY);
  await seedAuction("r1", stamped, [
    { key: "x", endDate: stamped, bids: [["alice", 10]] },
    {
      key: "y",
      endDate: stamped,
      bids: [
        ["alice", 20],
        ["bob", 25],
      ],
    },
    { key: "z", endDate: stamped, bids: [["bob", 7]] },
    { key: "nobids", endDate: stamped },
  ]);
  const newEnd = fromNow(3 * DAY);

  const result = await services.reopen.reopenBidding({
    auctionId: "r1",
    actorId: "owner",
    endDate: newEnd,
    itemIds: ["r1-x", "r1-y", "r1-x", "r1-nobids"],
  });

  assert.equal(result.auction.endDate?.toISOString(), newEnd.toISOString());
  assert.equal(result.reopenedCount, 3, "includes the item without bids");
  assert.equal(result.notifiedCount, 2);

  for (const id of ["r1-x", "r1-y", "r1-nobids"]) {
    const item = await loadItem(id);
    assert.equal(item.endDate, null, `${id} follows the auction`);
    assert.equal(item.lastUpdatedById, "owner");
    assert.equal(await isOpen(id), true);
  }
  // Not selected and stamped with its own date: stays closed.
  assert.equal(await isOpen("r1-z"), false);
  assert.equal((await loadItem("r1-z")).lastUpdatedById, null);

  const notifications = await reopenNotifications("r1");
  assert.deepEqual(
    notifications.map((n) => [n.userId, n.itemId]),
    [
      ["alice", null],
      ["bob", "r1-y"],
    ],
  );
});

test("Stamped item reopens in a live auction and follows the auction end", async () => {
  await seedAuction("r2", fromNow(DAY), [
    { key: "stamped", endDate: fromNow(-DAY), bids: [["alice", 10]] },
    { key: "open", endDate: null, bids: [["bob", 4]] },
  ]);
  const newEnd = fromNow(2 * DAY);

  const result = await services.reopen.reopenBidding({
    auctionId: "r2",
    actorId: "owner",
    endDate: newEnd,
    itemIds: ["r2-stamped"],
  });

  assert.equal(result.reopenedCount, 1);
  assert.equal(result.notifiedCount, 1);
  const item = await loadItem("r2-stamped");
  assert.equal(item.endDate, null);
  assert.equal(
    services.helpers
      .getEffectiveItemEndDate(item.endDate, item.auction.endDate)
      ?.toISOString(),
    newEnd.toISOString(),
    "closes when the auction closes",
  );
  // The item that was already open is not counted or notified.
  assert.deepEqual(
    (await reopenNotifications("r2")).map((n) => n.userId),
    ["alice"],
  );
});

test("Auction extended again later: reopened items stay open until the new end", async () => {
  await seedAuction("r3", fromNow(-DAY), [
    { key: "x", endDate: fromNow(-DAY), bids: [["alice", 10]] },
  ]);
  await services.reopen.reopenBidding({
    auctionId: "r3",
    actorId: "owner",
    endDate: fromNow(DAY),
    itemIds: ["r3-x"],
  });

  const later = fromNow(5 * DAY);
  await services.auctions.updateAuction(
    "r3",
    { endDate: later.toISOString() },
    "owner",
  );

  const item = await loadItem("r3-x");
  assert.equal(item.endDate, null);
  assert.equal(item.auction.endDate?.toISOString(), later.toISOString());
  assert.equal(await isOpen("r3-x"), true);
  // Still past the original end: open under the extended auction end.
  assert.equal(
    services.helpers.isItemEnded(
      item.endDate,
      item.auction.endDate,
      fromNow(3 * DAY),
    ),
    false,
  );
});

test("Item from another auction: rejected and nothing changes", async () => {
  await seedAuction("r4", fromNow(-DAY), [
    { key: "x", endDate: fromNow(-DAY), bids: [["alice", 10]] },
  ]);
  await seedAuction("r4-other", fromNow(-DAY), [
    { key: "y", endDate: fromNow(-DAY), bids: [["bob", 10]] },
  ]);
  const before = await snapshot("r4");
  const otherBefore = await snapshot("r4-other");

  await assertBadRequest(
    services.reopen.reopenBidding({
      auctionId: "r4",
      actorId: "owner",
      endDate: fromNow(DAY),
      itemIds: ["r4-x", "r4-other-y"],
    }),
    /do not belong to this auction/,
  );
  await assertBadRequest(
    services.reopen.reopenBidding({
      auctionId: "r4",
      actorId: "owner",
      endDate: fromNow(DAY),
      itemIds: ["does-not-exist"],
    }),
    /do not belong to this auction/,
  );

  assert.deepEqual(await snapshot("r4"), before);
  assert.deepEqual(await snapshot("r4-other"), otherBefore);
});

test("Item already open: rejected and nothing changes", async () => {
  await seedAuction("r5", fromNow(DAY), [
    { key: "closed", endDate: fromNow(-DAY), bids: [["alice", 10]] },
    { key: "open", endDate: null, bids: [["bob", 10]] },
  ]);
  const before = await snapshot("r5");

  await assertBadRequest(
    services.reopen.reopenBidding({
      auctionId: "r5",
      actorId: "owner",
      endDate: fromNow(2 * DAY),
      itemIds: ["r5-closed", "r5-open"],
    }),
    /still open/,
  );
  assert.deepEqual(await snapshot("r5"), before);
});

test("Draft item: rejected and nothing changes", async () => {
  await seedAuction("r5d", fromNow(-DAY), [
    { key: "draft", endDate: fromNow(-DAY), isPublished: false },
  ]);
  const before = await snapshot("r5d");

  await assertBadRequest(
    services.reopen.reopenBidding({
      auctionId: "r5d",
      actorId: "owner",
      endDate: fromNow(DAY),
      itemIds: ["r5d-draft"],
    }),
    /Draft items/,
  );
  assert.deepEqual(await snapshot("r5d"), before);
});

test("End date not in the future: rejected and nothing changes", async () => {
  await seedAuction("r6", fromNow(-DAY), [
    { key: "x", endDate: null, bids: [["alice", 10]] },
  ]);
  const before = await snapshot("r6");
  const now = new Date();

  for (const endDate of [fromNow(-60 * 1000), now]) {
    await assertBadRequest(
      services.reopen.reopenBidding(
        { auctionId: "r6", actorId: "owner", endDate, itemIds: ["r6-x"] },
        now,
      ),
      /must be in the future/,
    );
  }
  await assertBadRequest(
    services.reopen.reopenBidding({
      auctionId: "r6",
      actorId: "owner",
      endDate: new Date("not a date"),
      itemIds: [],
    }),
    /Invalid end date/,
  );
  assert.deepEqual(await snapshot("r6"), before);
});

test("Bidding continues from the current price: bids and highest bidder unchanged", async () => {
  await seedAuction("r7", fromNow(-DAY), [
    {
      key: "x",
      endDate: fromNow(-DAY),
      bids: [
        ["bob", 100],
        ["alice", 120],
      ],
      winnerNotifiedUserId: "alice",
    },
  ]);
  const beforeItem = await loadItem("r7-x");

  await services.reopen.reopenBidding({
    auctionId: "r7",
    actorId: "owner",
    endDate: fromNow(DAY),
    itemIds: ["r7-x"],
  });

  const item = await loadItem("r7-x");
  assert.equal(item.currentBid, 120);
  assert.equal(item.highestBidderId, "alice");
  assert.equal(
    await services.prisma.bid.count({ where: { auctionItemId: "r7-x" } }),
    2,
  );
  assert.equal(
    services.helpers.calculateMinBid(
      item.currentBid,
      item.startingBid,
      item.minBidIncrement,
    ),
    121,
  );

  // Pending again for the next close, with the earlier record kept.
  assert.equal(item.winnerNotified, false);
  assert.equal(item.winnerNotifiedUserId, "alice");
  assert.equal(item.winnerNotifiedAmount, 120);
  assert.equal(
    item.winnerNotifiedAt?.toISOString(),
    beforeItem.winnerNotifiedAt?.toISOString(),
  );

  const notifications = await reopenNotifications("r7");
  assert.deepEqual(
    notifications.map((n) => [n.userId, n.title]),
    [
      ["alice", "Your win is no longer final"],
      ["bob", "Bidding reopened"],
    ],
  );
});

test("Reopen without an end time also reopens items that follow the auction", async () => {
  await seedAuction("r8", fromNow(-DAY), [
    { key: "follows", endDate: null, bids: [["alice", 5]] },
    { key: "stamped", endDate: fromNow(-DAY), bids: [["bob", 5]] },
  ]);

  const result = await services.reopen.reopenBidding({
    auctionId: "r8",
    actorId: "owner",
    endDate: null,
    itemIds: [],
  });

  assert.equal(result.auction.endDate, null);
  assert.equal(result.reopenedCount, 1);
  assert.equal(await isOpen("r8-follows"), true);
  assert.equal(await isOpen("r8-stamped"), false);
  const [notification] = await reopenNotifications("r8");
  assert.equal(notification.userId, "alice");
  assert.match(notification.message, /no end time/);
});

// ----------------------------------------------------------------------------
// 4.2 updateAuction end date changes
// ----------------------------------------------------------------------------

test("Auction form extension: items that follow the auction reopen and notify", async () => {
  await seedAuction("u1", fromNow(-DAY), [
    {
      key: "follows",
      endDate: null,
      bids: [["alice", 30]],
      winnerNotifiedUserId: "alice",
    },
    { key: "stamped", endDate: fromNow(-DAY), bids: [["bob", 5]] },
  ]);

  const auction = await services.auctions.updateAuction(
    "u1",
    { name: "Renamed", endDate: fromNow(2 * DAY).toISOString() },
    "owner",
  );

  assert.equal(auction.name, "Renamed", "other form fields are saved too");
  assert.equal(await isOpen("u1-follows"), true);
  assert.equal(await isOpen("u1-stamped"), false);
  const item = await loadItem("u1-follows");
  assert.equal(item.winnerNotified, false);
  assert.equal(item.winnerNotifiedUserId, "alice");
  assert.deepEqual(
    (await reopenNotifications("u1")).map((n) => [n.userId, n.title]),
    [["alice", "Your win is no longer final"]],
  );
});

test("Extension before the auction ended: nothing reopens or notifies", async () => {
  await seedAuction("u2", fromNow(DAY), [
    { key: "follows", endDate: null, bids: [["alice", 30]] },
  ]);

  await services.auctions.updateAuction(
    "u2",
    { endDate: fromNow(4 * DAY).toISOString() },
    "owner",
  );

  assert.equal((await reopenNotifications("u2")).length, 0);
  assert.equal((await loadItem("u2-follows")).winnerNotified, false);
});

test("Owner saves settings again after a reopen: no second notification", async () => {
  await seedAuction("u3", fromNow(-DAY), [
    { key: "x", endDate: fromNow(-DAY), bids: [["alice", 30]] },
  ]);
  const newEnd = fromNow(2 * DAY);
  await services.reopen.reopenBidding({
    auctionId: "u3",
    actorId: "owner",
    endDate: newEnd,
    itemIds: ["u3-x"],
  });
  assert.equal((await reopenNotifications("u3")).length, 1);

  await services.auctions.updateAuction(
    "u3",
    { name: "Same again", endDate: newEnd.toISOString() },
    "owner",
  );
  assert.equal((await reopenNotifications("u3")).length, 1);
});

test("Owner corrects the new end time: no second notification", async () => {
  await seedAuction("u4", fromNow(-DAY), [
    { key: "follows", endDate: null, bids: [["alice", 30]] },
  ]);
  const at1800 = fromNow(2 * DAY);
  await services.auctions.updateAuction(
    "u4",
    { endDate: at1800.toISOString() },
    "owner",
  );
  assert.equal((await reopenNotifications("u4")).length, 1);

  const at2000 = new Date(at1800.getTime() + 2 * 60 * 60 * 1000);
  await services.auctions.updateAuction(
    "u4",
    { endDate: at2000.toISOString() },
    "owner",
  );
  assert.equal((await reopenNotifications("u4")).length, 1);
});

test("The settings form may still end an auction or clear its end date", async () => {
  await seedAuction("u5", fromNow(DAY), [
    { key: "follows", endDate: null, bids: [["alice", 30]] },
  ]);

  // A past date is allowed in the form (no reopen validation) and ends items.
  const past = fromNow(-60 * 1000);
  const ended = await services.auctions.updateAuction(
    "u5",
    { endDate: past.toISOString() },
    "owner",
  );
  assert.equal(ended.endDate?.toISOString(), past.toISOString());
  assert.equal(await isOpen("u5-follows"), false);
  assert.equal((await reopenNotifications("u5")).length, 0);

  // Clearing the date reopens the items that follow the auction.
  const cleared = await services.auctions.updateAuction(
    "u5",
    { endDate: null },
    "owner",
  );
  assert.equal(cleared.endDate, null);
  assert.equal(await isOpen("u5-follows"), true);
  assert.equal((await reopenNotifications("u5")).length, 1);
});

test("updateAuction without an end date change leaves notifications alone", async () => {
  await seedAuction("u6", fromNow(-DAY), [
    { key: "follows", endDate: null, bids: [["alice", 30]] },
  ]);
  const auction = await services.auctions.updateAuction("u6", {
    name: "Only the name",
  });
  assert.equal(auction.name, "Only the name");
  assert.equal(await isOpen("u6-follows"), false);
  assert.equal((await reopenNotifications("u6")).length, 0);
});
