import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const settingKey = "company_max_workers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setting = await getDb().companySetting.findUnique({ where: { key: settingKey } });
  return NextResponse.json({ value: setting ? Number(setting.value) : 0 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json();
  const value = Number(body.value);
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "Company max must be a valid positive number." }, { status: 400 });
  }

  const setting = await getDb().companySetting.upsert({
    where: { key: settingKey },
    update: { value: String(value), updatedBy: user.id },
    create: { key: settingKey, value: String(value), updatedBy: user.id }
  });

  return NextResponse.json({ value: Number(setting.value) });
}
