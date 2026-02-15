import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function calcLineAmount(
  quantity: number,
  unitPrice: number,
  discount: number,
  taxRate: number
): number {
  const subtotal = quantity * unitPrice;
  const afterDiscount = subtotal * (1 - discount / 100);
  const taxAmount = afterDiscount * (taxRate / 100);
  return afterDiscount + taxAmount;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: {
      contact: true,
      template: { include: { customFields: { orderBy: { sortOrder: "asc" } } } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;

  const existing = await prisma.invoice.findFirst({
    where: { id, companyId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    contactId,
    date,
    dueDate,
    docType,
    status,
    notes,
    customFieldValues,
    templateId,
    lines,
  } = body;

  if (!contactId || !date || !dueDate || !Array.isArray(lines)) {
    return NextResponse.json(
      { error: "Missing required fields: contactId, date, dueDate, lines" },
      { status: 400 }
    );
  }

  const totalSubtotal = lines.reduce((sum: number, line: any) => {
    const qty = Number(line.quantity) || 0;
    const unitPrice = Number(line.unitPrice) || 0;
    const discount = Number(line.discount) || 0;
    return sum + qty * unitPrice * (1 - discount / 100);
  }, 0);

  const totalTax = lines.reduce((sum: number, line: any) => {
    const qty = Number(line.quantity) || 0;
    const unitPrice = Number(line.unitPrice) || 0;
    const discount = Number(line.discount) || 0;
    const taxRate = Number(line.taxRate) || 0;
    const afterDiscount = qty * unitPrice * (1 - discount / 100);
    return sum + afterDiscount * (taxRate / 100);
  }, 0);

  const total = totalSubtotal + totalTax;

  const lineData = lines.map((line: any, i: number) => {
    const qty = Number(line.quantity) || 0;
    const unitPrice = Number(line.unitPrice) || 0;
    const discount = Number(line.discount) || 0;
    const taxRate = Number(line.taxRate) || 0;
    const amount = calcLineAmount(qty, unitPrice, discount, taxRate);
    return {
      itemName: line.itemName || "",
      itemCode: line.itemCode || "",
      description: line.description || "",
      quantity: qty,
      unitPrice,
      discount,
      taxRate,
      amount,
      sortOrder: i,
    };
  });

  try {
    await prisma.$transaction([
      prisma.invoiceLine.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          date: new Date(date),
          dueDate: new Date(dueDate),
          contactId,
          status: status ?? existing.status,
          docType: docType ?? existing.docType,
          subtotal: totalSubtotal,
          taxTotal: totalTax,
          total,
          notes: notes ?? null,
          customFieldValues: customFieldValues ?? existing.customFieldValues,
          templateId: templateId ?? existing.templateId,
          lines: {
            create: lineData,
          },
        },
      }),
    ]);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        contact: { select: { id: true, name: true } },
        lines: true,
      },
    });
    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;

  const existing = await prisma.invoice.findFirst({
    where: { id, companyId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status } = body;

  if (!status || !["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;

  const existing = await prisma.invoice.findFirst({
    where: { id, companyId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  try {
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
