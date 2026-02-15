import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountType } from "@/generated/prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as { companyId?: string }).companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const journalEntryFilter: Record<string, unknown> = { companyId };
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        dateFilter.lte = d;
      }
      journalEntryFilter.date = dateFilter;
    }

    const lines = await prisma.journalLine.findMany({
      where: {
        journalEntry: journalEntryFilter,
      },
      include: {
        account: true,
      },
    });

    const revenueByAccount = new Map<string, { code: string; name: string; debit: number; credit: number }>();
    const expenseByAccount = new Map<string, { code: string; name: string; debit: number; credit: number }>();

    for (const line of lines) {
      const acc = line.account;
      if (acc.type === AccountType.REVENUE) {
        const existing = revenueByAccount.get(acc.id) ?? {
          code: acc.code,
          name: acc.name,
          debit: 0,
          credit: 0,
        };
        existing.debit += line.debit;
        existing.credit += line.credit;
        revenueByAccount.set(acc.id, existing);
      } else if (acc.type === AccountType.EXPENSE) {
        const existing = expenseByAccount.get(acc.id) ?? {
          code: acc.code,
          name: acc.name,
          debit: 0,
          credit: 0,
        };
        existing.debit += line.debit;
        existing.credit += line.credit;
        expenseByAccount.set(acc.id, existing);
      }
    }

    const revenue = Array.from(revenueByAccount.values()).map((r) => ({
      code: r.code,
      name: r.name,
      amount: r.credit - r.debit,
    })).filter((r) => Math.abs(r.amount) > 0.001);

    const expenses = Array.from(expenseByAccount.values()).map((e) => ({
      code: e.code,
      name: e.name,
      amount: e.debit - e.credit,
    })).filter((e) => Math.abs(e.amount) > 0.001);

    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    return NextResponse.json({
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netProfit,
    });
  } catch (error) {
    console.error("Profit/loss error:", error);
    return NextResponse.json({ error: "Failed to generate profit & loss report" }, { status: 500 });
  }
}
