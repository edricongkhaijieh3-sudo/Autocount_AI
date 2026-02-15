import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId },
    include: {
      lines: { include: { account: true } },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId },
  });

  if (!entry) {
    return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
  }

  await prisma.journalEntry.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
