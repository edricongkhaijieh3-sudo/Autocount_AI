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
  const { code, name, description, isActive } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Category code is required" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.productCategory.updateMany({
      where: { id, companyId },
      data: {
        code: code.trim().toUpperCase(),
        name: name?.trim() || undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Product category not found" },
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
        { error: "A category with this code already exists" },
        { status: 400 }
      );
    }
    console.error("Failed to update product category:", error);
    return NextResponse.json(
      { error: "Failed to update product category" },
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

  // Check if any products are linked to this category
  const linkedProducts = await prisma.product.count({
    where: { categoryId: id },
  });

  if (linkedProducts > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${linkedProducts} product(s) are linked to this category. Reassign them first.`,
      },
      { status: 400 }
    );
  }

  try {
    await prisma.productCategory.deleteMany({ where: { id, companyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product category:", error);
    return NextResponse.json(
      { error: "Failed to delete product category" },
      { status: 500 }
    );
  }
}
