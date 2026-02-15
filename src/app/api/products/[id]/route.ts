import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

  const product = await prisma.product.findFirst({
    where: { id, companyId },
    include: {
      variants: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

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
  const {
    code,
    name,
    category,
    description,
    baseUom,
    defaultPrice,
    defaultCost,
    hasVariants,
    isActive,
    variants,
  } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    // Verify the product belongs to the company
    const existing = await prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Update product and variants in a transaction
    const product = await prisma.$transaction(async (tx) => {
      // Update the product itself
      const updated = await tx.product.update({
        where: { id },
        data: {
          code: code.trim(),
          name: name.trim(),
          category: category?.trim() || null,
          description: description?.trim() || null,
          baseUom: baseUom || "UNIT",
          defaultPrice:
            defaultPrice !== undefined ? Number(defaultPrice) : 0,
          defaultCost: defaultCost !== undefined ? Number(defaultCost) : 0,
          hasVariants: hasVariants ?? false,
          isActive: isActive ?? true,
        },
      });

      // Sync variants if provided
      if (hasVariants && Array.isArray(variants)) {
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
        });

        const incomingIds = variants
          .filter((v: { id?: string }) => v.id)
          .map((v: { id: string }) => v.id);

        // Delete variants that were removed
        const toDelete = existingVariants.filter(
          (ev) => !incomingIds.includes(ev.id)
        );
        if (toDelete.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: toDelete.map((d) => d.id) } },
          });
        }

        // Upsert remaining variants
        for (const v of variants as Array<{
          id?: string;
          name: string;
          sku?: string;
          price?: number | null;
          cost?: number | null;
          isActive?: boolean;
        }>) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                name: v.name.trim(),
                sku: v.sku?.trim() || null,
                price:
                  v.price !== undefined && v.price !== null
                    ? Number(v.price)
                    : null,
                cost:
                  v.cost !== undefined && v.cost !== null
                    ? Number(v.cost)
                    : null,
                isActive: v.isActive ?? true,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                name: v.name.trim(),
                sku: v.sku?.trim() || null,
                price:
                  v.price !== undefined && v.price !== null
                    ? Number(v.price)
                    : null,
                cost:
                  v.cost !== undefined && v.cost !== null
                    ? Number(v.cost)
                    : null,
                isActive: v.isActive ?? true,
              },
            });
          }
        }
      } else if (!hasVariants) {
        // If variants are disabled, remove all variants
        await tx.productVariant.deleteMany({
          where: { productId: id },
        });
      }

      return tx.product.findFirst({
        where: { id },
        include: { variants: { orderBy: { name: "asc" } } },
      });
    });

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error("Failed to update product:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A product with this code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update product" },
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
    const deleted = await prisma.product.deleteMany({
      where: { id, companyId },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Cannot delete product — it may be referenced in invoices" },
      { status: 400 }
    );
  }
}
