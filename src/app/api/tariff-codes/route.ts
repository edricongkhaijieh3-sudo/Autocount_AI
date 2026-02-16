import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

  const tariffCodes = await prisma.tariffCode.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(tariffCodes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, description } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Tariff code is required" },
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
    const tariffCode = await prisma.tariffCode.create({
      data: {
        code: code.trim(),
        description: description.trim(),
        isActive: true,
        companyId,
      },
    });
    return NextResponse.json(tariffCode, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message?.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A tariff code with this code already exists" },
        { status: 400 }
      );
    }
    console.error("Failed to create tariff code:", error);
    return NextResponse.json(
      { error: "Failed to create tariff code" },
      { status: 500 }
    );
  }
}
