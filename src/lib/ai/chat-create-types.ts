/**
 * Shared types for AI-driven "create entity" drafts (contact, account, product, etc.).
 * Each draft is shown as a preview card in chat; user approves to POST to the API.
 */

export type DraftType =
  | "invoice"
  | "contact"
  | "account"
  | "product"
  | "productCategory"
  | "currency"
  | "taxCode"
  | "tariffCode"
  | "taxEntity";

export interface CreateDraftBase {
  draftType: DraftType;
}

export interface ContactDraft extends CreateDraftBase {
  draftType: "contact";
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  type: "CUSTOMER" | "VENDOR" | "BOTH";
  creditTerms?: string;
  creditLimit?: number;
}

export interface AccountDraft extends CreateDraftBase {
  draftType: "account";
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  description?: string;
}

export interface ProductDraft extends CreateDraftBase {
  draftType: "product";
  code: string;
  name: string;
  description?: string;
  defaultPrice?: number;
  defaultCost?: number;
  categoryId?: string;
  categoryName?: string;
  baseUom?: string;
}

export interface ProductCategoryDraft extends CreateDraftBase {
  draftType: "productCategory";
  code: string;
  name: string;
  description?: string;
}

export interface CurrencyDraft extends CreateDraftBase {
  draftType: "currency";
  code: string;
  name: string;
  symbol: string;
  exchangeRate?: number;
  isBase?: boolean;
}

export interface TaxCodeDraft extends CreateDraftBase {
  draftType: "taxCode";
  code: string;
  description: string;
  rate: number;
  taxType?: string;
}

export interface TariffCodeDraft extends CreateDraftBase {
  draftType: "tariffCode";
  code: string;
  description: string;
}

export interface TaxEntityDraft extends CreateDraftBase {
  draftType: "taxEntity";
  entityName: string;
  tin?: string;
  brn?: string;
  sstNo?: string;
}

export type AnyCreateDraft =
  | ContactDraft
  | AccountDraft
  | ProductDraft
  | ProductCategoryDraft
  | CurrencyDraft
  | TaxCodeDraft
  | TariffCodeDraft
  | TaxEntityDraft;

export function getCreateApiUrl(draftType: DraftType): string {
  const map: Record<DraftType, string> = {
    invoice: "/api/invoices",
    contact: "/api/contacts",
    account: "/api/accounts",
    product: "/api/products",
    productCategory: "/api/product-categories",
    currency: "/api/currencies",
    taxCode: "/api/tax-codes",
    tariffCode: "/api/tariff-codes",
    taxEntity: "/api/tax-entities",
  };
  return map[draftType] ?? "";
}
