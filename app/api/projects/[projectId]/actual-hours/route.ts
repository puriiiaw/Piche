import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

// Distribute task labour hours across calendar months using working days
function calcPlannedHours(
  tasks: { startDate: Date; endDate: Date; totalLabourHours: number }[]
): { month: string; totalHours: number }[] {
  const monthly: Record<string, number> = {};

  for (const task of tasks) {
    if (task.totalLabourHours <= 0) continue;

    const start = new Date(task.startDate);
    const end   = new Date(task.endDate);

    // Collect working days (Mon–Fri) across the task duration
    const workingDays: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) workingDays.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (workingDays.length === 0) continue;

    const dailyHours = task.totalLabourHours / workingDays.length;

    for (const day of workingDays) {
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = (monthly[key] ?? 0) + dailyHours;
    }
  }

  return Object.entries(monthly)
    .map(([month, totalHours]) => ({ month, totalHours: Math.round(totalHours) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; role?: string };

  // PM access check
  if (user.role === "PM") {
    const db = getDb();
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { assignedProjectIds: true }
    });
    if (!dbUser?.assignedProjectIds.includes(params.projectId)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
  }

  const db = getDb();

  const [actuals, tasks] = await Promise.all([
    db.actualHours.findMany({
      where: { projectId: params.projectId },
      orderBy: { month: "asc" }
    }),
    db.task.findMany({
      where: { projectId: params.projectId, isCompleted: false, isDeleted: false },
      select: { startDate: true, endDate: true, totalLabourHours: true }
    })
  ]);

  const planned = calcPlannedHours(tasks);

  return NextResponse.json({
    actuals: actuals.map(a => ({
      id: a.id,
      month: a.month,
      totalHours: a.totalHours,
      uploadedAt: a.uploadedAt.toISOString(),
      uploadedBy: a.uploadedBy,
      originalFilename: a.originalFilename,
      rowCount: a.rowCount
    })),
    planned
  });
}
