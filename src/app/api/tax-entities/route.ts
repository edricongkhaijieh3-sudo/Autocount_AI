import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

  const taxEntities = await prisma.taxEntity.findMany({
    where: { companyId },
    orderBy: { entityName: "asc" },
    select: {
      id: true,
      entityName: true,
      tin: true,
      brn: true,
      sstNo: true,
      msicCode: true,
      _count: {
        select: { contacts: true },
      },
    },
  });

  // Flatten _count into contactCount for the frontend
  const result = taxEntities.map((te) => ({
    id: te.id,
    entityName: te.entityName,
    tin: te.tin,
    brn: te.brn,
    sstNo: te.sstNo,
    msicCode: te.msicCode,
    contactCount: te._count.contacts,
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
  const { entityName, tin, brn, sstNo, msicCode } = body;

  if (!entityName || typeof entityName !== "string" || !entityName.trim()) {
    return NextResponse.json(
      { error: "Entity name is required" },
      { status: 400 }
    );
  }

  try {
    const taxEntity = await prisma.taxEntity.create({
      data: {
        entityName: entityName.trim(),
        tin: tin?.trim() || null,
        brn: brn?.trim() || null,
        sstNo: sstNo?.trim() || null,
        msicCode: msicCode?.trim() || null,
        companyId,
      },
    });
    return NextResponse.json(taxEntity, { status: 201 });
  } catch (error) {
    console.error("Failed to create tax entity:", error);
    return NextResponse.json(
      { error: "Failed to create tax entity" },
      { status: 500 }
    );
  }
}
