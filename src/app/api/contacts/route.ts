import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { companyId: (session.user as any).companyId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(contacts);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, phone, address, taxId, type } = await req.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        taxId: taxId || null,
        type: type || "CUSTOMER",
        companyId,
      },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
