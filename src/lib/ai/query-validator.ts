const ALLOWED_OPERATIONS = [
  "findMany",
  "findFirst",
  "findUnique",
  "aggregate",
  "groupBy",
  "count",
];

const ALLOWED_MODELS = [
  "invoice",
  "invoiceLine",
  "journalEntry",
  "journalLine",
  "account",
  "contact",
];

const BLOCKED_KEYWORDS = [
  "create",
  "update",
  "delete",
  "upsert",
  "deleteMany",
  "updateMany",
  "createMany",
  "$executeRaw",
  "$queryRaw",
  "drop",
  "truncate",
];

export interface ValidatedQuery {
  model: string;
  operation: string;
  args: Record<string, any>;
  explanation: string;
}

export interface ValidationResult {
  valid: boolean;
  query?: ValidatedQuery;
  error?: string;
}

export function validateQuery(
  parsed: any,
  companyId: string
): ValidationResult {
  // Check for error responses from AI
  if (parsed.error) {
    return { valid: false, error: parsed.message || "Unable to process query" };
  }

  // Validate model
  if (!parsed.model || !ALLOWED_MODELS.includes(parsed.model)) {
    return {
      valid: false,
      error: `Invalid model: ${parsed.model}. Allowed: ${ALLOWED_MODELS.join(", ")}`,
    };
  }

  // Validate operation
  if (!parsed.operation || !ALLOWED_OPERATIONS.includes(parsed.operation)) {
    return {
      valid: false,
      error: `Invalid operation: ${parsed.operation}. Only read operations allowed.`,
    };
  }

  // Check for blocked keywords in the stringified args
  const argsStr = JSON.stringify(parsed.args || {}).toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (argsStr.includes(keyword.toLowerCase())) {
      return {
        valid: false,
        error: `Blocked keyword detected: ${keyword}. Only read operations allowed.`,
      };
    }
  }

  // Ensure companyId is present in where clause
  const args = parsed.args || {};
  if (!args.where) {
    args.where = {};
  }
  // Always enforce companyId - override whatever the AI generated
  args.where.companyId = companyId;

  // Add row limit for findMany
  if (parsed.operation === "findMany" && !args.take) {
    args.take = 100;
  }

  // Add take limit for groupBy
  if (parsed.operation === "groupBy" && !args.take) {
    args.take = 50;
  }

  return {
    valid: true,
    query: {
      model: parsed.model,
      operation: parsed.operation,
      args,
      explanation: parsed.explanation || "",
    },
  };
}
