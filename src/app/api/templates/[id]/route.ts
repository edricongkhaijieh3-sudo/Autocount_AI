import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;

  const template = await prisma.invoiceTemplate.findFirst({
    where: { id, companyId },
    include: { customFields: { orderBy: { sortOrder: "asc" } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;
  const body = await req.json();

  const updated = await prisma.invoiceTemplate.updateMany({
    where: { id, companyId },
    data: {
      name: body.name,
      docType: body.docType,
      config: body.config,
      isDefault: body.isDefault,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // If setting as default, unset other defaults
  if (body.isDefault) {
    await prisma.invoiceTemplate.updateMany({
      where: { companyId, id: { not: id }, docType: body.docType },
      data: { isDefault: false },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;

  await prisma.invoiceTemplate.deleteMany({ where: { id, companyId } });
  return NextResponse.json({ success: true });
}
