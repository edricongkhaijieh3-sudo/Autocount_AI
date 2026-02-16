/**
 * Intent detection and extraction prompts for AI-driven create flows.
 * Each create type has: isIntent(question), getPrompt(question), parseResponse(text).
 */

import type {
  ContactDraft,
  AccountDraft,
  ProductDraft,
  ProductCategoryDraft,
  CurrencyDraft,
  TaxCodeDraft,
  TariffCodeDraft,
  TaxEntityDraft,
} from "./chat-create-types";

function parseJson<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// ─── Contact (Customer / Supplier) ────────────────────────────────

export function isContactCreateIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  if (t.length < 6) return false;
  return (
    /add\s+(a\s+)?(customer|supplier|contact|vendor)/i.test(t) ||
    /create\s+(a\s+)?(customer|supplier|contact|vendor)/i.test(t) ||
    /new\s+(customer|supplier|contact|vendor)/i.test(t) ||
    /(customer|supplier|contact)\s+named\s+/i.test(t) ||
    /register\s+(a\s+)?(customer|supplier)/i.test(t)
  );
}

const CONTACT_EXTRACT_PROMPT = `Extract contact details from the user message. Return ONLY valid JSON:
{
  "name": "string - company or person name (required)",
  "email": "string or null",
  "phone": "string or null",
  "type": "CUSTOMER" or "VENDOR" or "BOTH" - default CUSTOMER",
  "billingAddress": "string or null",
  "creditTerms": "string e.g. Net 30 or null",
  "creditLimit": number or null
}
Examples:
- "Add customer ABC Sdn Bhd, email abc@example.com" -> {"name":"ABC Sdn Bhd","email":"abc@example.com","phone":null,"type":"CUSTOMER","billingAddress":null,"creditTerms":null,"creditLimit":null}
- "Create supplier Office World, phone 03-1111 0000" -> {"name":"Office World","email":null,"phone":"03-1111 0000","type":"VENDOR","billingAddress":null,"creditTerms":null,"creditLimit":null}
User message:`;

export function getContactExtractPrompt(question: string): string {
  return `${CONTACT_EXTRACT_PROMPT}\n"${question}"`;
}

export function parseContactExtraction(text: string): Partial<ContactDraft> | null {
  const raw = parseJson<Record<string, unknown>>(text);
  if (!raw || !raw.name || typeof raw.name !== "string") return null;
  const type = (raw.type === "VENDOR" ? "VENDOR" : raw.type === "BOTH" ? "BOTH" : "CUSTOMER") as "CUSTOMER" | "VENDOR" | "BOTH";
  return {
    draftType: "contact",
    name: String(raw.name).trim(),
    code: raw.code != null ? String(raw.code).trim() : undefined,
    email: raw.email != null ? String(raw.email).trim() : undefined,
    phone: raw.phone != null ? String(raw.phone).trim() : undefined,
    billingAddress: raw.billingAddress != null ? String(raw.billingAddress).trim() : undefined,
    type,
    creditTerms: raw.creditTerms != null ? String(raw.creditTerms).trim() : undefined,
    creditLimit: typeof raw.creditLimit === "number" ? raw.creditLimit : undefined,
  } as ContactDraft;
}

// ─── Account (Chart of Accounts) ───────────────────────────────────

export function isAccountCreateIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  if (t.length < 8) return false;
  return (
    /add\s+(an?\s+)?account/i.test(t) ||
    /create\s+(an?\s+)?account/i.test(t) ||
    /new\s+account/i.test(t) ||
    /account\s+(code|number)\s+\d/i.test(t) ||
    /(chart of accounts?).*add/i.test(t)
  );
}

const ACCOUNT_EXTRACT_PROMPT = `Extract chart of account entry. Return ONLY valid JSON:
{
  "code": "string - account code e.g. 6100 or 4000 (required)",
  "name": "string - account name (required)",
  "type": "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE (required)",
  "description": "string or null"
}
Map type from context: salaries/expenses/rent -> EXPENSE; sales/revenue -> REVENUE; cash/bank/receivable/inventory -> ASSET; payable/accrued -> LIABILITY; equity/retained -> EQUITY.
User message:`;

export function getAccountExtractPrompt(question: string): string {
  return `${ACCOUNT_EXTRACT_PROMPT}\n"${question}"`;
}

export function parseAccountExtraction(text: string): Partial<AccountDraft> | null {
  const raw = parseJson<Record<string, unknown>>(text);
  if (!raw || !raw.code || !raw.name || !raw.type) return null;
  const type = String(raw.type).toUpperCase();
  if (!["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(type)) return null;
  return {
    draftType: "account",
    code: String(raw.code).trim(),
    name: String(raw.name).trim(),
    type: type as AccountDraft["type"],
    description: raw.description != null ? String(raw.description).trim() : undefined,
  } as AccountDraft;
}

// ─── Product ──────────────────────────────────────────────────────

export function isProductCreateIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  if (t.length < 6) return false;
  return (
    /add\s+(a\s+)?product/i.test(t) ||
    /create\s+(a\s+)?product/i.test(t) ||
    /new\s+product/i.test(t) ||
    /product\s+(named|called|code)/i.test(t)
  );
}

const PRODUCT_EXTRACT_PROMPT = `Extract product details. Return ONLY valid JSON:
{
  "code": "string - product code (required)",
  "name": "string - product name (required)",
  "description": "string or null",
  "defaultPrice": number or 0,
  "defaultCost": number or 0,
  "categoryName": "string or null - category name if mentioned"
}
User message:`;

export function getProductExtractPrompt(question: string): string {
  return `${PRODUCT_EXTRACT_PROMPT}\n"${question}"`;
}

export function parseProductExtraction(text: string): Partial<ProductDraft> | null {
  const raw = parseJson<Record<string, unknown>>(text);
  if (!raw || !raw.name) return null;
  const code = raw.code != null ? String(raw.code).trim() : String(raw.name).replace(/\s+/g, "-").toUpperCase().slice(0, 20);
  return {
    draftType: "product",
    code,
    name: String(raw.name).trim(),
    description: raw.description != null ? String(raw.description).trim() : undefined,
    defaultPrice: typeof raw.defaultPrice === "number" ? raw.defaultPrice : 0,
    defaultCost: typeof raw.defaultCost === "number" ? raw.defaultCost : 0,
    categoryName: raw.categoryName != null ? String(raw.categoryName).trim() : undefined,
    baseUom: "UNIT",
  } as ProductDraft;
}

// ─── Product Category ─────────────────────────────────────────────

export function isProductCategoryCreateIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  return (
    /add\s+(a\s+)?(product\s+)?categor(y|ies)/i.test(t) ||
    /create\s+(a\s+)?(product\s+)?categor(y|ies)/i.test(t) ||
    /new\s+(product\s+)?categor(y|ies)/i.test(t)
  );
}

const PRODUCT_CATEGORY_EXTRACT_PROMPT = `Extract product category. Return ONLY valid JSON:
{ "code": "string - short code e.g. ELEC", "name": "string - category name", "description": "string or null" }
User message:`;

export function getProductCategoryExtractPrompt(question: string): string {
  return `${PRODUCT_CATEGORY_EXTRACT_PROMPT}\n"${question}"`;
}

export function parseProductCategoryExtraction(text: string): Partial<ProductCategoryDraft> | null {
  const raw = parseJson<Record<string, unknown>>(text);
  if (!raw || !raw.name) return null;
  const code = raw.code != null ? String(raw.code).trim() : String(raw.name).slice(0, 10).toUpperCase().replace(/\s/g, "");
  return {
    draftType: "productCategory",
    code,
    name: String(raw.name).trim(),
    description: raw.description != null ? String(raw.description).trim() : undefined,
  } as ProductCategoryDraft;
}

// ─── Currency ──────────────────────────────────────────────────────

export function isCurrencyCreateIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  return (
    /add\s+(a\s+)?currenc(y|ies)/i.test(t) ||
    /create\s+(a\s+)?currenc(y|ies)/i.test(t) ||
    /new\s+currenc(y|ies)/i.test(t)
  );
}

const CURRENCY_EXTRACT_PROMPT = `Extract currency. Return ONLY valid JSON:
{ "code": "string e.g. USD", "name": "string e.g. US Dollar", "symbol": "string e.g. $", "exchangeRate": number default 1, "isBase": boolean default false }
User message:`;

export function getCurrencyExtractPrompt(question: string): string {
  return `${CURRENCY_EXTRACT_PROMPT}\n"${question}"`;
}

export function parseCurrencyExtraction(text: string): Partial<CurrencyDraft> | null {
  const raw = parseJson<Record<string, unknown>>(text);
  if (!raw || !raw.code || !raw.name || !raw.symbol) return null;
  return {
    draftType: "currency",
    code: String(raw.code).trim().toUpperCase(),
    name: String(raw.name).trim(),
    symbol: String(raw.symbol).trim(),
    exchangeRate: typeof raw.exchangeRate === "number" ? raw.exchangeRate : 1,
    isBase: raw.isBase === true,
  } as CurrencyDraft;
}

// ─── Tax Code ──────────────────────────────────────────────────────

export function isTaxCodeCreateIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  return (
    /add\s+(a\s+)?tax\s+code/i.test(t) ||
    /create\s+(a\s+)?tax\s+code/i.test(t) ||
    /new\s+tax\s+code/i.test(t)
  );
}

const TAX_CODE_EXTRACT_PROMPT = `Extract tax code. Return ONLY valid JSON:
{ "code": "string e.g. SR", "description": "string e.g. Standard Rate 6%", "rate": number e.g. 6, "taxType": "OUTPUT" or "INPUT" or "BOTH" }
User message:`;

export function getTaxCodeExtractPrompt(question: string): string {
  return `${TAX_CODE_EXTRACT_PROMPT}\n"${question}"`;
}

export function parseTaxCodeExtraction(text: string): Partial<TaxCodeDraft> | null {
  const raw = parseJson<Record<string, unknown>>(text);
  if (!raw || !raw.code || !raw.description) return null;
  return {
    draftType: "taxCode",
    code: String(raw.code).trim(),
    description: String(raw.description).trim(),
    rate: typeof raw.rate === "number" ? raw.rate : 0,
    taxType: raw.taxType != null ? String(raw.taxType) : "OUTPUT",
  } as TaxCodeDraft;
}

// ─── Tariff Code ───────────────────────────────────────────────────

export function isTariffCodeCreateIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  return (
    /add\s+(a\s+)?tariff\s+code/i.test(t) ||
    /create\s+(a\s+)?tariff\s+code/i.test(t)
  );
}

const TARIFF_CODE_EXTRACT_PROMPT = `Extract tariff/HS code. Return ONLY valid JSON:
{ "code": "string e.g. 8471.30.1000", "description": "string" }
User message:`;

export function getTariffCodeExtractPrompt(question: string): string {
  return `${TARIFF_CODE_EXTRACT_PROMPT}\n"${question}"`;
}

export function parseTariffCodeExtraction(text: string): Partial<TariffCodeDraft> | null {
  const raw = parseJson<Record<string, unknown>>(text);
  if (!raw || !raw.code || !raw.description) return null;
  return {
    draftType: "tariffCode",
    code: String(raw.code).trim(),
    description: String(raw.description).trim(),
  } as TariffCodeDraft;
}

// ─── Tax Entity ────────────────────────────────────────────────────

export function isTaxEntityCreateIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  return (
    /add\s+(a\s+)?tax\s+entity/i.test(t) ||
    /create\s+(a\s+)?tax\s+entity/i.test(t) ||
    /new\s+tax\s+entity/i.test(t)
  );
}

const TAX_ENTITY_EXTRACT_PROMPT = `Extract tax entity (company registration for tax). Return ONLY valid JSON:
{ "entityName": "string", "tin": "string or null - tax ID", "brn": "string or null - business reg no", "sstNo": "string or null" }
User message:`;

export function getTaxEntityExtractPrompt(question: string): string {
  return `${TAX_ENTITY_EXTRACT_PROMPT}\n"${question}"`;
}

export function parseTaxEntityExtraction(text: string): Partial<TaxEntityDraft> | null {
  const raw = parseJson<Record<string, unknown>>(text);
  if (!raw || !raw.entityName) return null;
  return {
    draftType: "taxEntity",
    entityName: String(raw.entityName).trim(),
    tin: raw.tin != null ? String(raw.tin).trim() : undefined,
    brn: raw.brn != null ? String(raw.brn).trim() : undefined,
    sstNo: raw.sstNo != null ? String(raw.sstNo).trim() : undefined,
  } as TaxEntityDraft;
}

// ─── Approve intent (any draft) ─────────────────────────────────────

export function isCreateApproveIntent(question: string): boolean {
  const t = question.toLowerCase().trim();
  return (
    /^(approved?|save\s+it|looks?\s+good|confirm|yes|go\s+ahead|ok\s*!?)$/i.test(t) ||
    /approve|save\s+(the\s+)?(draft|it)/i.test(t)
  );
}
