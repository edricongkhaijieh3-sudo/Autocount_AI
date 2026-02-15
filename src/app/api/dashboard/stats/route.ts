import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountType, InvoiceStatus } from "@/generated/prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // day, week, month

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // ── Revenue this month ──
    const paidThisMonth = await prisma.invoice.aggregate({
      where: { companyId, status: "PAID", date: { gte: monthStart, lt: monthEnd } },
      _sum: { total: true },
    });

    // ── Outstanding receivables ──
    const outstanding = await prisma.invoice.aggregate({
      where: { companyId, status: { in: ["SENT", "OVERDUE", "DRAFT"] } },
      _sum: { total: true },
    });

    // ── Active customers ──
    const activeCustomers = await prisma.contact.count({
      where: { companyId, type: { in: ["CUSTOMER", "BOTH"] } },
    });

    // ── Overdue invoices ──
    const overdueInvoices = await prisma.invoice.findMany({
      where: { companyId, status: { in: ["SENT", "OVERDUE"] }, dueDate: { lt: now } },
      include: { contact: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // ── Recent invoices ──
    const recentInvoices = await prisma.invoice.findMany({
      where: { companyId },
      include: { contact: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 10,
    });

    // ── Cash Flow (last 6 months): money-in vs money-out ──
    const cashFlow: { month: string; moneyIn: number; moneyOut: number; netCash: number }[] = [];
    let runningBalance = 0;

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleString("en-US", { month: "short" });

      // Money in = paid invoices
      const inflow = await prisma.invoice.aggregate({
        where: { companyId, status: "PAID", date: { gte: start, lt: end } },
        _sum: { total: true },
      });

      // Money out = expense journal lines
      const expenseLines = await prisma.journalLine.findMany({
        where: {
          journalEntry: { companyId, date: { gte: start, lt: end } },
          account: { type: AccountType.EXPENSE },
        },
      });
      const outflow = expenseLines.reduce((s, l) => s + (l.debit - l.credit), 0);

      const moneyIn = inflow._sum.total || 0;
      const moneyOut = Math.max(outflow, 0);
      runningBalance += moneyIn - moneyOut;

      cashFlow.push({ month: label, moneyIn, moneyOut, netCash: runningBalance });
    }

    // ── Receivables Aging ──
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      },
      include: { contact: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let arCurrent = 0, ar31to60 = 0, ar61to90 = 0, arOver90 = 0;
    for (const inv of unpaidInvoices) {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const days = Math.floor((today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
      if (days <= 30) arCurrent += inv.total;
      else if (days <= 60) ar31to60 += inv.total;
      else if (days <= 90) ar61to90 += inv.total;
      else arOver90 += inv.total;
    }

    const receivablesAging = {
      current: arCurrent,
      days31to60: ar31to60,
      days61to90: ar61to90,
      over90: arOver90,
      total: arCurrent + ar31to60 + ar61to90 + arOver90,
    };

    // ── P&L Summary (this month + YTD) ──
    async function getPL(dateFrom: Date, dateTo: Date) {
      const lines = await prisma.journalLine.findMany({
        where: { journalEntry: { companyId, date: { gte: dateFrom, lt: dateTo } } },
        include: { account: true },
      });

      let revenue = 0, cogs = 0, expenses = 0;
      for (const line of lines) {
        if (line.account.type === AccountType.REVENUE) {
          revenue += line.credit - line.debit;
        } else if (line.account.type === AccountType.EXPENSE) {
          // Separate COGS (accounts starting with 5) from operating expenses (6+)
          const code = parseInt(line.account.code, 10);
          const amount = line.debit - line.credit;
          if (code >= 5000 && code < 6000) {
            cogs += amount;
          } else {
            expenses += amount;
          }
        }
      }

      // Also include invoice revenue for the period
      const invoiceRevenue = await prisma.invoice.aggregate({
        where: { companyId, status: "PAID", date: { gte: dateFrom, lt: dateTo } },
        _sum: { total: true },
      });
      const invoiceRev = invoiceRevenue._sum.total || 0;

      // Use whichever is larger (journal-based or invoice-based)
      const totalRevenue = Math.max(revenue, invoiceRev);
      const grossProfit = totalRevenue - cogs;
      const netProfit = grossProfit - expenses;

      return { revenue: totalRevenue, cogs, grossProfit, expenses, netProfit };
    }

    const plThisMonth = await getPL(monthStart, monthEnd);
    const plYTD = await getPL(yearStart, monthEnd);

    // ── Top Expenses (this month, by account) ──
    const expenseLinesThisMonth = await prisma.journalLine.findMany({
      where: {
        journalEntry: { companyId, date: { gte: monthStart, lt: monthEnd } },
        account: { type: AccountType.EXPENSE },
      },
      include: { account: true },
    });

    const expenseMap = new Map<string, { name: string; amount: number }>();
    for (const line of expenseLinesThisMonth) {
      const existing = expenseMap.get(line.account.id) ?? { name: line.account.name, amount: 0 };
      existing.amount += line.debit - line.credit;
      expenseMap.set(line.account.id, existing);
    }

    const topExpenses = Array.from(expenseMap.values())
      .filter((e) => e.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const totalExpensesAmount = topExpenses.reduce((s, e) => s + e.amount, 0);

    // ── Monthly Revenue (for backward compat) ──
    const monthlyRevenue = cashFlow.map((cf) => ({ month: cf.month, revenue: cf.moneyIn }));

    // ── Last month comparison ──
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthRev = await prisma.invoice.aggregate({
      where: { companyId, status: "PAID", date: { gte: lastMonthStart, lt: lastMonthEnd } },
      _sum: { total: true },
    });
    const lastMonthRevenue = lastMonthRev._sum.total || 0;
    const thisMonthRevenue = paidThisMonth._sum.total || 0;
    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0 ? 100 : 0;

    return NextResponse.json({
      // Original fields
      revenueThisMonth: thisMonthRevenue,
      outstandingReceivables: outstanding._sum.total || 0,
      activeCustomers,
      overdueInvoices: {
        count: overdueInvoices.length,
        list: overdueInvoices.map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          dueDate: inv.dueDate.toISOString(),
          total: inv.total,
          contactName: inv.contact.name,
          status: inv.status,
        })),
      },
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        date: inv.date.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        total: inv.total,
        status: inv.status,
        contactName: inv.contact.name,
      })),
      monthlyRevenue,

      // New: Cash Flow
      cashFlow,
      revenueChange: Math.round(revenueChange * 10) / 10,

      // New: Receivables Aging
      receivablesAging,

      // New: P&L Summary
      plThisMonth,
      plYTD,

      // New: Top Expenses
      topExpenses: topExpenses.map((e) => ({
        ...e,
        percentage: totalExpensesAmount > 0 ? Math.round((e.amount / totalExpensesAmount) * 1000) / 10 : 0,
      })),
      totalExpenses: totalExpensesAmount,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
