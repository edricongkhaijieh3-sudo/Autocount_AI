import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const body = await req.json();

  const field = await prisma.customField.create({
    data: {
      companyId,
      templateId: body.templateId,
      section: body.section,
      fieldName: body.fieldName,
      fieldKey: body.fieldKey,
      fieldType: body.fieldType || "text",
      isRequired: body.isRequired || false,
      sortOrder: body.sortOrder || 0,
      options: body.options || null,
      defaultVal: body.defaultVal || null,
    },
  });

  return NextResponse.json(field, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.customField.deleteMany({ where: { id, companyId } });
  return NextResponse.json({ success: true });
}
