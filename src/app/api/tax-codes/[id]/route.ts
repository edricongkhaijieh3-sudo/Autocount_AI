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
  const { code, description, rate, taxType, isActive } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Tax code is required" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.taxCode.updateMany({
      where: { id, companyId },
      data: {
        code: code.trim().toUpperCase(),
        description: description?.trim() || undefined,
        rate: rate !== undefined ? parseFloat(rate) : undefined,
        taxType: taxType || undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Tax code not found" },
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
        { error: "A tax code with this code already exists" },
        { status: 400 }
      );
    }
    console.error("Failed to update tax code:", error);
    return NextResponse.json(
      { error: "Failed to update tax code" },
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

  try {
    await prisma.taxCode.deleteMany({ where: { id, companyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tax code:", error);
    return NextResponse.json(
      { error: "Failed to delete tax code" },
      { status: 500 }
    );
  }
}
