import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { listMigrations } from "@/lib/testing/apply-migrations";

/**
 * A database as v1.22.0 left it, for the v1.23.0 upgrade tests: the schema
 * of the migrations that shipped in v1.22.0 and data covering every case
 * the v1.23.0 migrations and notifier treat differently.
 */

export const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

/** Migrations added after v1.22.0, in the order they apply. */
export const V1_23_MIGRATIONS = [
  "20261122170000_mark_past_null_dated_winners_notified",
  "20261122180000_add_winner_notification_record",
];

/** The migration folders v1.22.0 shipped. */
export function v122Migrations(): string[] {
  return listMigrations().filter((name) => name < V1_23_MIGRATIONS[0]);
}

export interface MigrateRun {
  applied: string[];
  skipped: string[];
}

/**
 * Applies pending migrations the way `scripts/migrate-turso.ts` does (that
 * script cannot be imported: it runs and exits on load). Same tracking
 * table, the folders sorted by name, each `migration.sql` read as UTF-8 and
 * run with `executeMultiple` outside a transaction, then recorded with a
 * random ID. `only` limits the folders, to build an older schema.
 */
export async function migrateLikeTurso(
  client: Client,
  only?: string[],
): Promise<MigrateRun> {
  const folders = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(
      (f) =>
        f !== "migration_lock.toml" &&
        fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory(),
    )
    .filter((f) => !only || only.includes(f))
    .sort();

  await client.execute(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id TEXT PRIMARY KEY,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const appliedResult = await client.execute(
    "SELECT migration_name FROM _prisma_migrations",
  );
  const already = new Set(
    appliedResult.rows.map((row) => row.migration_name as string),
  );

  const run: MigrateRun = { applied: [], skipped: [] };
  for (const folder of folders) {
    const file = path.join(MIGRATIONS_DIR, folder, "migration.sql");
    if (!fs.existsSync(file)) continue;
    if (already.has(folder)) {
      run.skipped.push(folder);
      continue;
    }
    await client.executeMultiple(fs.readFileSync(file, "utf-8"));
    await client.execute({
      sql: "INSERT INTO _prisma_migrations (id, migration_name) VALUES (?, ?)",
      args: [randomUUID(), folder],
    });
    run.applied.push(folder);
  }
  return run;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type Encoding = "iso" | "ms";

interface AuctionSeed {
  id: string;
  endOffsetMs: number;
  encoding: Encoding;
}

export interface ItemSeed {
  id: string;
  auctionId: string;
  /** Own end date relative to the seed time; null follows the auction. */
  endOffsetMs: number | null;
  winnerNotified: boolean;
  highestBidderId: string | null;
  currentBid: number | null;
  /** The v1.22.0 notifier's AUCTION_WON message, if it sent one. */
  wonBy?: { userId: string; offsetMs: number };
  note: string;
}

export const AUCTIONS: AuctionSeed[] = [
  // The reported charity case: ended, items notified, extended, new bids,
  // ended again yesterday.
  { id: "charity", endOffsetMs: -1 * DAY_MS, encoding: "iso" },
  // The same, but the extended end has not come yet.
  { id: "charity-running", endOffsetMs: 2 * DAY_MS, encoding: "iso" },
  { id: "old", endOffsetMs: -40 * DAY_MS, encoding: "iso" },
  // Older rows may hold epoch milliseconds instead of ISO text.
  { id: "recent-ms", endOffsetMs: -3 * DAY_MS, encoding: "ms" },
  { id: "old-ms", endOffsetMs: -20 * DAY_MS, encoding: "ms" },
  { id: "edge", endOffsetMs: -1 * DAY_MS, encoding: "iso" },
  { id: "live", endOffsetMs: 5 * DAY_MS, encoding: "iso" },
];

export const ITEMS: ItemSeed[] = [
  {
    id: "charity-follow",
    auctionId: "charity",
    endOffsetMs: null,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -5 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 150,
    note: "follows auction; Alice told, Bob leads after the extension",
  },
  {
    id: "charity-own",
    auctionId: "charity",
    endOffsetMs: -1 * DAY_MS,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -5 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 80,
    note: "own end 1d ago; Alice told, Bob leads",
  },
  {
    id: "charity-same",
    auctionId: "charity",
    endOffsetMs: -5 * DAY_MS,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -5 * DAY_MS },
    highestBidderId: "alice",
    currentBid: 60,
    note: "own end 5d ago; Alice told and still leads",
  },
  {
    id: "charity-new-follow",
    auctionId: "charity",
    endOffsetMs: null,
    winnerNotified: false,
    highestBidderId: "carol",
    currentBid: 40,
    note: "follows ended auction; never notified by v1.22.0",
  },
  {
    id: "running-follow",
    auctionId: "charity-running",
    endOffsetMs: null,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -6 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 70,
    note: "follows auction extended to +2d; Alice told, Bob leads",
  },
  {
    id: "running-pending",
    auctionId: "charity-running",
    endOffsetMs: null,
    winnerNotified: false,
    highestBidderId: "carol",
    currentBid: 30,
    note: "follows running auction; pending",
  },
  {
    id: "old-follow-changed",
    auctionId: "old",
    endOffsetMs: null,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -45 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 50,
    note: "follows auction ended 40d ago; winner changed",
  },
  {
    id: "old-own-changed",
    auctionId: "old",
    endOffsetMs: -30 * DAY_MS,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -45 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 55,
    note: "own end 30d ago; winner changed",
  },
  {
    id: "old-follow-unnotified",
    auctionId: "old",
    endOffsetMs: null,
    winnerNotified: false,
    highestBidderId: "carol",
    currentBid: 20,
    note: "follows auction ended 40d ago; never notified",
  },
  {
    id: "old-deleted",
    auctionId: "old",
    endOffsetMs: -40 * DAY_MS,
    winnerNotified: true,
    highestBidderId: "dave",
    currentBid: 90,
    note: "own end 40d ago; won notification deleted",
  },
  {
    id: "old-no-bidder",
    auctionId: "old",
    endOffsetMs: -40 * DAY_MS,
    winnerNotified: true,
    highestBidderId: null,
    currentBid: null,
    note: "own end 40d ago; no bids",
  },
  {
    id: "recent-ms-follow-changed",
    auctionId: "recent-ms",
    endOffsetMs: null,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -4 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 65,
    note: "follows auction ended 3d ago (epoch ms); winner changed",
  },
  {
    id: "old-ms-follow-changed",
    auctionId: "old-ms",
    endOffsetMs: null,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -25 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 45,
    note: "follows auction ended 20d ago (epoch ms); winner changed",
  },
  {
    id: "edge-13d",
    auctionId: "edge",
    endOffsetMs: -13 * DAY_MS,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -13.5 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 35,
    note: "own end 13d ago; winner changed",
  },
  {
    id: "edge-15d",
    auctionId: "edge",
    endOffsetMs: -15 * DAY_MS,
    winnerNotified: true,
    wonBy: { userId: "alice", offsetMs: -15.5 * DAY_MS },
    highestBidderId: "bob",
    currentBid: 25,
    note: "own end 15d ago; winner changed",
  },
  {
    id: "own-pending-ended",
    auctionId: "live",
    endOffsetMs: -2 * HOUR_MS,
    winnerNotified: false,
    highestBidderId: "carol",
    currentBid: 95,
    note: "own end 2h ago; v1.22.0 notifier has not run yet",
  },
  {
    id: "own-running",
    auctionId: "live",
    endOffsetMs: 1 * DAY_MS,
    winnerNotified: false,
    highestBidderId: "carol",
    currentBid: 15,
    note: "own end in 1d; pending",
  },
];

export const USERS = ["owner", "alice", "bob", "carol", "dave"];

/** Prisma's libSQL adapter writes DateTime values as ISO text like this. */
function iso(date: Date): string {
  return date.toISOString().replace("Z", "+00:00");
}

function dateValue(at: Date, encoding: Encoding): string | number {
  return encoding === "ms" ? at.getTime() : iso(at);
}

/**
 * Seeds the v1.22.0 data. Every write is raw SQL with only the columns
 * v1.22.0 has, so it works before the v1.23.0 migrations add theirs.
 */
export async function seedV122Data(
  db: Pick<PrismaClient, "$executeRawUnsafe">,
  now: Date,
): Promise<void> {
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);
  const created = iso(at(-60 * DAY_MS));

  await db.$executeRawUnsafe(
    `INSERT INTO "currencies" ("code", "name", "symbol") VALUES ('EUR', 'Euro', '€')`,
  );
  for (const id of USERS) {
    await db.$executeRawUnsafe(
      `INSERT INTO "users" ("id", "email", "name", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?)`,
      id,
      `${id}@example.test`,
      id,
      created,
      created,
    );
  }
  // Bob wants item-won e-mails, so the notifier's e-mails show up too.
  await db.$executeRawUnsafe(
    `INSERT INTO "user_settings" ("id", "userId", "emailOnItemWon", "updatedAt")
     VALUES ('settings-bob', 'bob', 1, ?)`,
    created,
  );
  for (const auction of AUCTIONS) {
    await db.$executeRawUnsafe(
      `INSERT INTO "auctions" ("id", "name", "creatorId", "endDate", "createdAt", "updatedAt")
       VALUES (?, ?, 'owner', ?, ?, ?)`,
      auction.id,
      auction.id,
      dateValue(at(auction.endOffsetMs), auction.encoding),
      created,
      created,
    );
  }
  for (const item of ITEMS) {
    await db.$executeRawUnsafe(
      `INSERT INTO "auction_items"
        ("id", "auctionId", "name", "currencyCode", "currentBid",
         "highestBidderId", "isPublished", "endDate", "winnerNotified",
         "createdAt", "updatedAt", "creatorId")
       VALUES (?, ?, ?, 'EUR', ?, ?, 1, ?, ?, ?, ?, 'owner')`,
      item.id,
      item.auctionId,
      item.id,
      item.currentBid,
      item.highestBidderId,
      item.endOffsetMs === null ? null : iso(at(item.endOffsetMs)),
      item.winnerNotified ? 1 : 0,
      created,
      created,
    );
    if (item.wonBy) {
      await db.$executeRawUnsafe(
        `INSERT INTO "notifications"
          ("id", "userId", "type", "title", "message", "auctionId", "itemId", "createdAt")
         VALUES (?, ?, 'AUCTION_WON', 'Congratulations! You won!', ?, ?, ?, ?)`,
        `won-${item.id}`,
        item.wonBy.userId,
        `You won "${item.id}"`,
        item.auctionId,
        item.id,
        iso(at(item.wonBy.offsetMs)),
      );
    }
  }
}

/** The AUCTION_WON notification time seeded for an item, as stored. */
export function seededWonAt(item: ItemSeed, now: Date): Date | null {
  return item.wonBy ? new Date(now.getTime() + item.wonBy.offsetMs) : null;
}

/**
 * The v1.22.0 notifier's database effects (`git show
 * v1.22.0:src/lib/services/auction-end.service.ts`): items with their own
 * end date before now, a highest bidder and `winnerNotified = false` get an
 * AUCTION_WON notification (and an item-won e-mail when enabled), then
 * `winnerNotified = true` and nothing else. It selects only columns v1.22.0
 * knows. Returns `itemId:userId` for each message, sorted.
 */
export async function runV122Notifier(db: PrismaClient): Promise<string[]> {
  const ended = await db.auctionItem.findMany({
    where: {
      endDate: { lt: new Date() },
      highestBidderId: { not: null },
      winnerNotified: false,
    },
    select: { id: true, name: true, auctionId: true, highestBidderId: true },
    take: 50,
  });
  const sent: string[] = [];
  for (const item of ended) {
    await db.notification.create({
      data: {
        userId: item.highestBidderId!,
        type: "AUCTION_WON",
        title: "Congratulations! You won!",
        message: `You won "${item.name}"`,
        auctionId: item.auctionId,
        itemId: item.id,
      },
    });
    await db.auctionItem.updateMany({
      where: { id: item.id },
      data: { winnerNotified: true },
    });
    sent.push(`${item.id}:${item.highestBidderId}`);
  }
  return sent.sort();
}

export const UPGRADE_SQL_DIR = path.join(
  process.cwd(),
  "scripts",
  "upgrade",
  "v1.23.0",
);

export function readUpgradeSql(name: string): string {
  return fs.readFileSync(path.join(UPGRADE_SQL_DIR, name), "utf-8");
}

/** Prints a titled table as test diagnostics, one line each. */
export function diagnoseTable(
  t: { diagnostic(message: string): void },
  title: string,
  rows: Record<string, unknown>[],
): void {
  t.diagnostic(title);
  for (const line of formatTable(rows).split("\n")) t.diagnostic(line);
}

/** Formats rows as a fixed-width text table. */
export function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "(no rows)";
  const columns = Object.keys(rows[0]);
  const cell = (value: unknown) =>
    value === null || value === undefined
      ? "-"
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => cell(row[column]).length)),
  );
  const line = (values: string[]) =>
    values.map((value, i) => value.padEnd(widths[i])).join(" | ");
  return [
    line(columns),
    widths.map((width) => "-".repeat(width)).join("-+-"),
    ...rows.map((row) => line(columns.map((column) => cell(row[column])))),
  ].join("\n");
}
