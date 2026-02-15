import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as { companyId?: string }).companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // For aged payables, we look at journal entries with EXPENSE or LIABILITY accounts
    // Since we don't have a separate "bills" model, we return the vendor contact invoices
    // In a full implementation, this would track AP from bills/purchase invoices
    const vendors = await prisma.contact.findMany({
      where: {
        companyId,
        type: { in: ["VENDOR", "BOTH"] },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const vendorData = vendors.map((v) => ({
      name: v.name,
      current: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
      total: 0,
    }));

    const grandTotal = vendorData.reduce((s, v) => s + v.total, 0);

    return NextResponse.json({
      vendors: vendorData,
      grandTotal,
    });
  } catch (error) {
    console.error("Aged payables error:", error);
    return NextResponse.json({ error: "Failed to generate aged payables" }, { status: 500 });
  }
}
