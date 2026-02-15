import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { code, name, type, description } = await req.json();
  const companyId = (session.user as any).companyId;

  const account = await prisma.account.updateMany({
    where: { id, companyId },
    data: { code, name, type, description },
  });

  if (account.count === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;

  try {
    await prisma.account.deleteMany({ where: { id, companyId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Cannot delete account with journal entries" }, { status: 400 });
  }
}
