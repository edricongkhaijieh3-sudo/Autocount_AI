import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

  const categories = await prisma.productCategory.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      isActive: true,
      _count: {
        select: { products: true },
      },
    },
  });

  const result = categories.map((cat) => ({
    id: cat.id,
    code: cat.code,
    name: cat.name,
    description: cat.description,
    isActive: cat.isActive,
    productCount: cat._count.products,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, description } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Category code is required" },
      { status: 400 }
    );
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Category name is required" },
      { status: 400 }
    );
  }

  try {
    const category = await prisma.productCategory.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        isActive: true,
        companyId,
      },
    });
    return NextResponse.json(category, { status: 201 });
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
    console.error("Failed to create product category:", error);
    return NextResponse.json(
      { error: "Failed to create product category" },
      { status: 500 }
    );
  }
}
