import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password, companyName } = await req.json();

    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const company = await prisma.company.create({
      data: {
        name: companyName,
        currency: "MYR",
        users: {
          create: {
            name,
            email,
            passwordHash,
            role: "admin",
          },
        },
      },
      include: { users: true },
    });

    // Link user to company in the join table
    const createdUser = company.users[0];
    await prisma.userCompany.create({
      data: {
        userId: createdUser.id,
        companyId: company.id,
        role: "admin",
      },
    });

    // Seed default chart of accounts for the new company
    const defaultAccounts = [
      { code: "1000", name: "Cash", type: "ASSET" as const },
      { code: "1100", name: "Accounts Receivable", type: "ASSET" as const },
      { code: "1200", name: "Inventory", type: "ASSET" as const },
      { code: "1300", name: "Prepaid Expenses", type: "ASSET" as const },
      { code: "1500", name: "Fixed Assets", type: "ASSET" as const },
      { code: "2000", name: "Accounts Payable", type: "LIABILITY" as const },
      { code: "2100", name: "Accrued Expenses", type: "LIABILITY" as const },
      { code: "2200", name: "Tax Payable (SST)", type: "LIABILITY" as const },
      { code: "2500", name: "Long-term Loans", type: "LIABILITY" as const },
      { code: "3000", name: "Owner Equity", type: "EQUITY" as const },
      { code: "3100", name: "Retained Earnings", type: "EQUITY" as const },
      { code: "4000", name: "Sales Revenue", type: "REVENUE" as const },
      { code: "4100", name: "Service Revenue", type: "REVENUE" as const },
      { code: "4200", name: "Other Income", type: "REVENUE" as const },
      { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const },
      { code: "5100", name: "Salaries & Wages", type: "EXPENSE" as const },
      { code: "5200", name: "Rent Expense", type: "EXPENSE" as const },
      { code: "5300", name: "Utilities Expense", type: "EXPENSE" as const },
      { code: "5400", name: "Office Supplies", type: "EXPENSE" as const },
      { code: "5500", name: "Marketing Expense", type: "EXPENSE" as const },
      { code: "5600", name: "Depreciation", type: "EXPENSE" as const },
      { code: "5700", name: "Insurance Expense", type: "EXPENSE" as const },
      { code: "5800", name: "Travel Expense", type: "EXPENSE" as const },
      { code: "5900", name: "Miscellaneous Expense", type: "EXPENSE" as const },
    ];

    await prisma.account.createMany({
      data: defaultAccounts.map((a) => ({
        ...a,
        companyId: company.id,
      })),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
