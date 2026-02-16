import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildSystemPrompt, buildResponsePrompt, buildContextAwarePrompt } from "@/lib/ai/system-prompt";
import { validateSQL } from "@/lib/ai/query-validator";
import { executeSQL } from "@/lib/ai/query-executor";
import Anthropic from "@anthropic-ai/sdk";
import type { InvoiceDraft, InvoiceExtraction } from "@/lib/ai/invoice-draft";
import {
  isInvoiceIntent,
  isInvoiceEditIntent,
  isInvoiceApproveIntent,
  isYesAddCustomerIntent,
  buildExtractionPrompt,
  buildUpdateExtractionPrompt,
  parseExtractionJson,
} from "@/lib/ai/invoice-draft";
import {
  buildDraftFromExtraction,
  applyExtractionToDraft,
  createInvoiceFromDraft,
} from "@/lib/ai/invoice-draft-builder";
import type { AnyCreateDraft } from "@/lib/ai/chat-create-types";
import {
  isContactCreateIntent,
  isAccountCreateIntent,
  isProductCreateIntent,
  isProductCategoryCreateIntent,
  isCurrencyCreateIntent,
  isTaxCodeCreateIntent,
  isTariffCodeCreateIntent,
  isTaxEntityCreateIntent,
  isCreateApproveIntent,
  getContactExtractPrompt,
  parseContactExtraction,
  getAccountExtractPrompt,
  parseAccountExtraction,
  getProductExtractPrompt,
  parseProductExtraction,
  getProductCategoryExtractPrompt,
  parseProductCategoryExtraction,
  getCurrencyExtractPrompt,
  parseCurrencyExtraction,
  getTaxCodeExtractPrompt,
  parseTaxCodeExtraction,
  getTariffCodeExtractPrompt,
  parseTariffCodeExtraction,
  getTaxEntityExtractPrompt,
  parseTaxEntityExtraction,
} from "@/lib/ai/chat-create-intents";
import { createEntityFromDraft } from "@/lib/ai/chat-create-approve";
import { searchCustomers } from "@/lib/ai/search-customer";
import { prisma } from "@/lib/prisma";

function getClaudeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

interface PageContext {
  currentPage?: string;
  currentAction?: string;
  pageDescription?: string;
  formData?: Record<string, unknown>;
  availableActions?: string[];
}

function isHelpQuestion(question: string, pageContext?: PageContext): boolean {
  const helpPatterns = [
    /what (do|should) i (put|fill|enter|write|select)/i,
    /how (do|should|can) i/i,
    /what (is|are|does) (this|that|the)/i,
    /help me/i,
    /explain/i,
    /what('s| is) (a|the) (difference|meaning)/i,
    /i('m| am) (confused|stuck|not sure|unsure)/i,
    /what (terms|payment|tax|discount)/i,
    /guide me/i,
    /walk me through/i,
    /step by step/i,
  ];

  // If user is actively filling a form and asks a question, likely help
  if (pageContext?.currentAction && pageContext.formData) {
    return helpPatterns.some((p) => p.test(question));
  }

  return helpPatterns.some((p) => p.test(question));
}

function getSearchCustomerQuery(question: string): string | null {
  const t = question.trim();
  const patterns: RegExp[] = [
    /find\s+(?:the\s+)?customer\s+(.+)/i,
    /search\s+(?:for\s+)?(?:the\s+)?customer\s+(.+)/i,
    /look\s+up\s+(?:the\s+)?customer\s+(.+)/i,
    /who\s+is\s+(?:the\s+)?customer\s+(.+)/i,
    /which\s+customer\s+(.+)/i,
    /customer\s+(?:named?\s+)?["']?(.+?)["']?\s*$/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { question, pageContext, currentDraft, currentCreateDraft, pendingCustomerForInvoice } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    );
  }

  const companyId = (session.user as any).companyId;
  const companyName = (session.user as any).companyName ?? "My Company";
  const draft = currentDraft as InvoiceDraft | undefined;
  const createDraft = currentCreateDraft as AnyCreateDraft | undefined;
  const pending = pendingCustomerForInvoice as { customerName: string; extraction: InvoiceExtraction } | undefined;

  try {
    const claude = getClaudeClient();

    // ─── Chain: create customer then invoice when user said "yes add them" after customer-not-found offer ───
    if (pending && (isYesAddCustomerIntent(question) || isCreateApproveIntent(question))) {
      const contact = await prisma.contact.create({
        data: {
          companyId,
          name: pending.customerName,
          type: "CUSTOMER",
        },
      });
      const result = await buildDraftFromExtraction(companyId, pending.extraction);
      if (result.draft) {
        const dueLabel = result.draft.dueDate
          ? ` Due ${new Date(result.draft.dueDate).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}.`
          : "";
        return NextResponse.json({
          response: `I've added **${contact.name}** as a customer. Here’s your invoice draft.${dueLabel} Say **approved** to save the invoice.`,
          invoiceDraft: result.draft,
          contactCreatedForInvoice: true,
        });
      }
    }

    // ─── Approve any create draft (contact, account, product, etc.) ───
    if (createDraft?.draftType && isCreateApproveIntent(question)) {
      const result = await createEntityFromDraft(createDraft, companyId);
      if (!result.success) {
        return NextResponse.json({
          response: `Couldn't save: ${result.error}. You can try again or add it from the relevant page.`,
        });
      }
      const entityLabel = createDraft.draftType === "contact" ? "Contact"
        : createDraft.draftType === "account" ? "Account"
        : createDraft.draftType === "product" ? "Product"
        : createDraft.draftType === "productCategory" ? "Category"
        : createDraft.draftType === "currency" ? "Currency"
        : createDraft.draftType === "taxCode" ? "Tax code"
        : createDraft.draftType === "tariffCode" ? "Tariff code"
        : "Tax entity";
      return NextResponse.json({
        response: `${entityLabel} **${result.name}** has been created. You can find it in the relevant section.`,
        createDraftApproved: true,
      });
    }

    // ─── Invoice: Approve (create invoice in DB) ─────────────────────
    if (draft && isInvoiceApproveIntent(question)) {
      const result = await createInvoiceFromDraft(companyId, draft);
      if ("error" in result) {
        return NextResponse.json({
          response: `Couldn't create the invoice: ${result.error}. Please try again or create it from the Invoices page.`,
        });
      }
      return NextResponse.json({
        response: `Invoice **${result.invoiceNo}** has been created and saved. You can view or send it from the Invoices page.`,
        invoiceCreated: true,
      });
    }

    // ─── Invoice: Edit existing draft ─────────────────────────────────
    if (draft && isInvoiceEditIntent(question)) {
      const res = await handleInvoiceDraftUpdate(claude, question, draft);
      if (res) return res;
    }

    // ─── Invoice: New draft from natural language ────────────────────
    if (isInvoiceIntent(question) && !draft) {
      const res = await handleInvoiceDraftCreate(claude, question, companyId, companyName);
      if (res) return res;
    }

    // ─── Create: Contact (customer/supplier) ────────────────────────
    if (isContactCreateIntent(question)) {
      const res = await handleCreateIntent(claude, question, getContactExtractPrompt, (t) => parseContactExtraction(t) as AnyCreateDraft | null, "contact");
      if (res) return NextResponse.json({ response: res.response, contactDraft: res.draft });
    }

    // ─── Create: Account ─────────────────────────────────────────────
    if (isAccountCreateIntent(question)) {
      const res = await handleCreateIntent(claude, question, getAccountExtractPrompt, (t) => parseAccountExtraction(t) as AnyCreateDraft | null, "account");
      if (res) return NextResponse.json({ response: res.response, accountDraft: res.draft });
    }

    // ─── Create: Product ─────────────────────────────────────────────
    if (isProductCreateIntent(question)) {
      const res = await handleCreateProduct(claude, question, companyId);
      if (res) return NextResponse.json({ response: res.response, productDraft: res.draft });
    }

    // ─── Create: Product Category ───────────────────────────────────
    if (isProductCategoryCreateIntent(question)) {
      const res = await handleCreateIntent(claude, question, getProductCategoryExtractPrompt, (t) => parseProductCategoryExtraction(t) as AnyCreateDraft | null, "productCategory");
      if (res) return NextResponse.json({ response: res.response, productCategoryDraft: res.draft });
    }

    // ─── Create: Currency ────────────────────────────────────────────
    if (isCurrencyCreateIntent(question)) {
      const res = await handleCreateIntent(claude, question, getCurrencyExtractPrompt, (t) => parseCurrencyExtraction(t) as AnyCreateDraft | null, "currency");
      if (res) return NextResponse.json({ response: res.response, currencyDraft: res.draft });
    }

    // ─── Create: Tax Code ───────────────────────────────────────────
    if (isTaxCodeCreateIntent(question)) {
      const res = await handleCreateIntent(claude, question, getTaxCodeExtractPrompt, (t) => parseTaxCodeExtraction(t) as AnyCreateDraft | null, "taxCode");
      if (res) return NextResponse.json({ response: res.response, taxCodeDraft: res.draft });
    }

    // ─── Create: Tariff Code ─────────────────────────────────────────
    if (isTariffCodeCreateIntent(question)) {
      const res = await handleCreateIntent(claude, question, getTariffCodeExtractPrompt, (t) => parseTariffCodeExtraction(t) as AnyCreateDraft | null, "tariffCode");
      if (res) return NextResponse.json({ response: res.response, tariffCodeDraft: res.draft });
    }

    // ─── Create: Tax Entity ──────────────────────────────────────────
    if (isTaxEntityCreateIntent(question)) {
      const res = await handleCreateIntent(claude, question, getTaxEntityExtractPrompt, (t) => parseTaxEntityExtraction(t) as AnyCreateDraft | null, "taxEntity");
      if (res) return NextResponse.json({ response: res.response, taxEntityDraft: res.draft });
    }

    // ─── Search customer (exact + fuzzy) ───────────────────────────────
    const searchQuery = getSearchCustomerQuery(question);
    if (searchQuery) {
      const res = await handleSearchCustomer(companyId, searchQuery);
      if (res) return res;
    }

    // Determine if this is a help/guidance question or a data question
    const helpMode = isHelpQuestion(question, pageContext as PageContext);

    if (helpMode && pageContext?.currentPage) {
      return await handleContextAwareHelp(claude, question, companyName, pageContext as PageContext);
    }

    // Default: data query mode
    return await handleDataQuery(claude, question, companyId, companyName);
  } catch (error: any) {
    console.error("Chat error:", error?.message || error);
    return handleAPIError(error);
  }
}

/**
 * Search customers (exact + fuzzy) and return a formatted response.
 */
async function handleSearchCustomer(
  companyId: string,
  query: string
): Promise<NextResponse | null> {
  const results = await searchCustomers(companyId, query, 8);
  if (results.length === 0) {
    return NextResponse.json({
      response: `No customers found for **${query}**. I can add them here—say **Add customer ${query}** (or include email/phone, e.g. "Add customer ${query}, email x@y.com").`,
    });
  }
  const lines = results.map((c, i) => {
    const parts = [c.name];
    if (c.email) parts.push(c.email);
    if (c.phone) parts.push(c.phone);
    return `${i + 1}. **${c.name}**${c.code ? ` (${c.code})` : ""}${c.email ? ` — ${c.email}` : ""}${c.phone ? ` — ${c.phone}` : ""}`;
  });
  return NextResponse.json({
    response: `I found ${results.length} customer${results.length === 1 ? "" : "s"}:\n\n${lines.join("\n")}\n\nYou can create an invoice for any of them by name, or say **Add customer [name]** to add a new one.`,
  });
}

/**
 * Create a new invoice draft from natural language (e.g. "invoice ABC for 5000 consulting").
 */
async function handleInvoiceDraftCreate(
  claude: Anthropic,
  question: string,
  companyId: string,
  companyName: string
) {
  const prompt = buildExtractionPrompt(question);
  const response = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const extraction = parseExtractionJson(text);
  if (!extraction) {
    return NextResponse.json({
      response: "I couldn't parse the invoice details from that. Try: \"Create an invoice for [Customer Name], RM [amount] for [description], due in 30 days\". If the customer isn't in the list, I can add them here—just say **Yes, add them** when I offer.",
    });
  }
  const result = await buildDraftFromExtraction(companyId, extraction);
  if (result.contactNotFound) {
    return NextResponse.json({
      response: `I couldn't find a customer named **${result.contactNotFound}**. I can add them here—say **Yes, add them** and I'll create the customer, then create the invoice. If you have their email or phone, you can include it (e.g. "Yes, add them, email abc@company.com").`,
      contactNotFound: result.contactNotFound,
      extraction,
    });
  }
  const draft = result.draft;
  if (!draft) return null;
  const dueLabel = draft.dueDate ? `Due ${new Date(draft.dueDate).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}` : "";
  return NextResponse.json({
    response: `Here’s a draft invoice for **${draft.contactName}** (${draft.invoiceNo}). ${dueLabel}. Review it below — you can say "change the due date to 14 days", "add RM 500 for travel", or "approved" to save it.`,
    invoiceDraft: draft,
  });
}

/**
 * Update an existing invoice draft from natural language (e.g. "change due date to 14 days").
 */
async function handleInvoiceDraftUpdate(
  claude: Anthropic,
  question: string,
  currentDraft: InvoiceDraft
) {
  const prompt = buildUpdateExtractionPrompt(question, currentDraft);
  const response = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const extraction = parseExtractionJson(text);
  if (!extraction) {
    return NextResponse.json({
      response: "I couldn't apply that change. Try: \"change due date to 14 days\", \"add RM 500 for travel expenses\", or \"approved\" to save.",
      invoiceDraft: currentDraft,
    });
  }
  const updated = applyExtractionToDraft(currentDraft, extraction);
  return NextResponse.json({
    response: "Draft updated. Say \"approved\" to save the invoice, or ask for more changes.",
    invoiceDraft: updated,
  });
}

/**
 * Generic create-intent handler: extract with Claude, parse, return draft.
 */
async function handleCreateIntent<T extends AnyCreateDraft>(
  claude: Anthropic,
  question: string,
  getPrompt: (q: string) => string,
  parse: (text: string) => T | null,
  draftType: string
): Promise<{ response: string; draft: T } | null> {
  const response = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [{ role: "user", content: getPrompt(question) }],
    temperature: 0.2,
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const draft = parse(text);
  if (!draft) {
    return null;
  }
  const name = "name" in draft ? (draft as { name: string }).name : "code" in draft ? (draft as { code: string }).code : (draft as { entityName: string }).entityName;
  return {
    response: `Here’s a draft **${draftType}**: **${name}**. Review below — say **approve** or **save it** to create it.`,
    draft,
  };
}

/**
 * Create product with optional category resolution by name.
 */
async function handleCreateProduct(
  claude: Anthropic,
  question: string,
  companyId: string
): Promise<{ response: string; draft: AnyCreateDraft } | null> {
  const res = await handleCreateIntent(claude, question, getProductExtractPrompt, (t) => parseProductExtraction(t) as AnyCreateDraft | null, "product");
  if (!res) return null;
  const draft = res.draft as AnyCreateDraft & { categoryName?: string };
  if ("categoryName" in draft && draft.categoryName) {
    const cat = await prisma.productCategory.findFirst({
      where: { companyId, name: { contains: String(draft.categoryName), mode: "insensitive" } },
    });
    if (cat && "categoryId" in draft) (draft as { categoryId?: string }).categoryId = cat.id;
  }
  if ("categoryName" in draft) delete (draft as unknown as Record<string, unknown>).categoryName;
  return { response: res.response, draft };
}

/**
 * Handles context-aware help questions — gives guidance based on current page/action.
 */
async function handleContextAwareHelp(
  claude: Anthropic,
  question: string,
  companyName: string,
  pageContext: PageContext
) {
  const systemPrompt = buildContextAwarePrompt({
    companyName,
    currentPage: pageContext.currentPage || "dashboard",
    currentAction: pageContext.currentAction,
    pageDescription: pageContext.pageDescription,
    formData: pageContext.formData,
    availableActions: pageContext.availableActions,
  });

  const response = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
    temperature: 0.4,
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  // Check if the context-aware handler decided this is actually a data query
  try {
    const parsed = JSON.parse(text);
    if (parsed.sql_query) {
      // Re-route to data query handler
      const companyId = ""; // Will be fetched from session in the data handler
      return NextResponse.json({
        response: "Let me look that up for you...",
        reroute: "data_query",
      });
    }
  } catch {
    // Not JSON, that's fine — it's a normal text response
  }

  return NextResponse.json({ response: text });
}

/**
 * Handles data questions — generates SQL, executes, and formats results.
 */
async function handleDataQuery(
  claude: Anthropic,
  question: string,
  companyId: string,
  companyName: string
) {
  const systemPrompt = buildSystemPrompt({
    companyId,
    companyName,
    currency: "MYR",
    currentDate: new Date().toISOString().split("T")[0],
  });

  const sqlResponse = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
    temperature: 0,
  });

  const aiText =
    sqlResponse.content[0]?.type === "text"
      ? sqlResponse.content[0].text
      : "";

  let parsed: { sql?: string; explanation?: string; error?: boolean; message?: string };
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({
      response: aiText || "I had trouble understanding that. Could you rephrase?",
    });
  }

  if (parsed.error) {
    return NextResponse.json({
      response: parsed.message || "I can only answer questions about your business data.",
    });
  }

  if (!parsed.sql) {
    return NextResponse.json({
      response: parsed.message || "I couldn't generate a query for that question. Try asking about sales, invoices, expenses, or customers.",
    });
  }

  const validation = validateSQL(parsed.sql, companyId);
  if (!validation.valid) {
    console.warn("SQL validation failed:", validation.error, "SQL:", parsed.sql);
    return NextResponse.json({
      response: "I generated a query but it didn't pass safety checks. Could you try rephrasing your question?",
    });
  }

  const result = await executeSQL(validation.sql!);
  if (!result.success) {
    const retryResponse = await claude.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: "user", content: question },
        { role: "assistant", content: aiText },
        {
          role: "user",
          content: `The SQL query failed with error: "${result.error}". Please fix the query and try again. Remember to use double quotes for PascalCase table names and camelCase column names. Return the same JSON format.`,
        },
      ],
      temperature: 0,
    });

    const retryText =
      retryResponse.content[0]?.type === "text"
        ? retryResponse.content[0].text
        : "";

    let retryParsed: { sql?: string; explanation?: string } | null = null;
    try {
      const retryMatch = retryText.match(/\{[\s\S]*\}/);
      if (retryMatch) retryParsed = JSON.parse(retryMatch[0]);
    } catch { /* ignore */ }

    if (retryParsed?.sql) {
      const retryValidation = validateSQL(retryParsed.sql, companyId);
      if (retryValidation.valid) {
        const retryResult = await executeSQL(retryValidation.sql!);
        if (retryResult.success) {
          return await formatAndRespond(
            claude,
            question,
            retryResult.data,
            retryParsed.explanation || parsed.explanation || ""
          );
        }
      }
    }

    return NextResponse.json({
      response: result.error?.includes("timeout")
        ? "That query is taking too long. Try narrowing your question to a specific date range or fewer results."
        : "I had trouble fetching that data. Could you try rephrasing your question?",
    });
  }

  return await formatAndRespond(
    claude,
    question,
    result.data,
    parsed.explanation || ""
  );
}

/**
 * Sends raw query results to Claude for human-friendly formatting.
 */
async function formatAndRespond(
  claude: Anthropic,
  question: string,
  data: any,
  explanation: string
) {
  const responsePrompt = buildResponsePrompt(question, data, "RM", explanation);

  const formatted = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [{ role: "user", content: responsePrompt }],
    temperature: 0.3,
  });

  const responseText =
    formatted.content[0]?.type === "text"
      ? formatted.content[0].text
      : "I found the data but had trouble formatting it. Please try again.";

  return NextResponse.json({ response: responseText });
}

/**
 * Maps common Anthropic API errors to user-friendly messages.
 */
function handleAPIError(error: any) {
  const msg = (error?.message || "").toLowerCase();

  if (msg.includes("api key") && (msg.includes("not set") || msg.includes("invalid"))) {
    return NextResponse.json({
      response: "The AI assistant is not configured yet. Please set the ANTHROPIC_API_KEY.",
    });
  }
  if (error?.status === 429 || msg.includes("rate") || msg.includes("quota")) {
    return NextResponse.json({
      response: "The AI is temporarily rate-limited. Please wait a moment and try again.",
    });
  }
  if (error?.status === 401 || msg.includes("authentication")) {
    return NextResponse.json({
      response: "The AI API key appears to be invalid. Please check your ANTHROPIC_API_KEY.",
    });
  }
  if (error?.status === 402 || msg.includes("billing") || msg.includes("credit")) {
    return NextResponse.json({
      response: "Your Anthropic account needs billing set up. Check https://console.anthropic.com.",
    });
  }

  return NextResponse.json({
    response: `Something went wrong. Please try again.`,
  });
}
