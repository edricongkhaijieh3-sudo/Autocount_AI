import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/companies — list all companies the current user has access to
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const activeCompanyId = (session.user as any).companyId;

  const memberships = await prisma.userCompany.findMany({
    where: { userId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const companies = memberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    industry: m.company.industry,
    role: m.role,
    createdAt: m.company.createdAt,
    isActive: m.company.id === activeCompanyId,
  }));

  return NextResponse.json(companies);
}

/**
 * POST /api/companies — create a new company and add current user to it
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { name } = await req.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      currency: "MYR",
      onboardingComplete: true,
    },
  });

  // Add the user as admin of this new company
  await prisma.userCompany.create({
    data: {
      userId,
      companyId: company.id,
      role: "admin",
    },
  });

  // Seed default chart of accounts
  const defaultAccounts = [
    { code: "1000", name: "Cash and Bank", type: "ASSET" as const },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" as const },
    { code: "1200", name: "Inventory", type: "ASSET" as const },
    { code: "1300", name: "Prepaid Expenses", type: "ASSET" as const },
    { code: "1500", name: "Fixed Assets", type: "ASSET" as const },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" as const },
    { code: "2100", name: "Accrued Expenses", type: "LIABILITY" as const },
    { code: "2200", name: "Tax Payable (SST)", type: "LIABILITY" as const },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" as const },
    { code: "3100", name: "Retained Earnings", type: "EQUITY" as const },
    { code: "4000", name: "Sales Revenue", type: "REVENUE" as const },
    { code: "4100", name: "Other Income", type: "REVENUE" as const },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const },
    { code: "6000", name: "Operating Expenses", type: "EXPENSE" as const },
    { code: "6100", name: "Salaries & Wages", type: "EXPENSE" as const },
    { code: "6200", name: "Rent Expense", type: "EXPENSE" as const },
    { code: "6300", name: "Utilities", type: "EXPENSE" as const },
    { code: "6800", name: "Miscellaneous Expense", type: "EXPENSE" as const },
  ];

  await prisma.account.createMany({
    data: defaultAccounts.map((a) => ({ ...a, companyId: company.id })),
  });

  return NextResponse.json({
    id: company.id,
    name: company.name,
    role: "admin",
  }, { status: 201 });
}

/**
 * PATCH /api/companies — switch active company
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { companyId } = await req.json();

  if (!companyId || typeof companyId !== "string") {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  // Verify user has access to this company
  const membership = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { company: { select: { name: true } } },
  });

  if (!membership) {
    return NextResponse.json({ error: "You don't have access to this company" }, { status: 403 });
  }

  // Update user's active company
  await prisma.user.update({
    where: { id: userId },
    data: { companyId },
  });

  return NextResponse.json({
    companyId,
    companyName: membership.company.name,
  });
}
