import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/** Resolve the real DB task id — handles the `projectId::displayId` prefix used by the serializer. */
async function resolveTaskId(projectId: string, taskId: string): Promise<string | null> {
  const db = getDb();
  const fullId = `${projectId}::${taskId}`;
  const task = await db.task.findFirst({
    where: { id: { in: [fullId, taskId] }, projectId },
    select: { id: true }
  });
  return task?.id ?? null;
}

export async function PATCH(request: Request, { params }: { params: { projectId: string; taskId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db = getDb();

  const realId = await resolveTaskId(params.projectId, params.taskId);
  if (!realId) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  try {
    await db.task.update({
      where: { id: realId },
      data: {
        ...(body.name !== undefined && { name: String(body.name) }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
        ...(body.totalLabourHours !== undefined && { totalLabourHours: Number(body.totalLabourHours) }),
        ...(body.labourHoursMissing !== undefined && { labourHoursMissing: Boolean(body.labourHoursMissing) }),
        ...(body.labourHoursSource !== undefined && { labourHoursSource: body.labourHoursSource === "derived" ? "DERIVED" : "MANUAL" }),
        ...(body.totalValue !== undefined && { totalValue: Number(body.totalValue) }),
        ...(body.crewRequirementMode !== undefined && { crewRequirementMode: body.crewRequirementMode === "exact" ? "EXACT" : "ROUNDED" }),
        ...(body.notes !== undefined && { notes: String(body.notes) }),
        ...(body.assumptions !== undefined && { assumptions: String(body.assumptions) }),
        ...(body.documentLink !== undefined && { documentLink: String(body.documentLink) }),
        ...(body.crewAllocation !== undefined && {
          allocations: {
            deleteMany: {},
            create: Object.entries(body.crewAllocation as Record<string, number>)
              .filter(([, units]) => Number(units) > 0)
              .map(([crewTypeId, units]) => ({ crewTypeId, units: Number(units) }))
          }
        })
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update task." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { projectId: string; taskId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const realId = await resolveTaskId(params.projectId, params.taskId);
  if (!realId) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  try {
    await getDb().task.delete({ where: { id: realId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete task." }, { status: 500 });
  }
}
