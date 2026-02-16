import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

  const currencies = await prisma.currency.findMany({
    where: { companyId },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
  });

  return NextResponse.json(currencies);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, symbol, exchangeRate, isBase } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Currency code is required" },
      { status: 400 }
    );
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Currency name is required" },
      { status: 400 }
    );
  }
  if (!symbol || typeof symbol !== "string" || !symbol.trim()) {
    return NextResponse.json(
      { error: "Currency symbol is required" },
      { status: 400 }
    );
  }

  try {
    // If setting as base, unset all others first
    if (isBase) {
      await prisma.currency.updateMany({
        where: { companyId, isBase: true },
        data: { isBase: false },
      });
    }

    const currency = await prisma.currency.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        symbol: symbol.trim(),
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1.0,
        isBase: !!isBase,
        isActive: true,
        companyId,
      },
    });
    return NextResponse.json(currency, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message?.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A currency with this code already exists" },
        { status: 400 }
      );
    }
    console.error("Failed to create currency:", error);
    return NextResponse.json(
      { error: "Failed to create currency" },
      { status: 500 }
    );
  }
}
