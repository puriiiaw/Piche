import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: { projectId: string; month: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };

  // Only Admin and VP can delete timesheet records
  if (user.role !== "ADMIN" && user.role !== "VP") {
    return NextResponse.json(
      { error: "Only Admin and VP can delete timesheet records." },
      { status: 403 }
    );
  }

  try {
    await getDb().actualHours.delete({
      where: { projectId_month: { projectId: params.projectId, month: params.month } }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }
}
