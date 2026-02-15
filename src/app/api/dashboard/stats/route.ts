import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as any).companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();

  // This month's date range
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Revenue this month (paid invoices)
  const paidThisMonth = await prisma.invoice.aggregate({
    where: {
      companyId,
      status: "PAID",
      date: { gte: monthStart, lt: monthEnd },
    },
    _sum: { total: true },
  });

  // Outstanding receivables (unpaid invoices)
  const outstanding = await prisma.invoice.aggregate({
    where: {
      companyId,
      status: { in: ["SENT", "OVERDUE", "DRAFT"] },
    },
    _sum: { total: true },
  });

  // Active customers
  const activeCustomers = await prisma.contact.count({
    where: {
      companyId,
      type: { in: ["CUSTOMER", "BOTH"] },
    },
  });

  // Overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ["SENT", "OVERDUE"] },
      dueDate: { lt: now },
    },
    include: { contact: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  // Recent invoices
  const recentInvoices = await prisma.invoice.findMany({
    where: { companyId },
    include: { contact: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 10,
  });

  // Monthly revenue (last 6 months)
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleString("en-US", { month: "short" });

    const rev = await prisma.invoice.aggregate({
      where: {
        companyId,
        status: "PAID",
        date: { gte: start, lt: end },
      },
      _sum: { total: true },
    });

    monthlyRevenue.push({
      month: label,
      revenue: rev._sum.total || 0,
    });
  }

  return NextResponse.json({
    revenueThisMonth: paidThisMonth._sum.total || 0,
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
  });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
