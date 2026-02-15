import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      billingAddress: true,
      deliveryAddress: true,
      sameAsBilling: true,
      taxId: true,
      brn: true,
      creditTerms: true,
      creditLimit: true,
      type: true,
      taxEntityId: true,
    },
  });

  return NextResponse.json(contacts);
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
    name,
    code,
    email,
    phone,
    billingAddress,
    deliveryAddress,
    sameAsBilling,
    taxId,
    brn,
    creditTerms,
    creditLimit,
    type,
    taxEntityId,
  } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Validate taxEntityId belongs to the same company if provided
  if (taxEntityId) {
    const taxEntity = await prisma.taxEntity.findFirst({
      where: { id: taxEntityId, companyId },
    });
    if (!taxEntity) {
      return NextResponse.json(
        { error: "Invalid tax entity" },
        { status: 400 }
      );
    }
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        name,
        code: code || null,
        email: email || null,
        phone: phone || null,
        billingAddress: billingAddress || null,
        deliveryAddress: sameAsBilling
          ? billingAddress || null
          : deliveryAddress || null,
        sameAsBilling: sameAsBilling ?? true,
        taxId: taxId || null,
        brn: brn || null,
        creditTerms: creditTerms || null,
        creditLimit:
          creditLimit !== null && creditLimit !== undefined
            ? Number(creditLimit)
            : null,
        type: type || "CUSTOMER",
        taxEntityId: taxEntityId || null,
        companyId,
      },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Failed to create contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
