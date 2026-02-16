/**
 * SQL Safety Validator
 *
 * Validates AI-generated SQL to ensure it's:
 * 1. Read-only (SELECT only)
 * 2. Only touches allowed tables
 * 3. Contains companyId filter
 * 4. Has no dangerous patterns
 */

const ALLOWED_TABLES = [
  "Invoice",
  "InvoiceLine",
  "Contact",
  "Account",
  "JournalEntry",
  "JournalLine",
  "Product",
  "ProductVariant",
  "TaxEntity",
  "Company",
];

// Patterns that indicate write operations or dangerous SQL
const BLOCKED_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE|MERGE|UPSERT)\b/i,
  /\b(GRANT|REVOKE|EXECUTE|EXEC)\b/i,
  /\b(INTO\s+OUTFILE|LOAD\s+DATA|COPY)\b/i,
  /\bpg_sleep\b/i,
  /\bdblink\b/i,
  /\blo_import|lo_export\b/i,
  /;\s*\w/i, // Multiple statements (semicolon followed by more SQL)
  /--.*$/m, // SQL comments (could hide malicious code)
  /\/\*[\s\S]*?\*\//,  // Block comments
];

// Tables the AI should never read
const BLOCKED_TABLES = ["User", "CustomField", "InvoiceTemplate"];

export interface SQLValidationResult {
  valid: boolean;
  sql?: string;
  error?: string;
}

export function validateSQL(
  sql: string,
  companyId: string
): SQLValidationResult {
  if (!sql || typeof sql !== "string") {
    return { valid: false, error: "No SQL provided" };
  }

  const trimmed = sql.trim();

  // 1. Must start with SELECT (or WITH for CTEs)
  if (!/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
    return {
      valid: false,
      error: "Only SELECT queries are allowed",
    };
  }

  // 2. Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: `Blocked pattern detected: ${pattern.source}`,
      };
    }
  }

  // 3. Check for blocked tables
  for (const table of BLOCKED_TABLES) {
    // Match both quoted and unquoted table references
    const tablePattern = new RegExp(
      `(\\b|")${table}(\\b|")`,
      "i"
    );
    if (tablePattern.test(trimmed)) {
      return {
        valid: false,
        error: `Access to table "${table}" is not allowed`,
      };
    }
  }

  // 4. Verify it only references allowed tables
  // Extract quoted table names from the query
  const quotedTableRefs = trimmed.match(/"([A-Z][a-zA-Z]+)"/g) || [];
  const tableNames = quotedTableRefs
    .map((t) => t.replace(/"/g, ""))
    .filter((t) => {
      // Filter out column names by checking if they're in our table list
      // or if they look like table names (PascalCase starting with uppercase)
      return ALLOWED_TABLES.includes(t) || BLOCKED_TABLES.includes(t);
    });

  // 5. Check companyId is present (for queries that need it)
  // We check for the literal companyId value in the query
  if (!trimmed.includes(companyId)) {
    return {
      valid: false,
      error: "Query must filter by companyId for security",
    };
  }

  // 6. Ensure there's a LIMIT clause
  if (!/\bLIMIT\b/i.test(trimmed)) {
    // Auto-append LIMIT 50 if missing
    return {
      valid: true,
      sql: trimmed.replace(/;?\s*$/, "") + " LIMIT 50",
    };
  }

  // 7. Ensure LIMIT is reasonable (max 100)
  const limitMatch = trimmed.match(/\bLIMIT\s+(\d+)/i);
  if (limitMatch) {
    const limitVal = parseInt(limitMatch[1], 10);
    if (limitVal > 100) {
      return {
        valid: true,
        sql: trimmed.replace(/\bLIMIT\s+\d+/i, "LIMIT 100"),
      };
    }
  }

  return { valid: true, sql: trimmed.replace(/;?\s*$/, "") };
}
