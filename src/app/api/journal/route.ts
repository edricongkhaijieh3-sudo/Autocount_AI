import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

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

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, description, reference, lines } = body;

  if (!date || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json(
      { error: "Date and at least two lines are required for double-entry" },
      { status: 400 }
    );
  }

  // Reject negative amounts
  const hasNegative = lines.some(
    (l: { debit?: number; credit?: number }) =>
      (Number(l.debit) || 0) < 0 || (Number(l.credit) || 0) < 0
  );
  if (hasNegative) {
    return NextResponse.json(
      { error: "Negative amounts are not allowed" },
      { status: 400 }
    );
  }

  const totalDebit = lines.reduce(
    (s: number, l: { debit?: number }) => s + (Number(l.debit) || 0),
    0
  );
  const totalCredit = lines.reduce(
    (s: number, l: { credit?: number }) => s + (Number(l.credit) || 0),
    0
  );

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json(
      { error: "Total debits must equal total credits" },
      { status: 400 }
    );
  }

  const year = new Date(date).getFullYear();
  const count = await prisma.journalEntry.count({
    where: {
      companyId,
      date: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31T23:59:59.999`),
      },
    },
  });
  const entryNo = `JE-${year}-${String(count + 1).padStart(3, "0")}`;

  try {
    const entry = await prisma.journalEntry.create({
      data: {
        entryNo,
        date: new Date(date),
        description: description || null,
        reference: reference || null,
        companyId,
        lines: {
          create: lines.map(
            (l: { accountId: string; description?: string; debit?: number; credit?: number }) => ({
              accountId: l.accountId,
              description: l.description || null,
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
            })
          ),
        },
      },
      include: {
        lines: { include: { account: true } },
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create journal entry" },
      { status: 500 }
    );
  }
}
