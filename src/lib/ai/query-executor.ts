/**
 * SQL Executor
 *
 * Runs validated, read-only SQL against the Neon database
 * using a separate pg pool connection. The query has already
 * been validated by query-validator.ts before reaching here.
 */

import pg from "pg";

const QUERY_TIMEOUT_MS = 8000;

// Create a dedicated pool for AI queries (separate from Prisma)
let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,                // Small pool — AI queries shouldn't hog connections
      idleTimeoutMillis: 30000,
      statement_timeout: QUERY_TIMEOUT_MS, // DB-level timeout as safety net
    });
  }
  return _pool;
}

export interface QueryResult {
  success: boolean;
  data?: Record<string, any>[];
  rowCount?: number;
  error?: string;
}

export async function executeSQL(sql: string): Promise<QueryResult> {
  const pool = getPool();

  try {
    // Race the query against a timeout
    const result = await Promise.race<pg.QueryResult>([
      pool.query(sql),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Query timeout: exceeded 8 seconds")),
          QUERY_TIMEOUT_MS
        )
      ),
    ]);

    return {
      success: true,
      data: result.rows,
      rowCount: result.rowCount ?? 0,
    };
  } catch (error: any) {
    console.error("AI query execution error:", error.message);

    if (error.message?.includes("timeout")) {
      return {
        success: false,
        error:
          "The query took too long. Try narrowing your question to a specific date range or fewer results.",
      };
    }

    if (error.message?.includes("permission denied")) {
      return {
        success: false,
        error: "Permission denied — the query tried to access restricted data.",
      };
    }

    return {
      success: false,
      error: `Query failed: ${error.message}`,
    };
  }
}
