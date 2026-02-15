import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { companyId: (session.user as any).companyId },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, name, type, description } = await req.json();
  const companyId = (session.user as any).companyId;

  try {
    const account = await prisma.account.create({
      data: { code, name, type, description, companyId },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Account code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
