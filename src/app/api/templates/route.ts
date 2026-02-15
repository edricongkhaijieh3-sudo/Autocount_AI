import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultTemplateConfig } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const templates = await prisma.invoiceTemplate.findMany({
    where: { companyId: (session.user as any).companyId },
    include: { customFields: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, docType } = await req.json();
  const companyId = (session.user as any).companyId;

  const template = await prisma.invoiceTemplate.create({
    data: {
      name: name || "New Template",
      docType: docType || "INVOICE",
      config: defaultTemplateConfig as any,
      companyId,
    },
    include: { customFields: true },
  });

  return NextResponse.json(template, { status: 201 });
}
