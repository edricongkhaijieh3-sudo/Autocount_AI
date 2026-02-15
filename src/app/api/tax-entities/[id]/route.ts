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

  const taxEntity = await prisma.taxEntity.findFirst({
    where: { id, companyId },
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

  if (!taxEntity) {
    return NextResponse.json(
      { error: "Tax entity not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...taxEntity,
    contactCount: taxEntity._count.contacts,
    _count: undefined,
  });
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
  const { entityName, tin, brn, sstNo, msicCode } = body;

  if (!entityName || typeof entityName !== "string" || !entityName.trim()) {
    return NextResponse.json(
      { error: "Entity name is required" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.taxEntity.updateMany({
      where: { id, companyId },
      data: {
        entityName: entityName.trim(),
        tin: tin?.trim() || null,
        brn: brn?.trim() || null,
        sstNo: sstNo?.trim() || null,
        msicCode: msicCode?.trim() || null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Tax entity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update tax entity:", error);
    return NextResponse.json(
      { error: "Failed to update tax entity" },
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

  // Check if any contacts are linked to this entity
  const linkedContacts = await prisma.contact.count({
    where: { taxEntityId: id },
  });

  if (linkedContacts > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${linkedContacts} contact(s) are linked to this tax entity. Unlink them first.`,
      },
      { status: 400 }
    );
  }

  try {
    await prisma.taxEntity.deleteMany({ where: { id, companyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tax entity:", error);
    return NextResponse.json(
      { error: "Failed to delete tax entity" },
      { status: 500 }
    );
  }
}
