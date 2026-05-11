import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getDb().manager.findMany({
    orderBy: { name: "asc" }
  });

  const managers = rows.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email
  }));

  return NextResponse.json({ managers });
}
