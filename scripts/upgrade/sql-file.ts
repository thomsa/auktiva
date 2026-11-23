import type { Client } from "@libsql/client";

/**
 * Splits an SQL file into statements: drops whole-line `--` comments and
 * splits on a semicolon that ends a line. This is the rule the migration
 * test helper (`src/lib/testing/apply-migrations.ts`) uses, so files written
 * for it run the same way here. Triggers are not supported.
 */
export function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/**
 * A file that must never write declares it on a line of its own:
 *
 *     -- run-sql: read-only
 *
 * `scripts/upgrade/run-sql.ts` then runs it read-only even without
 * `--read-only`.
 */
export function declaresReadOnly(sql: string): boolean {
  return /^--\s*run-sql:\s*read-only\s*$/im.test(sql);
}

const TRANSACTION_CONTROL = /^(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b/i;

export interface SqlStatementResult {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

export interface RunSqlOptions {
  /** Run everything, report the effect, then roll it back. */
  dryRun?: boolean;
  /**
   * Run in a read transaction (`BEGIN TRANSACTION READONLY`), which a
   * read-only Turso token can open, and always roll it back. On a local
   * `file:` database the connection is also set to `PRAGMA query_only`, so
   * a write statement fails instead of only being rolled back.
   */
  readOnly?: boolean;
}

/**
 * Runs the statements in one transaction and commits it, or rolls it back
 * when `dryRun` or `readOnly` is set or a statement fails, so a file either
 * applies in full or not at all. Without `readOnly` it is a write
 * transaction: there is no read-only guess from the statement text (a
 * `WITH ... UPDATE` or a `PRAGMA name = value` writes), so a file of
 * SELECTs is committed too, which changes nothing. Statements that would
 * end or nest the runner's transaction (`BEGIN`, `COMMIT`, `ROLLBACK`, ...)
 * are refused before anything runs.
 */
export async function runSqlStatements(
  client: Client,
  statements: string[],
  options: RunSqlOptions = {},
): Promise<SqlStatementResult[]> {
  const control = statements.find((sql) => TRANSACTION_CONTROL.test(sql));
  if (control) {
    throw new Error(
      `The runner manages the transaction; remove this statement: ${control.split("\n")[0]}`,
    );
  }

  const tx = await client.transaction(options.readOnly ? "read" : "write");
  try {
    if (options.readOnly && client.protocol === "file") {
      // A local read transaction does not refuse writes by itself. The
      // transaction owns this connection, so the setting ends with it.
      await tx.execute("PRAGMA query_only = ON");
    }
    const results: SqlStatementResult[] = [];
    for (const sql of statements) {
      const rs = await tx.execute(sql);
      results.push({
        sql,
        columns: rs.columns,
        rows: rs.rows.map((row) =>
          Object.fromEntries(rs.columns.map((name, i) => [name, row[i]])),
        ),
        rowsAffected: rs.rowsAffected,
      });
    }
    if (options.dryRun || options.readOnly) {
      await tx.rollback();
    } else {
      await tx.commit();
    }
    return results;
  } finally {
    // Closing a transaction that was neither committed nor rolled back
    // (a statement failed) rolls it back.
    tx.close();
  }
}
