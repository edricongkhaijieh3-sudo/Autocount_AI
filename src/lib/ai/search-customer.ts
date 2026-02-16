/**
 * Customer search with exact + fuzzy matching (pg_trgm).
 * Used by invoice draft resolution and by chat "search customer" flows.
 */

import { prisma } from "@/lib/prisma";

export interface CustomerSearchResult {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  type: string;
  /** Only set when using pg_trgm (similarity score 0–1). */
  similarity?: number;
}

/** Check if pg_trgm is available (extension enabled). */
let pgTrgmAvailable: boolean | null = null;

async function checkPgTrgm(): Promise<boolean> {
  if (pgTrgmAvailable !== null) return pgTrgmAvailable;
  try {
    await prisma.$queryRawUnsafe(
      `SELECT similarity('a', 'a')`
    );
    pgTrgmAvailable = true;
  } catch {
    pgTrgmAvailable = false;
  }
  return pgTrgmAvailable;
}

/**
 * Search customers by name: exact match first, then fuzzy (pg_trgm) if available.
 * Prefers CUSTOMER type; falls back to any contact.
 */
export async function searchCustomers(
  companyId: string,
  query: string,
  limit = 10
): Promise<CustomerSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const useTrgm = await checkPgTrgm();

  if (useTrgm) {
    try {
      // pg_trgm: exact and fuzzy by similarity on name; prefer CUSTOMER
      const rows = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          name: string;
          code: string | null;
          email: string | null;
          phone: string | null;
          type: string;
          similarity: number;
        }>
      >(
        `SELECT c.id, c.name, c.code, c.email, c.phone, c.type::text,
                similarity(c.name, $2) AS similarity
         FROM "Contact" c
         WHERE c."companyId" = $1
           AND (c.name % $2 OR c.name ILIKE '%' || $2 || '%')
         ORDER BY (CASE c.type WHEN 'CUSTOMER' THEN 0 ELSE 1 END), similarity DESC NULLS LAST, c.name ASC
         LIMIT $3`,
        companyId,
        trimmed,
        limit
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        email: r.email,
        phone: r.phone,
        type: r.type,
        similarity: r.similarity,
      }));
    } catch (e) {
      // If raw query fails (e.g. extension not yet enabled), fall back to Prisma
    }
  }

  // Fallback: Prisma contains (no pg_trgm)
  const contacts = await prisma.contact.findMany({
    where: {
      companyId,
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
        { code: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      code: true,
      email: true,
      phone: true,
      type: true,
    },
    orderBy: [
      { type: "asc" },
      { name: "asc" },
    ],
    take: limit,
  });

  return contacts.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    email: c.email,
    phone: c.phone,
    type: c.type,
  }));
}

/**
 * Resolve a single contact by name for invoice/customer context.
 * Exact match first, then best fuzzy match. Prefers CUSTOMER.
 */
export async function resolveCustomerByName(
  companyId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const results = await searchCustomers(companyId, name, 5);
  if (results.length === 0) return null;

  const exact = results.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (exact) return { id: exact.id, name: exact.name };

  const customers = results.filter((c) => c.type === "CUSTOMER");
  const best = customers.length ? customers[0] : results[0];
  return { id: best.id, name: best.name };
}
