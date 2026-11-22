#!/usr/bin/env npx tsx
/**
 * Runs an upgrade SQL file against DATABASE_URL (Turso `libsql://` or
 * `https://`, or a local SQLite `file:` path) and prints each statement's
 * result. The whole file runs in one transaction: it applies in full, or
 * (on an error, or with --dry-run) not at all.
 *
 * Usage:
 *   npx tsx scripts/upgrade/run-sql.ts [--dry-run] <file.sql>
 *
 * Reads DATABASE_URL and DATABASE_AUTH_TOKEN from the environment or .env,
 * like scripts/migrate-turso.ts. It does not record anything in
 * _prisma_migrations; use `npm run db:migrate:turso` for Turso migrations.
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import "dotenv/config";
import { runSqlStatements, splitSqlStatements } from "./sql-file";

function describeTarget(url: string): string {
  if (url.startsWith("file:")) return url;
  try {
    const { protocol, host } = new URL(url);
    return `${protocol}//${host}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const files = args.filter((arg) => arg !== "--dry-run");
  if (files.length !== 1) {
    console.error(
      "Usage: npx tsx scripts/upgrade/run-sql.ts [--dry-run] <file.sql>",
    );
    process.exit(2);
  }
  const [file] = files;

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  if (!/^(libsql:\/\/|https:\/\/|file:)/.test(url)) {
    console.error("DATABASE_URL must start with libsql://, https:// or file:");
    process.exit(1);
  }

  const statements = splitSqlStatements(fs.readFileSync(file, "utf-8"));
  if (statements.length === 0) {
    console.error(`No SQL statements in ${file}`);
    process.exit(1);
  }

  console.log(`Database: ${describeTarget(url)}`);
  console.log(
    `File: ${file} (${statements.length} statement(s))${dryRun ? " [dry run]" : ""}`,
  );

  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  try {
    const results = await runSqlStatements(client, statements, { dryRun });
    results.forEach((result, i) => {
      const firstLine = result.sql.split("\n")[0];
      console.log("");
      console.log(`[${i + 1}/${results.length}] ${firstLine}`);
      if (result.columns.length > 0) {
        if (result.rows.length === 0) {
          console.log("(no rows)");
        } else {
          console.table(result.rows);
        }
      } else {
        console.log(`rows affected: ${result.rowsAffected}`);
      }
    });
    console.log("");
    console.log(
      dryRun
        ? "Dry run: rolled back, nothing was changed."
        : "Done.",
    );
  } catch (error) {
    console.error("");
    console.error("Failed; the transaction was rolled back, nothing was changed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
