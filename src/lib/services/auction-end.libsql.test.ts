import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { listMigrations } from "@/lib/testing/apply-migrations";

/**
 * Production (Turso) runs Prisma through the libSQL driver adapter, while the
 * other service tests use `file:` URLs and so the better-sqlite3 adapter. This
 * file runs the notifier's concurrency cases through `PrismaLibSql` on a local
 * `file:` database instead.
 *
 * The schema is applied with `@libsql/client` `executeMultiple`, the call
 * `scripts/migrate-turso.ts` uses, so the migration set is shown to apply
 * through libSQL. The services are pointed at the libSQL client through the
 * `globalThis.prisma` instance that `@/lib/prisma` reuses when one exists.
 * E-mail goes to a local SMTP stub that drops every connection.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-libsql-"));
const dbUrl = `file:${path.join(tmpDir, "test.db").replace(/\\/g, "/")}`;
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);

function createLibSqlPrisma() {
  return new PrismaClient({
    adapter: new PrismaLibSql({ url: dbUrl }),
    log: [{ emit: "event", level: "query" }],
  });
}

type Services = {
  client: ReturnType<typeof createLibSqlPrisma>;
  prisma: typeof import("@/lib/prisma").prisma;
  auctionEnd: typeof import("@/lib/services/auction-end.service");
  reopen: typeof import("@/lib/services/auction-reopen.service");
};
let services: Services;
let smtpStub: net.Server;
/** SQL statements the client ran, in order, while `recording` is set. */
const recorded: string[] = [];
let recording = false;

before(async () => {
  smtpStub = net.createServer((socket) => socket.destroy());
  await new Promise<void>((resolve) =>
    smtpStub.listen(0, "127.0.0.1", resolve),
  );
  const { port } = smtpStub.address() as net.AddressInfo;

  process.env.DATABASE_URL = dbUrl;
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(port);
  delete process.env.SMTP_USER;

  // Apply every migration the way scripts/migrate-turso.ts does.
  const migrator = createClient({ url: dbUrl });
  try {
    for (const name of listMigrations()) {
      await migrator.executeMultiple(
        fs.readFileSync(
          path.join(MIGRATIONS_DIR, name, "migration.sql"),
          "utf8",
        ),
      );
    }
  } finally {
    migrator.close();
  }

  const client = createLibSqlPrisma();
  client.$on("query", (event) => {
    if (recording) recorded.push(event.query);
  });
  (globalThis as unknown as { prisma?: unknown }).prisma = client;

  const { prisma } = await import("@/lib/prisma");
  const auctionEnd = await import("@/lib/services/auction-end.service");
  const reopen = await import("@/lib/services/auction-reopen.service");
  services = { client, prisma, auctionEnd, reopen };

  await prisma.currency.create({
    data: { code: "EUR", name: "Euro", symbol: "€" },
  });
  await prisma.user.create({
    data: { id: "owner", email: "owner@example.test", name: "Owner" },
  });
});

after(async () => {
  await services?.prisma.$disconnect();
  await new Promise<void>((resolve) => smtpStub.close(() => resolve()));
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // On Windows, a local @libsql/client database file stays open after
    // `close()` (even for a client that only ran one statement), and an open
    // file cannot be deleted, so the temp directory may outlive this run.
    if ((err as NodeJS.ErrnoException).code !== "EBUSY") throw err;
  }
});

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

async function seedItem(id: string, auctionId: string, winnerId: string) {
  await services.prisma.auctionItem.create({
    data: {
      id,
      name: id,
      auctionId,
      currencyCode: "EUR",
      creatorId: "owner",
      currentBid: 10,
      highestBidderId: winnerId,
      isPublished: true,
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

async function winnerRecord(itemId: string) {
  return services.prisma.auctionItem.findUniqueOrThrow({
    where: { id: itemId },
    select: {
      winnerNotified: true,
      winnerNotifiedUserId: true,
      winnerNotifiedAmount: true,
    },
  });
}

test("the services run on the libSQL adapter with the migrated schema", async () => {
  const { client, prisma } = services;
  assert.equal(prisma, client);
  const columns = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM pragma_table_info('auction_items')",
  );
  const names = columns.map((column) => column.name);
  for (const column of [
    "winnerNotified",
    "winnerNotifiedUserId",
    "winnerNotifiedAmount",
    "winnerNotifiedAt",
  ]) {
    assert.ok(names.includes(column), column);
  }
});

test("libSQL: overlapping processEndedItems runs notify each winner once", async (t) => {
  const { prisma, auctionEnd } = services;
  const items = ["lib-race-1", "lib-race-2", "lib-race-3"];
  await seedUsers("lib-race-winner");
  await prisma.userSettings.create({
    data: { userId: "lib-race-winner", emailOnItemWon: true },
  });
  await seedAuction("lib-race-auction", daysFromNow(-1));
  for (const id of items) {
    await seedItem(id, "lib-race-auction", "lib-race-winner");
  }

  recorded.length = 0;
  recording = true;
  let counts: number[];
  try {
    counts = await Promise.all([
      auctionEnd.processEndedItems(),
      auctionEnd.processEndedItems(),
      auctionEnd.processEndedItems(),
    ]);
  } finally {
    recording = false;
  }
  assert.equal(
    counts.reduce((sum, count) => sum + count, 0),
    3,
  );

  // The runs overlapped: each read the pending items before any claim, so
  // more claims were attempted than there are items.
  const isItemSelect = (sql: string) =>
    /^SELECT\b/i.test(sql) &&
    /FROM [`"]?(main[`"]?\.)?[`"]?auction_items/i.test(sql);
  const isClaim = (sql: string) =>
    /^UPDATE [`"]?(main[`"]?\.)?[`"]?auction_items/i.test(sql) &&
    /winnerNotifiedUserId/.test(sql);
  const firstClaim = recorded.findIndex(isClaim);
  const selectsBeforeFirstClaim = recorded
    .slice(0, firstClaim)
    .filter(isItemSelect).length;
  const claimAttempts = recorded.filter(isClaim).length;
  t.diagnostic(
    `statements=${recorded.length} item selects before first claim=${selectsBeforeFirstClaim} claim attempts=${claimAttempts} successful claims=3`,
  );
  assert.ok(firstClaim > 0);
  assert.equal(selectsBeforeFirstClaim, 3);
  assert.equal(claimAttempts, 9);

  for (const itemId of items) {
    assert.deepEqual(await wonBy(itemId), ["lib-race-winner"], itemId);
    assert.deepEqual(
      await wonEmailsFor(itemId),
      ["lib-race-winner@example.test"],
      itemId,
    );
    assert.deepEqual(
      await winnerRecord(itemId),
      {
        winnerNotified: true,
        winnerNotifiedUserId: "lib-race-winner",
        winnerNotifiedAmount: 10,
      },
      itemId,
    );
  }
});

test("libSQL: an item reopened after the notifier read it is not claimed, and the next winner is notified", async () => {
  const { prisma, auctionEnd, reopen } = services;
  await seedUsers("lib-reopen-a", "lib-reopen-b");
  await seedAuction("lib-reopen-auction", daysFromNow(-1));
  await seedItem("lib-reopen-item", "lib-reopen-auction", "lib-reopen-a");
  await prisma.bid.create({
    data: {
      auctionItemId: "lib-reopen-item",
      userId: "lib-reopen-a",
      amount: 10,
    },
  });

  // A notifier run reads the item as pending with A as the winner...
  const candidates = await prisma.auctionItem.findMany({
    where: {
      ...auctionEnd.endedItemsAwaitingNotificationWhere(new Date()),
      id: "lib-reopen-item",
    },
  });
  assert.equal(candidates.length, 1);

  // ...then the owner reopens bidding before the run claims it.
  const reopened = await reopen.reopenBidding({
    auctionId: "lib-reopen-auction",
    actorId: "owner",
    endDate: daysFromNow(1),
    itemIds: [],
  });
  assert.equal(reopened.reopenedCount, 1);

  // The run's claim fails, so A is not told they won an open item.
  assert.equal(
    await auctionEnd.claimWinnerNotification(
      {
        id: "lib-reopen-item",
        highestBidderId: "lib-reopen-a",
        currentBid: 10,
      },
      new Date(),
    ),
    false,
  );
  assert.deepEqual(await wonBy("lib-reopen-item"), []);
  assert.deepEqual(await winnerRecord("lib-reopen-item"), {
    winnerNotified: false,
    winnerNotifiedUserId: null,
    winnerNotifiedAmount: null,
  });

  // B outbids A and the auction ends again: B is notified and recorded.
  await prisma.bid.create({
    data: {
      auctionItemId: "lib-reopen-item",
      userId: "lib-reopen-b",
      amount: 20,
    },
  });
  await prisma.auctionItem.update({
    where: { id: "lib-reopen-item" },
    data: { highestBidderId: "lib-reopen-b", currentBid: 20 },
  });
  await prisma.auction.update({
    where: { id: "lib-reopen-auction" },
    data: { endDate: new Date(Date.now() - 1000) },
  });
  await auctionEnd.processEndedItems();

  assert.deepEqual(await wonBy("lib-reopen-item"), ["lib-reopen-b"]);
  assert.deepEqual(await winnerRecord("lib-reopen-item"), {
    winnerNotified: true,
    winnerNotifiedUserId: "lib-reopen-b",
    winnerNotifiedAmount: 20,
  });
});
