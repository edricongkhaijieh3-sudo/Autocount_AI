import { prisma } from "@/lib/prisma";
import type { InvoiceDraft, InvoiceDraftLine, InvoiceExtraction } from "./invoice-draft";
import { resolveCustomerByName } from "./search-customer";

const DEFAULT_TAX_RATE = 6;
const DEFAULT_CURRENCY = "MYR";

/** Resolve contact by name (exact + fuzzy via pg_trgm). Prefer CUSTOMER. Re-exported for callers that need it by this name. */
export const resolveContactByName = resolveCustomerByName;

export async function getNextInvoiceNo(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: {
      companyId,
      invoiceNo: { startsWith: `INV-${year}-` },
    },
  });
  return `INV-${year}-${String(count + 1).padStart(3, "0")}`;
}

/**
 * Build InvoiceDraft from AI extraction. Resolves contact, next invoice number, and applies default tax.
 */
export async function buildDraftFromExtraction(
  companyId: string,
  extraction: InvoiceExtraction
): Promise<{ draft: InvoiceDraft | null; contactNotFound?: string }> {
  const contact = await resolveContactByName(companyId, extraction.customer_name);
  const contactName = contact?.name ?? extraction.customer_name;
  const contactId = contact?.id;
  if (!contactId) {
    return {
      draft: null,
      contactNotFound: extraction.customer_name,
    };
  }

  const invoiceNo = await getNextInvoiceNo(companyId);
  const date = new Date();
  const dueDays = Math.min(365, Math.max(1, Number(extraction.due_days) || 30));
  const dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + dueDays);

  const lineItems: InvoiceDraftLine[] = extraction.line_items.map((item) => ({
    description: item.description || "Item",
    amount: Number(item.amount) || 0,
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    taxRate: DEFAULT_TAX_RATE,
  }));

  const subtotal = lineItems.reduce(
    (sum, line) => sum + line.amount * line.quantity,
    0
  );
  const taxTotal = lineItems.reduce(
    (sum, line) =>
      sum +
      line.amount *
        line.quantity *
        ((line.taxRate ?? DEFAULT_TAX_RATE) / 100),
    0
  );
  const total = subtotal + taxTotal;

  const draft: InvoiceDraft = {
    contactId,
    contactName,
    invoiceNo,
    date: date.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    lineItems,
    subtotal,
    taxTotal,
    total,
    taxRateDefault: DEFAULT_TAX_RATE,
    currency: extraction.currency || DEFAULT_CURRENCY,
    notes: extraction.notes || undefined,
  };
  return { draft };
}

/**
 * Apply an extraction update to an existing draft (e.g. after "change due date to 14 days").
 */
export function applyExtractionToDraft(
  current: InvoiceDraft,
  extraction: InvoiceExtraction
): InvoiceDraft {
  const contactName = extraction.customer_name || current.contactName;
  const dueDays = extraction.due_days ?? 30;
  const dueDate = new Date(current.date);
  dueDate.setDate(dueDate.getDate() + Math.min(365, Math.max(1, dueDays)));

  const lineItems: InvoiceDraftLine[] = (extraction.line_items ?? current.lineItems).map(
    (item: any) => ({
      description: item.description ?? "Item",
      amount: Number(item.amount) ?? 0,
      quantity: Math.max(0.01, Number(item.quantity) ?? 1),
      taxRate: current.taxRateDefault,
    })
  );

  const subtotal = lineItems.reduce(
    (sum, line) => sum + line.amount * line.quantity,
    0
  );
  const taxTotal = lineItems.reduce(
    (sum, line) =>
      sum +
      line.amount * line.quantity * ((line.taxRate ?? current.taxRateDefault) / 100),
    0
  );

  return {
    ...current,
    contactName,
    dueDate: dueDate.toISOString().slice(0, 10),
    lineItems,
    subtotal,
    taxTotal,
    total: subtotal + taxTotal,
    notes: extraction.notes !== undefined ? extraction.notes ?? undefined : current.notes,
  };
}

/**
 * Convert InvoiceDraft to the payload expected by POST /api/invoices.
 */
export function draftToInvoicePayload(draft: InvoiceDraft) {
  return {
    contactId: draft.contactId,
    date: draft.date,
    dueDate: draft.dueDate,
    notes: draft.notes || undefined,
    lines: draft.lineItems.map((line) => ({
      itemName: line.description,
      itemCode: "",
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.amount / line.quantity,
      discount: 0,
      taxRate: line.taxRate ?? draft.taxRateDefault,
    })),
  };
}

function calcLineAmount(
  quantity: number,
  unitPrice: number,
  discount: number,
  taxRate: number
): number {
  const subtotal = quantity * unitPrice * (1 - discount / 100);
  return subtotal * (1 + taxRate / 100);
}

/**
 * Create invoice in DB from draft (for Approve flow). Returns created invoice or error.
 */
export async function createInvoiceFromDraft(
  companyId: string,
  draft: InvoiceDraft
): Promise<{ id: string; invoiceNo: string } | { error: string }> {
  const invoiceNo = await getNextInvoiceNo(companyId);
  const lines = draft.lineItems.map((line, i) => {
    const qty = line.quantity;
    const unitPrice = line.amount / line.quantity;
    const taxRate = line.taxRate ?? draft.taxRateDefault;
    const amount = calcLineAmount(qty, unitPrice, 0, taxRate);
    return {
      itemName: line.description,
      itemCode: "",
      description: line.description,
      quantity: qty,
      unitPrice,
      discount: 0,
      taxRate,
      amount,
      sortOrder: i,
    };
  });

  try {
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        contactId: draft.contactId,
        invoiceNo,
        date: new Date(draft.date),
        dueDate: new Date(draft.dueDate),
        status: "DRAFT",
        docType: "INVOICE",
        subtotal: draft.subtotal,
        taxTotal: draft.taxTotal,
        total: draft.total,
        notes: draft.notes ?? null,
        lines: { create: lines },
      },
      select: { id: true, invoiceNo: true },
    });
    return { id: invoice.id, invoiceNo: invoice.invoiceNo };
  } catch (e: any) {
    return { error: e?.message || "Failed to create invoice" };
  }
}
