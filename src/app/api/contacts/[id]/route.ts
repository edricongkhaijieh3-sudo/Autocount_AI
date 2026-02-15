import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const updated = await prisma.contact.updateMany({
      where: { id, companyId },
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
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
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

  try {
    await prisma.contact.deleteMany({ where: { id, companyId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Cannot delete contact with invoices" },
      { status: 400 }
    );
  }
}
