import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

function getClaudeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey });
}

const INDUSTRY_COA: Record<string, { code: string; name: string; type: string }[]> = {
  retail: [
    { code: "1000", name: "Cash and Bank", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1200", name: "Inventory", type: "ASSET" },
    { code: "1300", name: "Prepaid Expenses", type: "ASSET" },
    { code: "1500", name: "Fixed Assets", type: "ASSET" },
    { code: "1510", name: "Accumulated Depreciation", type: "ASSET" },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2100", name: "SST Payable", type: "LIABILITY" },
    { code: "2200", name: "Accrued Expenses", type: "LIABILITY" },
    { code: "2300", name: "Loans Payable", type: "LIABILITY" },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" },
    { code: "3100", name: "Retained Earnings", type: "EQUITY" },
    { code: "4000", name: "Sales Revenue", type: "REVENUE" },
    { code: "4100", name: "Other Income", type: "REVENUE" },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
    { code: "5100", name: "Freight & Shipping", type: "EXPENSE" },
    { code: "6000", name: "Rent Expense", type: "EXPENSE" },
    { code: "6100", name: "Utilities", type: "EXPENSE" },
    { code: "6200", name: "Salaries & Wages", type: "EXPENSE" },
    { code: "6300", name: "Marketing & Advertising", type: "EXPENSE" },
    { code: "6400", name: "Office Supplies", type: "EXPENSE" },
    { code: "6500", name: "Insurance", type: "EXPENSE" },
    { code: "6600", name: "Depreciation Expense", type: "EXPENSE" },
    { code: "6700", name: "Bank Charges", type: "EXPENSE" },
    { code: "6800", name: "Miscellaneous Expense", type: "EXPENSE" },
  ],
  services: [
    { code: "1000", name: "Cash and Bank", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1200", name: "Work in Progress", type: "ASSET" },
    { code: "1300", name: "Prepaid Expenses", type: "ASSET" },
    { code: "1500", name: "Equipment", type: "ASSET" },
    { code: "1510", name: "Accumulated Depreciation", type: "ASSET" },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2100", name: "SST Payable", type: "LIABILITY" },
    { code: "2200", name: "Accrued Expenses", type: "LIABILITY" },
    { code: "2300", name: "Unearned Revenue", type: "LIABILITY" },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" },
    { code: "3100", name: "Retained Earnings", type: "EQUITY" },
    { code: "4000", name: "Service Revenue", type: "REVENUE" },
    { code: "4100", name: "Consulting Revenue", type: "REVENUE" },
    { code: "4200", name: "Other Income", type: "REVENUE" },
    { code: "5000", name: "Cost of Services", type: "EXPENSE" },
    { code: "5100", name: "Subcontractor Costs", type: "EXPENSE" },
    { code: "6000", name: "Rent Expense", type: "EXPENSE" },
    { code: "6100", name: "Utilities", type: "EXPENSE" },
    { code: "6200", name: "Salaries & Wages", type: "EXPENSE" },
    { code: "6300", name: "Professional Development", type: "EXPENSE" },
    { code: "6400", name: "Software & Subscriptions", type: "EXPENSE" },
    { code: "6500", name: "Travel Expense", type: "EXPENSE" },
    { code: "6600", name: "Insurance", type: "EXPENSE" },
    { code: "6700", name: "Bank Charges", type: "EXPENSE" },
    { code: "6800", name: "Miscellaneous Expense", type: "EXPENSE" },
  ],
  fnb: [
    { code: "1000", name: "Cash and Bank", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1200", name: "Food Inventory", type: "ASSET" },
    { code: "1210", name: "Beverage Inventory", type: "ASSET" },
    { code: "1300", name: "Prepaid Expenses", type: "ASSET" },
    { code: "1500", name: "Kitchen Equipment", type: "ASSET" },
    { code: "1510", name: "Accumulated Depreciation", type: "ASSET" },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2100", name: "SST Payable", type: "LIABILITY" },
    { code: "2200", name: "Accrued Expenses", type: "LIABILITY" },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" },
    { code: "3100", name: "Retained Earnings", type: "EQUITY" },
    { code: "4000", name: "Food Sales", type: "REVENUE" },
    { code: "4100", name: "Beverage Sales", type: "REVENUE" },
    { code: "4200", name: "Other Income", type: "REVENUE" },
    { code: "5000", name: "Cost of Food", type: "EXPENSE" },
    { code: "5100", name: "Cost of Beverages", type: "EXPENSE" },
    { code: "6000", name: "Rent Expense", type: "EXPENSE" },
    { code: "6100", name: "Utilities", type: "EXPENSE" },
    { code: "6200", name: "Salaries & Wages", type: "EXPENSE" },
    { code: "6300", name: "Kitchen Supplies", type: "EXPENSE" },
    { code: "6400", name: "Marketing", type: "EXPENSE" },
    { code: "6500", name: "Delivery Charges", type: "EXPENSE" },
    { code: "6600", name: "Insurance", type: "EXPENSE" },
    { code: "6700", name: "Bank Charges", type: "EXPENSE" },
    { code: "6800", name: "Miscellaneous Expense", type: "EXPENSE" },
  ],
  manufacturing: [
    { code: "1000", name: "Cash and Bank", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1200", name: "Raw Materials", type: "ASSET" },
    { code: "1210", name: "Work in Progress", type: "ASSET" },
    { code: "1220", name: "Finished Goods", type: "ASSET" },
    { code: "1300", name: "Prepaid Expenses", type: "ASSET" },
    { code: "1500", name: "Machinery & Equipment", type: "ASSET" },
    { code: "1510", name: "Accumulated Depreciation", type: "ASSET" },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2100", name: "SST Payable", type: "LIABILITY" },
    { code: "2200", name: "Accrued Expenses", type: "LIABILITY" },
    { code: "2300", name: "Loans Payable", type: "LIABILITY" },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" },
    { code: "3100", name: "Retained Earnings", type: "EQUITY" },
    { code: "4000", name: "Product Sales", type: "REVENUE" },
    { code: "4100", name: "Other Income", type: "REVENUE" },
    { code: "5000", name: "Raw Materials Used", type: "EXPENSE" },
    { code: "5100", name: "Direct Labour", type: "EXPENSE" },
    { code: "5200", name: "Manufacturing Overhead", type: "EXPENSE" },
    { code: "6000", name: "Rent Expense", type: "EXPENSE" },
    { code: "6100", name: "Utilities", type: "EXPENSE" },
    { code: "6200", name: "Salaries & Wages", type: "EXPENSE" },
    { code: "6300", name: "Maintenance & Repairs", type: "EXPENSE" },
    { code: "6400", name: "Freight & Shipping", type: "EXPENSE" },
    { code: "6500", name: "Insurance", type: "EXPENSE" },
    { code: "6600", name: "Depreciation Expense", type: "EXPENSE" },
    { code: "6700", name: "Bank Charges", type: "EXPENSE" },
    { code: "6800", name: "Miscellaneous Expense", type: "EXPENSE" },
  ],
};

const DEFAULT_TAX_CODES = [
  { code: "SR", description: "Standard Rated Supply (6%)", rate: 6, taxType: "OUTPUT" },
  { code: "ZR", description: "Zero Rated Supply", rate: 0, taxType: "OUTPUT" },
  { code: "ES", description: "Exempt Supply", rate: 0, taxType: "OUTPUT" },
  { code: "OS", description: "Out of Scope", rate: 0, taxType: "OUTPUT" },
  { code: "TX", description: "Purchase Tax (6%)", rate: 6, taxType: "INPUT" },
  { code: "TX-E", description: "Purchase Exempt", rate: 0, taxType: "INPUT" },
  { code: "SV", description: "Service Tax (8%)", rate: 8, taxType: "OUTPUT" },
];

const DEFAULT_CURRENCIES = [
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", exchangeRate: 1.0, isBase: true },
  { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 4.47, isBase: false },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", exchangeRate: 3.32, isBase: false },
];

const ONBOARDING_SYSTEM_PROMPT = `You are a friendly onboarding assistant for AutoCount Cloud Accounting. Your job is to help a new user set up their business step by step through a natural conversation.

═══ YOUR PERSONALITY ═══
- Warm, encouraging, and professional
- Use simple language — assume the user may not know accounting terms
- Be concise — 2-3 sentences per response
- Use the user's company name once you know it

═══ ONBOARDING FLOW ═══
You must collect the following information in order. Ask ONE question at a time.

Step 1: COMPANY NAME — "What's your company name?"
Step 2: INDUSTRY — "What kind of business do you run?" (retail, services, F&B, manufacturing, or other)
Step 3: COMPANY ADDRESS — "What's your business address?" (optional, can skip)
Step 4: TAX ID — "Do you have an SST registration number?" (optional, can skip)
Step 5: NEEDS — "What do you need most right now?" (invoicing, expense tracking, full accounting, or all)
Step 6: CONFIRMATION — Summarize what you'll set up and ask for confirmation.

═══ RESPONSE FORMAT ═══
ALWAYS respond with a JSON object. The format depends on where you are in the flow:

For questions (gathering info):
{"message": "Your conversational question here", "step": "company_name|industry|address|tax_id|needs|confirm", "progress": 0-100}

When you have enough info to perform a setup action:
{"message": "Great! I'm setting up...", "action": "setup_company", "data": {"companyName": "...", "industry": "...", "address": "...", "taxId": "...", "needs": ["invoicing"]}, "progress": 90}

When setup is complete:
{"message": "You're all set! Here's what I've configured...", "action": "complete", "progress": 100}

═══ RULES ═══
1. ALWAYS return valid JSON
2. Ask ONE question per response
3. If the user gives a vague answer, use your best judgment and confirm
4. For industry: map their answer to one of: retail, services, fnb, manufacturing, other
5. If user says "skip" for optional fields, move to the next step
6. Be encouraging — "Great choice!", "Perfect!", etc.
7. Show progress percentage to motivate completion
8. After confirmation, output the setup_company action with all collected data`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, conversationHistory } = await req.json();
  const companyId = (session.user as any).companyId;

  try {
    const claude = getClaudeClient();

    // Build message history for Claude
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: message });

    const response = await claude.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: ONBOARDING_SYSTEM_PROMPT,
      messages,
      temperature: 0.4,
    });

    const aiText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // Parse the AI response
    let parsed: any;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({
        message: aiText || "Let's continue setting up your business. What's your company name?",
        step: "company_name",
        progress: 0,
      });
    }

    // Handle setup action
    if (parsed.action === "setup_company" && parsed.data) {
      const setupResult = await setupCompany(companyId, parsed.data);
      return NextResponse.json({
        message: parsed.message,
        action: "setup_company",
        progress: parsed.progress || 90,
        setupResult,
      });
    }

    // Handle completion
    if (parsed.action === "complete") {
      await prisma.company.update({
        where: { id: companyId },
        data: { onboardingComplete: true },
      });
      return NextResponse.json({
        message: parsed.message,
        action: "complete",
        progress: 100,
      });
    }

    // Regular question response
    return NextResponse.json({
      message: parsed.message || aiText,
      step: parsed.step,
      progress: parsed.progress || 0,
    });
  } catch (error: any) {
    console.error("Onboarding error:", error?.message || error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Check onboarding status
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as any).companyId;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { onboardingComplete: true, name: true, industry: true },
  });

  return NextResponse.json({
    onboardingComplete: company?.onboardingComplete ?? false,
    companyName: company?.name,
    industry: company?.industry,
  });
}

async function setupCompany(
  companyId: string,
  data: {
    companyName?: string;
    industry?: string;
    address?: string;
    taxId?: string;
    needs?: string[];
  }
) {
  const results: string[] = [];

  // Update company profile
  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: data.companyName || undefined,
      industry: data.industry || undefined,
      address: data.address || undefined,
      taxId: data.taxId || undefined,
    },
  });
  results.push("Company profile updated");

  // Set up Chart of Accounts based on industry
  const industry = (data.industry || "services").toLowerCase();
  const coa = INDUSTRY_COA[industry] || INDUSTRY_COA.services;

  // Delete existing accounts first (fresh setup)
  await prisma.account.deleteMany({ where: { companyId } });

  for (const account of coa) {
    await prisma.account.create({
      data: {
        code: account.code,
        name: account.name,
        type: account.type as any,
        isActive: true,
        companyId,
      },
    });
  }
  results.push(`${coa.length} accounts created for ${industry} industry`);

  // Set up default tax codes
  const existingTaxCodes = await prisma.taxCode.count({ where: { companyId } });
  if (existingTaxCodes === 0) {
    for (const tc of DEFAULT_TAX_CODES) {
      await prisma.taxCode.create({
        data: { ...tc, companyId },
      });
    }
    results.push(`${DEFAULT_TAX_CODES.length} tax codes created`);
  }

  // Set up default currencies
  const existingCurrencies = await prisma.currency.count({ where: { companyId } });
  if (existingCurrencies === 0) {
    for (const cur of DEFAULT_CURRENCIES) {
      await prisma.currency.create({
        data: { ...cur, companyId },
      });
    }
    results.push(`${DEFAULT_CURRENCIES.length} currencies set up`);
  }

  // Mark onboarding as complete
  await prisma.company.update({
    where: { id: companyId },
    data: { onboardingComplete: true },
  });
  results.push("Onboarding marked complete");

  return results;
}
