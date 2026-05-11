import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

async function resolveTaskId(projectId: string, taskId: string): Promise<string | null> {
  const db = getDb();
  const fullId = `${projectId}::${taskId}`;
  const task = await db.task.findFirst({
    where: { id: { in: [fullId, taskId] }, projectId },
    select: { id: true }
  });
  return task?.id ?? null;
}

export async function PATCH(_request: Request, { params }: { params: { projectId: string; taskId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; name?: string | null; role?: string };

  // Only Project Managers (and Admins) can mark tasks complete
  if (user.role !== "PM" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only Project Managers can mark tasks complete." }, { status: 403 });
  }

  // PM must have this project assigned
  if (user.role === "PM") {
    const db = getDb();
    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { assignedProjectIds: true } });
    if (!dbUser?.assignedProjectIds.includes(params.projectId)) {
      return NextResponse.json({ error: "You don't have access to this project." }, { status: 403 });
    }
  }

  const realId = await resolveTaskId(params.projectId, params.taskId);
  if (!realId) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  try {
    await getDb().task.update({
      where: { id: realId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: user.name || user.id
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete task." }, { status: 500 });
  }
}
