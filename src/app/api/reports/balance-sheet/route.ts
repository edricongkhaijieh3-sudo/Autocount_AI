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

    const assetByAccount = new Map<string, { code: string; name: string; debit: number; credit: number }>();
    const liabilityByAccount = new Map<string, { code: string; name: string; debit: number; credit: number }>();
    const equityByAccount = new Map<string, { code: string; name: string; debit: number; credit: number }>();

    for (const line of lines) {
      const acc = line.account;
      let map: Map<string, { code: string; name: string; debit: number; credit: number }>;
      if (acc.type === AccountType.ASSET) {
        map = assetByAccount;
      } else if (acc.type === AccountType.LIABILITY) {
        map = liabilityByAccount;
      } else if (acc.type === AccountType.EQUITY) {
        map = equityByAccount;
      } else {
        continue;
      }
      const existing = map.get(acc.id) ?? {
        code: acc.code,
        name: acc.name,
        debit: 0,
        credit: 0,
      };
      existing.debit += line.debit;
      existing.credit += line.credit;
      map.set(acc.id, existing);
    }

    const assets = Array.from(assetByAccount.values()).map((a) => ({
      code: a.code,
      name: a.name,
      balance: a.debit - a.credit,
    })).filter((a) => Math.abs(a.balance) > 0.001);

    const liabilities = Array.from(liabilityByAccount.values()).map((l) => ({
      code: l.code,
      name: l.name,
      balance: l.credit - l.debit,
    })).filter((l) => Math.abs(l.balance) > 0.001);

    const equity = Array.from(equityByAccount.values()).map((e) => ({
      code: e.code,
      name: e.name,
      balance: e.credit - e.debit,
    })).filter((e) => Math.abs(e.balance) > 0.001);

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const totalEquity = equity.reduce((s, e) => s + e.balance, 0);

    return NextResponse.json({
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    });
  } catch (error) {
    console.error("Balance sheet error:", error);
    return NextResponse.json({ error: "Failed to generate balance sheet" }, { status: 500 });
  }
}
