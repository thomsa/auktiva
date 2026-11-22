import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Drives the real API routes (middleware chain included) against a throwaway
 * SQLite database. Requests carry a next-auth session cookie minted with the
 * test secret, so `withAuth` and `requireOwner` run unchanged.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-api-reopen-"));
const dbFile = path.join(tmpDir, "test.db");
const SECRET = "test-secret-for-auction-handlers";

const DAY = 24 * 60 * 60 * 1000;
const fromNow = (ms: number) => new Date(Date.now() + ms);
const PAST = fromNow(-DAY);

type Route = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
type Services = {
  prisma: typeof import("@/lib/prisma").prisma;
  encode: typeof import("next-auth/jwt").encode;
  reopenRoute: Route;
  auctionRoute: Route;
  itemRoute: Route;
  reopenSchema: typeof import("@/lib/api/handlers").reopenSchema;
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
  process.env.AUTH_SECRET = SECRET;
  process.env.NEXTAUTH_SECRET = SECRET;
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  delete process.env.EMAIL_PROVIDER;
  delete process.env.BREVO_API_KEY;

  const { prisma } = await import("@/lib/prisma");
  const { encode } = await import("next-auth/jwt");
  const { reopenSchema } = await import("@/lib/api/handlers");
  services = {
    prisma,
    encode,
    reopenSchema,
    reopenRoute: (await import("@/pages/api/auctions/[id]/reopen")).default,
    auctionRoute: (await import("@/pages/api/auctions/[id]/index")).default,
    itemRoute: (await import("@/pages/api/auctions/[id]/items/[itemId]/index"))
      .default,
  };
  await applyMigrations(prisma);

  await prisma.currency.create({
    data: { code: "EUR", name: "Euro", symbol: "€" },
  });
  await prisma.user.createMany({
    data: ["owner", "admin", "creator", "bidder"].map((id) => ({
      id,
      email: `${id}@example.test`,
      name: id,
    })),
  });
  await prisma.auction.create({
    data: { id: "a1", name: "Gala", endDate: PAST, creatorId: "owner" },
  });
  // A live auction where "End auction now" style stamping closed one item.
  await prisma.auction.create({
    data: {
      id: "live",
      name: "Live",
      endDate: fromNow(2 * DAY),
      creatorId: "owner",
    },
  });
  await prisma.auctionMember.createMany({
    data: ["a1", "live"].flatMap((auctionId) => [
      { auctionId, userId: "owner", role: "OWNER" as const },
      { auctionId, userId: "admin", role: "ADMIN" as const },
      { auctionId, userId: "creator", role: "CREATOR" as const },
      { auctionId, userId: "bidder", role: "BIDDER" as const },
    ]),
  });
  await prisma.auctionItem.createMany({
    data: [
      {
        id: "stamped",
        name: "Stamped",
        auctionId: "a1",
        currencyCode: "EUR",
        creatorId: "creator",
        isPublished: true,
        isEditableByAdmin: true,
        endDate: PAST,
        currentBid: 10,
        highestBidderId: "bidder",
        winnerNotified: true,
        winnerNotifiedUserId: "bidder",
        winnerNotifiedAmount: 10,
        winnerNotifiedAt: PAST,
      },
      {
        id: "live-stamped",
        name: "Live stamped",
        auctionId: "live",
        currencyCode: "EUR",
        creatorId: "creator",
        isPublished: true,
        isEditableByAdmin: true,
        endDate: PAST,
      },
      {
        id: "follows",
        name: "Follows",
        auctionId: "a1",
        currencyCode: "EUR",
        creatorId: "creator",
        isPublished: true,
        currentBid: 5,
        highestBidderId: "owner",
      },
    ],
  });
  await prisma.bid.createMany({
    data: [
      { auctionItemId: "stamped", userId: "bidder", amount: 10 },
      { auctionItemId: "follows", userId: "owner", amount: 5 },
    ],
  });
});

after(async () => {
  await services?.prisma.$disconnect();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function sessionCookie(userId: string): Promise<string> {
  const token = await services.encode({
    token: { id: userId, sub: userId, email: `${userId}@example.test` },
    secret: SECRET,
  });
  return `next-auth.session-token=${token}`;
}

/** Calls a route like Next would and returns the status and JSON body. */
async function call(
  route: Route,
  options: {
    method: string;
    query: Record<string, string>;
    body?: unknown;
    userId?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const cookie = options.userId ? await sessionCookie(options.userId) : "";
  const separator = cookie.indexOf("=");
  const cookies: Record<string, string> = cookie
    ? { [cookie.slice(0, separator)]: cookie.slice(separator + 1) }
    : {};
  const req = {
    method: options.method,
    url: "/api/test",
    query: options.query,
    body: options.body,
    headers: { host: "localhost:3000", cookie },
    cookies,
  } as unknown as NextApiRequest;

  const headers = new Map<string, unknown>();
  const result = { status: 200, body: {} as Record<string, unknown> };
  const res: Record<string, unknown> = {
    statusCode: 200,
    status(code: number) {
      result.status = code;
      res.statusCode = code;
      return res;
    },
    json(body: Record<string, unknown>) {
      result.body = body;
      return res;
    },
    setHeader(name: string, value: unknown) {
      headers.set(name.toLowerCase(), value);
      return res;
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
  };

  await route(req, res as unknown as NextApiResponse);
  return result;
}

async function state() {
  const { prisma } = services;
  return {
    auction: await prisma.auction.findUniqueOrThrow({
      where: { id: "a1" },
      select: { endDate: true },
    }),
    items: await prisma.auctionItem.findMany({
      where: { auctionId: "a1" },
      select: { id: true, endDate: true, winnerNotified: true },
      orderBy: { id: "asc" },
    }),
    notifications: await prisma.notification.count({
      where: { type: "BIDDING_REOPENED" },
    }),
  };
}

// ----------------------------------------------------------------------------
// Schema
// ----------------------------------------------------------------------------

test("reopenSchema accepts an ISO end date or null, and at most 500 item ids", () => {
  const { reopenSchema } = services;
  assert.equal(
    reopenSchema.safeParse({
      endDate: "2026-11-30T18:00:00.000Z",
      itemIds: ["a"],
    }).success,
    true,
  );
  assert.equal(
    reopenSchema.safeParse({
      endDate: "2026-11-30T19:00:00+01:00",
      itemIds: [],
    }).success,
    true,
  );
  assert.equal(
    reopenSchema.safeParse({ endDate: null, itemIds: [] }).success,
    true,
  );
  assert.equal(
    reopenSchema.safeParse({ endDate: "tomorrow", itemIds: [] }).success,
    false,
  );
  assert.equal(reopenSchema.safeParse({ endDate: null }).success, false);
  assert.equal(
    reopenSchema.safeParse({
      endDate: null,
      itemIds: Array.from({ length: 501 }, (_, i) => `item-${i}`),
    }).success,
    false,
  );
});

// ----------------------------------------------------------------------------
// 4.3 POST /api/auctions/[id]/reopen
// ----------------------------------------------------------------------------

test("Reopen without a session is unauthorized and changes nothing", async () => {
  const before = await state();
  const { status } = await call(services.reopenRoute, {
    method: "POST",
    query: { id: "a1" },
    body: { endDate: fromNow(DAY).toISOString(), itemIds: ["stamped"] },
  });
  assert.equal(status, 401);
  assert.deepEqual(await state(), before);
});

test("Admin or bidder tries to reopen: 403 and nothing changes", async () => {
  const before = await state();
  for (const userId of ["admin", "creator", "bidder"]) {
    const { status, body } = await call(services.reopenRoute, {
      method: "POST",
      query: { id: "a1" },
      userId,
      body: { endDate: fromNow(DAY).toISOString(), itemIds: ["stamped"] },
    });
    assert.equal(status, 403, `${userId} is forbidden`);
    assert.equal(body.code, "FORBIDDEN");
  }
  assert.deepEqual(await state(), before);
});

test("Invalid reopen bodies are rejected before anything changes", async () => {
  const before = await state();
  const invalidBody = await call(services.reopenRoute, {
    method: "POST",
    query: { id: "a1" },
    userId: "owner",
    body: { endDate: "next week", itemIds: ["stamped"] },
  });
  assert.equal(invalidBody.status, 422);

  const pastDate = await call(services.reopenRoute, {
    method: "POST",
    query: { id: "a1" },
    userId: "owner",
    body: { endDate: fromNow(-DAY).toISOString(), itemIds: ["stamped"] },
  });
  assert.equal(pastDate.status, 400);
  assert.equal(pastDate.body.code, "BAD_REQUEST");
  assert.deepEqual(await state(), before);
});

// ----------------------------------------------------------------------------
// 4.4 Item-level reopening stays blocked
// ----------------------------------------------------------------------------

test("Item editor extends an ended item: rejected and the item stays closed", async () => {
  const before = await state();
  const liveBefore = await services.prisma.auctionItem.findUniqueOrThrow({
    where: { id: "live-stamped" },
  });
  // The item creator sets a future end date on ended items; the admin
  // (allowed to edit these items) clears a past end date while the auction
  // is still live. Each would reopen the item.
  const attempts = [
    ["creator", "a1", "stamped", fromNow(DAY).toISOString()],
    ["creator", "live", "live-stamped", fromNow(DAY).toISOString()],
    ["admin", "live", "live-stamped", null],
  ] as const;
  for (const [userId, auctionId, itemId, endDate] of attempts) {
    const { status, body } = await call(services.itemRoute, {
      method: "PATCH",
      query: { id: auctionId, itemId },
      userId,
      body: { endDate },
    });
    assert.equal(status, 400, `${userId} cannot reopen ${itemId}`);
    assert.match(String(body.message), /already ended/);
  }
  assert.deepEqual(await state(), before);
  assert.deepEqual(
    await services.prisma.auctionItem.findUniqueOrThrow({
      where: { id: "live-stamped" },
    }),
    liveBefore,
  );
});

// ----------------------------------------------------------------------------
// Owner calls
// ----------------------------------------------------------------------------

test("Owner reopens: 200 with the auction and the counts", async () => {
  const newEnd = fromNow(3 * DAY);
  const { status, body } = await call(services.reopenRoute, {
    method: "POST",
    query: { id: "a1" },
    userId: "owner",
    body: { endDate: newEnd.toISOString(), itemIds: ["stamped"] },
  });

  assert.equal(status, 200, JSON.stringify(body));
  // "stamped" was selected; "follows" reopens with the auction move.
  assert.equal(body.reopenedCount, 2);
  // The bidder is told; the owner's own bid on "follows" is not.
  assert.equal(body.notifiedCount, 1);
  const auction = body.auction as Record<string, unknown>;
  assert.equal(auction.id, "a1");
  assert.equal(auction.endDate, newEnd.toISOString());
  assert.equal(typeof auction.updatedAt, "string");

  const after = await state();
  assert.deepEqual(after.items, [
    { id: "follows", endDate: null, winnerNotified: false },
    { id: "stamped", endDate: null, winnerNotified: false },
  ]);
  const notifications = await services.prisma.notification.findMany({
    where: { type: "BIDDING_REOPENED" },
    select: { userId: true, title: true },
  });
  assert.deepEqual(notifications, [
    { userId: "bidder", title: "Your win is no longer final" },
  ]);
});

test("Owner PATCH of the end date passes the actor and sends nothing new while running", async () => {
  // The auction is live again after the previous test; moving its end out
  // reopens nothing, so no new notification.
  const { status, body } = await call(services.auctionRoute, {
    method: "PATCH",
    query: { id: "a1" },
    userId: "owner",
    body: { endDate: fromNow(4 * DAY).toISOString() },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal((await state()).notifications, 1);

  // End it through the form, then extend it again: the items that follow
  // the auction reopen and only the bidder (not the acting owner) is told.
  await call(services.auctionRoute, {
    method: "PATCH",
    query: { id: "a1" },
    userId: "owner",
    body: { endDate: fromNow(-60 * 1000).toISOString() },
  });
  const extended = await call(services.auctionRoute, {
    method: "PATCH",
    query: { id: "a1" },
    userId: "owner",
    body: { endDate: fromNow(DAY).toISOString() },
  });
  assert.equal(extended.status, 200);
  const notifications = await services.prisma.notification.findMany({
    where: { type: "BIDDING_REOPENED" },
    select: { userId: true },
  });
  assert.deepEqual(
    notifications.map((n) => n.userId),
    ["bidder", "bidder"],
  );
});
