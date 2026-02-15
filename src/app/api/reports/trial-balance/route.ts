import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: { companyId: string; date?: { gte?: Date; lte?: Date } } = {
    companyId,
  };

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: where,
    },
    include: {
      account: true,
    },
  });

  const byAccount = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>();

  for (const line of lines) {
    const acc = line.account;
    const existing = byAccount.get(acc.id) ?? {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: 0,
      credit: 0,
    };
    existing.debit += line.debit;
    existing.credit += line.credit;
    byAccount.set(acc.id, existing);
  }

  const accounts = Array.from(byAccount.values())
    .filter((a) => a.debit > 0.001 || a.credit > 0.001)
    .map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      debit: a.debit,
      credit: a.credit,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalDebit = accounts.reduce((s, a) => s + a.debit, 0);
  const totalCredit = accounts.reduce((s, a) => s + a.credit, 0);

  return NextResponse.json({
    accounts,
    totalDebit,
    totalCredit,
  });
}
