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

export interface SqlStatementResult {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

/**
 * Runs the statements in one write transaction and commits it, or rolls it
 * back when `dryRun` is set or a statement fails, so a file either applies
 * in full or not at all. There is no read-only guess from the statement
 * text (a `WITH ... UPDATE` or a `PRAGMA name = value` writes), so a file of
 * SELECTs is committed too, which changes nothing.
 */
export async function runSqlStatements(
  client: Client,
  statements: string[],
  options: { dryRun?: boolean } = {},
): Promise<SqlStatementResult[]> {
  const tx = await client.transaction("write");
  try {
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
    if (options.dryRun) {
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
