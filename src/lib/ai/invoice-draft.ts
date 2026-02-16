/**
 * Conversational invoice creation: types and AI extraction for draft_invoice / update_draft_invoice.
 */

export interface InvoiceDraftLine {
  description: string;
  amount: number;
  quantity: number;
  taxRate?: number;
}

export interface InvoiceDraft {
  contactId: string;
  contactName: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  lineItems: InvoiceDraftLine[];
  subtotal: number;
  taxTotal: number;
  total: number;
  taxRateDefault: number;
  currency: string;
  notes?: string;
}

/** Raw extraction from AI (customer name, line items, due days, etc.) */
export interface InvoiceExtraction {
  customer_name: string;
  line_items: Array<{ description: string; amount: number; quantity?: number }>;
  due_days?: number;
  notes?: string;
  currency?: string;
}

const EXTRACTION_PROMPT = `You are an assistant that extracts invoice details from natural language.
Return ONLY a valid JSON object, no other text. Use this exact schema:
{
  "customer_name": "string - company or contact name, e.g. ABC Sdn Bhd",
  "line_items": [
    { "description": "string - item/service name", "amount": number - total for this line (e.g. 8500), "quantity": number - default 1 }
  ],
  "due_days": number - days until due (e.g. 30 for Net 30, 14 for Net 14). Omit or 30 if not stated,
  "notes": "string - optional notes",
  "currency": "string - MYR or other, default MYR"
}
Examples:
- "invoice ABC for 5000 consulting" -> {"customer_name":"ABC","line_items":[{"description":"Consulting","amount":5000,"quantity":1}],"due_days":30,"currency":"MYR"}
- "Create invoice for Syarikat Maju, RM 8,500 for website and RM 2,000 for hosting, due in 30 days" -> {"customer_name":"Syarikat Maju","line_items":[{"description":"Website","amount":8500,"quantity":1},{"description":"Hosting","amount":2000,"quantity":1}],"due_days":30,"currency":"MYR"}
Extract from the user message:`;

const UPDATE_EXTRACTION_PROMPT = `You are an assistant that updates an existing invoice draft based on the user's request.
You will receive the current draft (as JSON) and the user's message. Return ONLY a valid JSON object with the SAME schema as the draft's extraction form:
{
  "customer_name": "string - keep or change",
  "line_items": [ { "description": "string", "amount": number, "quantity": number } ],
  "due_days": number,
  "notes": "string or null",
  "currency": "string"
}
Apply only the changes the user asked for; leave everything else unchanged. If they add a line, add it to line_items. If they change due date, update due_days. Return the FULL updated object.`;

export function isInvoiceIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  if (t.length < 5) return false;
  const patterns = [
    /create\s+(an?\s+)?invoice/i,
    /invoice\s+(for|to)\s+/i,
    /(make|generate|prepare)\s+(an?\s+)?invoice/i,
    /bill\s+.+/i,
    /(send|issue)\s+(an?\s+)?invoice/i,
    /^invoice\s+/i,
    /draft\s+invoice/i,
    /(need|want)\s+to\s+(create|send|issue|make)\s+(an?\s+)?invoice/i,
    /\binvoice\s+for\s+/i,
    /\binvoice\s+.+\s+rm\s*\d/i,
    /\bbill\s+.+\s+(rm\s*)?\d/i,
  ];
  return patterns.some((p) => p.test(t));
}

export function isInvoiceEditIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  const patterns = [
    /change\s+(the\s+)?(due|date|amount|hosting|item)/i,
    /(make|update|set)\s+it\s+(to|net|due)/i,
    /add\s+(another\s+)?(line|item|rm\s*\d)/i,
    /(net\s+)?\d+\s+days/i,
    /due\s+(in\s+)?\d+/i,
    /edit\s+(the\s+)?(invoice|draft)/i,
    /(change|update)\s+.+/i,
  ];
  return patterns.some((p) => p.test(t));
}

export function isInvoiceApproveIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  return /^(approved?|send\s+it|looks?\s+good|confirm|yes,?\s+send|go\s+ahead|ok\s*!?)$/i.test(t) || /approve|send\s+(the\s+)?invoice|looks?\s+good\s*,?\s*send/i.test(t);
}

/** User agreeing to create a customer that was offered (e.g. after "customer not found" during invoice). Only use when pendingCustomerForInvoice is set. */
export function isYesAddCustomerIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  return (
    /^(yes|yeah|yep|ok|okay|sure|go\s+ahead|do\s+it|please|add\s+them|create\s+them)$/i.test(t) ||
    /yes,?\s*(add|create)\s*(them|the\s+customer)?/i.test(t) ||
    /add\s+(the\s+)?customer/i.test(t) ||
    /create\s+(the\s+)?customer/i.test(t)
  );
}

export function buildExtractionPrompt(userMessage: string): string {
  return `${EXTRACTION_PROMPT}\n\n"${userMessage}"`;
}

export function buildUpdateExtractionPrompt(
  userMessage: string,
  currentDraft: InvoiceDraft
): string {
  const draftForModel = {
    customer_name: currentDraft.contactName,
    line_items: currentDraft.lineItems.map((l) => ({
      description: l.description,
      amount: l.amount,
      quantity: l.quantity ?? 1,
    })),
    due_days: Math.round(
      (new Date(currentDraft.dueDate).getTime() - new Date(currentDraft.date).getTime()) /
        (24 * 60 * 60 * 1000)
    ),
    notes: currentDraft.notes ?? null,
    currency: currentDraft.currency,
  };
  return `${UPDATE_EXTRACTION_PROMPT}\n\nCurrent draft:\n${JSON.stringify(draftForModel, null, 2)}\n\nUser request: "${userMessage}"\n\nReturn only the full updated JSON object:`;
}

export function parseExtractionJson(text: string): InvoiceExtraction | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as InvoiceExtraction;
    if (!parsed.customer_name || !Array.isArray(parsed.line_items)) return null;
    return parsed;
  } catch {
    return null;
  }
}
