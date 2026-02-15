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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as any).companyId;

  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    include: { contact: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const {
    contactId,
    date,
    dueDate,
    docType = "INVOICE",
    status = "DRAFT",
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

  const year = new Date(date).getFullYear();
  const count = await prisma.invoice.count({
    where: {
      companyId,
      invoiceNo: { startsWith: `INV-${year}-` },
    },
  });
  const invoiceNo = `INV-${year}-${String(count + 1).padStart(3, "0")}`;

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

  const correctedLineData = lines.map((line: any, i: number) => {
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
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        date: new Date(date),
        dueDate: new Date(dueDate),
        contactId,
        status: status || "DRAFT",
        docType: docType || "INVOICE",
        subtotal: totalSubtotal,
        taxTotal: totalTax,
        total,
        notes: notes || null,
        customFieldValues: customFieldValues ?? null,
        templateId: templateId || null,
        companyId,
        lines: {
          create: correctedLineData,
        },
      },
      include: {
        contact: { select: { id: true, name: true } },
        lines: true,
      },
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Invoice number already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}
