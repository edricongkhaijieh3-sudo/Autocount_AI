import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

  const taxCodes = await prisma.taxCode.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(taxCodes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, description, rate, taxType } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Tax code is required" },
      { status: 400 }
    );
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    );
  }

  try {
    const taxCode = await prisma.taxCode.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description.trim(),
        rate: rate ? parseFloat(rate) : 0,
        taxType: taxType || "OUTPUT",
        isActive: true,
        companyId,
      },
    });
    return NextResponse.json(taxCode, { status: 201 });
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
    console.error("Failed to create tax code:", error);
    return NextResponse.json(
      { error: "Failed to create tax code" },
      { status: 500 }
    );
  }
}
