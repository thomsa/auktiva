import fs from "node:fs";
import path from "node:path";

type RawExecutor = {
  $executeRawUnsafe(query: string): Promise<unknown>;
};

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

/** Migration folder names in the order Prisma applies them. */
export function listMigrations(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) =>
      fs.existsSync(path.join(MIGRATIONS_DIR, name, "migration.sql")),
    )
    .sort();
}

/**
 * Test helper: runs checked-in migrations against a (throwaway) database one
 * statement at a time. Splits on statement-ending semicolons, so it does not
 * support migrations with triggers.
 */
export async function applyMigrations(
  db: RawExecutor,
  migrations: string[] = listMigrations(),
): Promise<void> {
  for (const name of migrations) {
    const statements = fs
      .readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8")
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(/;\s*(?:\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await db.$executeRawUnsafe(statement);
    }
  }
}
