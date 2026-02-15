import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const activeOnly = searchParams.get("active") === "true";

  const where: Record<string, unknown> = { companyId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (activeOnly) {
    where.isActive = true;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      variants: {
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const product = await prisma.product.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        category: category?.trim() || null,
        description: description?.trim() || null,
        baseUom: baseUom || "UNIT",
        defaultPrice: defaultPrice !== undefined ? Number(defaultPrice) : 0,
        defaultCost: defaultCost !== undefined ? Number(defaultCost) : 0,
        hasVariants: hasVariants ?? false,
        isActive: isActive ?? true,
        companyId,
        variants:
          hasVariants && Array.isArray(variants) && variants.length > 0
            ? {
                create: variants.map(
                  (v: { name: string; sku?: string; price?: number | null; cost?: number | null }) => ({
                    name: v.name.trim(),
                    sku: v.sku?.trim() || null,
                    price: v.price !== undefined && v.price !== null ? Number(v.price) : null,
                    cost: v.cost !== undefined && v.cost !== null ? Number(v.cost) : null,
                    isActive: true,
                  })
                ),
              }
            : undefined,
      },
      include: { variants: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create product:", error);
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
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
