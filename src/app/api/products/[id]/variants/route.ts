import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the product belongs to the company
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { name, sku, price, cost } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Variant name is required" },
      { status: 400 }
    );
  }

  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name: name.trim(),
        sku: sku?.trim() || null,
        price: price !== undefined && price !== null ? Number(price) : null,
        cost: cost !== undefined && cost !== null ? Number(cost) : null,
        isActive: true,
      },
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error("Failed to create variant:", error);
    return NextResponse.json(
      { error: "Failed to create variant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the product belongs to the company
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const variantId = searchParams.get("variantId");

  if (!variantId) {
    return NextResponse.json(
      { error: "variantId is required" },
      { status: 400 }
    );
  }

  try {
    await prisma.productVariant.deleteMany({
      where: { id: variantId, productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete variant:", error);
    return NextResponse.json(
      { error: "Failed to delete variant" },
      { status: 500 }
    );
  }
}
