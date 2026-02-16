import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, symbol, exchangeRate, isBase, isActive } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Currency code is required" },
      { status: 400 }
    );
  }

  try {
    // If setting as base, unset all others first
    if (isBase) {
      await prisma.currency.updateMany({
        where: { companyId, isBase: true, NOT: { id } },
        data: { isBase: false },
      });
    }

    const updated = await prisma.currency.updateMany({
      where: { id, companyId },
      data: {
        code: code.trim().toUpperCase(),
        name: name?.trim() || undefined,
        symbol: symbol?.trim() || undefined,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
        isBase: isBase !== undefined ? !!isBase : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Currency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
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
    console.error("Failed to update currency:", error);
    return NextResponse.json(
      { error: "Failed to update currency" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if this is the base currency
  const currency = await prisma.currency.findFirst({
    where: { id, companyId },
  });

  if (!currency) {
    return NextResponse.json(
      { error: "Currency not found" },
      { status: 404 }
    );
  }

  if (currency.isBase) {
    return NextResponse.json(
      { error: "Cannot delete the base currency" },
      { status: 400 }
    );
  }

  try {
    await prisma.currency.deleteMany({ where: { id, companyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete currency:", error);
    return NextResponse.json(
      { error: "Failed to delete currency" },
      { status: 500 }
    );
  }
}
