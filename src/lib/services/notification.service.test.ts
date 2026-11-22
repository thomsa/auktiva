import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { applyMigrations } from "@/lib/testing/apply-migrations";

/**
 * Bidding-reopened messages. The pure message builder is tested directly; the
 * notifier runs against a throwaway SQLite database built from the checked-in
 * migrations. E-mail goes to a local SMTP stub that drops every connection, so
 * `sendEmail` writes its `EmailLog` row and then fails without leaving the
 * machine.
 */

// Run in a zone with a UTC offset, set before any service module loads, so
// the UTC formatting tests catch formatting in local time.
process.env.TZ = "Europe/Berlin";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-notify-"));
const dbFile = path.join(tmpDir, "test.db");

type Services = {
  prisma: typeof import("@/lib/prisma").prisma;
  notifications: typeof import("@/lib/services/notification.service");
};
let services: Services;
let smtpStub: net.Server;

const AUCTION = { id: "auction", name: "Spring Gala" };
const END = new Date("2026-11-30T18:00:00.000Z");

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
  const notifications = await import("@/lib/services/notification.service");
  services = { prisma, notifications };
  await applyMigrations(prisma);

  await prisma.currency.create({
    data: { code: "EUR", name: "Euro", symbol: "€" },
  });
  await prisma.user.createMany({
    data: ["owner", "alice", "bob", "carol", "dave"].map((id) => ({
      id,
      email: `${id}@example.test`,
      name: id,
    })),
  });
  await prisma.userSettings.createMany({
    data: [
      { userId: "alice", emailOnItemWon: true },
      { userId: "bob", emailOnItemWon: true },
      { userId: "dave", emailOnItemWon: false },
    ],
  });
  await prisma.auction.create({
    data: { ...AUCTION, endDate: END, creatorId: "owner" },
  });
  await prisma.auctionMember.createMany({
    data: [
      { auctionId: AUCTION.id, userId: "owner", role: "OWNER" },
      ...["alice", "bob", "carol", "dave"].map((userId) => ({
        auctionId: AUCTION.id,
        userId,
        role: "BIDDER" as const,
      })),
    ],
  });
  await prisma.auctionItem.createMany({
    data: ["x", "y", "z", "w"].map((id) => ({
      id,
      name: `Item ${id.toUpperCase()}`,
      auctionId: AUCTION.id,
      currencyCode: "EUR",
      creatorId: "owner",
      isPublished: true,
    })),
  });
  await prisma.bid.createMany({
    data: [
      { auctionItemId: "x", userId: "alice", amount: 10 },
      { auctionItemId: "x", userId: "alice", amount: 12 },
      { auctionItemId: "y", userId: "alice", amount: 20 },
      { auctionItemId: "y", userId: "bob", amount: 25 },
      { auctionItemId: "w", userId: "owner", amount: 5 },
      { auctionItemId: "w", userId: "dave", amount: 6 },
    ],
  });
});

beforeEach(async () => {
  await services.prisma.notification.deleteMany();
  await services.prisma.emailLog.deleteMany();
});

after(async () => {
  await services?.prisma.$disconnect();
  await new Promise<void>((resolve) => smtpStub.close(() => resolve()));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function reopenedItem(id: string, winnerNotifiedUserId: string | null = null) {
  return { id, name: `Item ${id.toUpperCase()}`, winnerNotifiedUserId };
}

async function notificationsFor(userId: string) {
  return services.prisma.notification.findMany({
    where: { userId, type: "BIDDING_REOPENED" },
    select: { title: true, message: true, auctionId: true, itemId: true },
  });
}

// ----------------------------------------------------------------------------
// 3.1 Message builder
// ----------------------------------------------------------------------------

test("Single item with an end date: names the item, auction and UTC close time", () => {
  const { buildBiddingReopenedMessage } = services.notifications;
  const { title, message } = buildBiddingReopenedMessage({
    auctionName: "Spring Gala",
    endDate: END,
    itemNames: ["Vase"],
  });
  assert.equal(title, "Bidding reopened");
  assert.equal(
    message,
    'Bidding reopened on "Vase" in "Spring Gala". It now closes on 30 Nov 2026, 18:00 UTC.',
  );
});

test("Several items: states the item count and the auction", () => {
  const { buildBiddingReopenedMessage } = services.notifications;
  const { title, message } = buildBiddingReopenedMessage({
    auctionName: "Spring Gala",
    endDate: END,
    itemNames: ["A", "B", "C"],
  });
  assert.equal(title, "Bidding reopened");
  assert.equal(
    message,
    'Bidding reopened on 3 items in "Spring Gala". It now closes on 30 Nov 2026, 18:00 UTC.',
  );
});

test("Notified winner of a reopened item: the win is no longer final", () => {
  const { buildBiddingReopenedMessage } = services.notifications;
  const { title, message } = buildBiddingReopenedMessage({
    auctionName: "Spring Gala",
    endDate: END,
    itemNames: ["Vase"],
    wonItemNames: ["Vase"],
  });
  assert.equal(title, "Your win is no longer final");
  assert.equal(
    message,
    'Bidding reopened in "Spring Gala": your win on "Vase" is no longer final and it can be outbid until 30 Nov 2026, 18:00 UTC.',
  );
});

test("Notified winner who also bid on other reopened items", () => {
  const { buildBiddingReopenedMessage } = services.notifications;
  const { message } = buildBiddingReopenedMessage({
    auctionName: "Spring Gala",
    endDate: END,
    itemNames: ["Vase", "Lamp", "Rug"],
    wonItemNames: ["Vase", "Lamp"],
  });
  assert.equal(
    message,
    'Bidding reopened in "Spring Gala": your wins on 2 items are no longer final and they can be outbid until 30 Nov 2026, 18:00 UTC. Bidding also reopened on 1 other item you bid on.',
  );
});

test("No end time: says so instead of a close time", () => {
  const { buildBiddingReopenedMessage } = services.notifications;
  assert.equal(
    buildBiddingReopenedMessage({
      auctionName: "Spring Gala",
      endDate: null,
      itemNames: ["Vase"],
    }).message,
    'Bidding reopened on "Vase" in "Spring Gala". It has no end time.',
  );
  assert.equal(
    buildBiddingReopenedMessage({
      auctionName: "Spring Gala",
      endDate: null,
      itemNames: ["Vase"],
      wonItemNames: ["Vase"],
    }).message,
    'Bidding reopened in "Spring Gala": your win on "Vase" is no longer final and it can be outbid while bidding stays open (no end time).',
  );
});

test("Close times are formatted in UTC with zero-padded hours", () => {
  const { formatReopenCloseTime } = services.notifications;
  // The process runs in Europe/Berlin, so local formatting would differ.
  assert.notEqual(new Date("2026-01-05T03:07:00.000Z").getTimezoneOffset(), 0);
  assert.equal(
    formatReopenCloseTime(new Date("2026-01-05T03:07:00.000Z")),
    "5 Jan 2026, 03:07 UTC",
  );
  assert.equal(
    formatReopenCloseTime(new Date("2026-12-31T23:59:59.000Z")),
    "31 Dec 2026, 23:59 UTC",
  );
});

// ----------------------------------------------------------------------------
// 3.2 Recipients
// ----------------------------------------------------------------------------

test("Bidders across several items: one notification per bidder", async () => {
  const { notifications } = services;
  const notified = await notifications.notifyBiddingReopened({
    auctionId: AUCTION.id,
    auctionName: AUCTION.name,
    actorId: "owner",
    endDate: END,
    reopened: [reopenedItem("x"), reopenedItem("y")],
  });
  assert.equal(notified, 2);

  const alice = await notificationsFor("alice");
  assert.equal(alice.length, 1);
  assert.equal(alice[0].auctionId, AUCTION.id);
  assert.equal(alice[0].itemId, null, "two items: links to the auction");
  assert.match(alice[0].message, /on 2 items in "Spring Gala"/);

  const bob = await notificationsFor("bob");
  assert.equal(bob.length, 1);
  assert.equal(bob[0].itemId, "y", "one item: links to that item");
  assert.match(bob[0].message, /on "Item Y" in "Spring Gala"/);
});

test("Reopened item without bids: nothing is sent", async () => {
  const notified = await services.notifications.notifyBiddingReopened({
    auctionId: AUCTION.id,
    auctionName: AUCTION.name,
    actorId: "owner",
    endDate: END,
    reopened: [reopenedItem("z")],
  });
  assert.equal(notified, 0);
  assert.equal(
    await services.prisma.notification.count({
      where: { type: "BIDDING_REOPENED" },
    }),
    0,
  );
});

test("Members who did not bid: no notification", async () => {
  await services.notifications.notifyBiddingReopened({
    auctionId: AUCTION.id,
    auctionName: AUCTION.name,
    actorId: "owner",
    endDate: END,
    reopened: [reopenedItem("x"), reopenedItem("y"), reopenedItem("z")],
  });
  assert.equal((await notificationsFor("carol")).length, 0);
  assert.equal((await notificationsFor("dave")).length, 0);
});

test("The owner bid on a reopened item: not notified about their own action", async () => {
  const notified = await services.notifications.notifyBiddingReopened({
    auctionId: AUCTION.id,
    auctionName: AUCTION.name,
    actorId: "owner",
    endDate: END,
    reopened: [reopenedItem("w")],
  });
  assert.equal(notified, 1);
  assert.equal((await notificationsFor("owner")).length, 0);
  assert.equal((await notificationsFor("dave")).length, 1);
});

// ----------------------------------------------------------------------------
// 3.3 E-mail
// ----------------------------------------------------------------------------

test("Notified winner with item-won e-mails enabled: one e-mail plus in-app", async () => {
  await services.notifications.notifyBiddingReopened({
    auctionId: AUCTION.id,
    auctionName: AUCTION.name,
    actorId: "owner",
    endDate: END,
    reopened: [reopenedItem("x", "alice"), reopenedItem("y")],
  });

  const alice = await notificationsFor("alice");
  assert.equal(alice.length, 1);
  assert.equal(alice[0].title, "Your win is no longer final");
  assert.match(
    alice[0].message,
    /your win on "Item X" is no longer final and it can be outbid until 30 Nov 2026, 18:00 UTC/,
  );

  const emails = await services.prisma.emailLog.findMany({
    select: { toEmail: true, type: true, subject: true, htmlContent: true },
  });
  assert.equal(emails.length, 1);
  assert.equal(emails[0].toEmail, "alice@example.test");
  assert.equal(emails[0].type, "BIDDING_REOPENED");
  assert.equal(emails[0].subject, 'Bidding reopened on "Item X"');
  assert.match(emails[0].htmlContent, /30 Nov 2026, 18:00 UTC/);
  assert.match(emails[0].htmlContent, /\/auctions\/auction\/items\/x/);
});

test("Bidder who was not a notified winner: in-app only, no e-mail", async () => {
  await services.notifications.notifyBiddingReopened({
    auctionId: AUCTION.id,
    auctionName: AUCTION.name,
    actorId: "owner",
    endDate: END,
    // Bob opted into item-won e-mails but did not win Y; Dave won W but
    // keeps item-won e-mails off.
    reopened: [reopenedItem("y", "alice"), reopenedItem("w", "dave")],
  });

  assert.equal((await notificationsFor("bob")).length, 1);
  assert.equal((await notificationsFor("dave")).length, 1);
  const emails = await services.prisma.emailLog.findMany({
    select: { toEmail: true },
    orderBy: { toEmail: "asc" },
  });
  assert.deepEqual(
    emails.map((email) => email.toEmail),
    ["alice@example.test"],
  );
});
