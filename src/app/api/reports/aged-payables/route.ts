import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    vendors: [],
    grandTotal: 0,
  });
}
