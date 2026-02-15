import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@/generated/prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: {
        notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      },
    },
    include: {
      contact: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byContact = new Map<
    string,
    { name: string; current: number; days31to60: number; days61to90: number; over90: number }
  >();

  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));

    let bucket: "current" | "days31to60" | "days61to90" | "over90";
    if (daysOverdue <= 30) {
      bucket = "current";
    } else if (daysOverdue <= 60) {
      bucket = "days31to60";
    } else if (daysOverdue <= 90) {
      bucket = "days61to90";
    } else {
      bucket = "over90";
    }

    const existing = byContact.get(inv.contactId) ?? {
      name: inv.contact.name,
      current: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
    };
    existing[bucket] += inv.total;
    byContact.set(inv.contactId, existing);
  }

  const customers = Array.from(byContact.values())
    .map((c) => ({
      name: c.name,
      current: c.current,
      days31to60: c.days31to60,
      days61to90: c.days61to90,
      over90: c.over90,
      total: c.current + c.days31to60 + c.days61to90 + c.over90,
    }))
    .filter((c) => c.total > 0.001)
    .sort((a, b) => a.name.localeCompare(b.name));

  const grandTotal = customers.reduce((s, c) => s + c.total, 0);

  return NextResponse.json({
    customers,
    grandTotal,
  });
}
