import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { serializeProject } from "@/lib/project-serializer";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    await getDb().project.delete({ where: { id: params.projectId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete project." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db = getDb();

  try {
    const project = await db.project.update({
      where: { id: params.projectId },
      data: {
        ...(body.name !== undefined && { name: String(body.name) }),
        ...(body.managerId !== undefined && { managerId: String(body.managerId) }),
        ...(body.area !== undefined && { area: String(body.area) }),
        ...(body.cityName !== undefined && { cityName: String(body.cityName) }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
        ...(body.status !== undefined && { status: mapStatus(String(body.status)) }),
        ...(body.dailyHoursPerWorker !== undefined && { dailyHoursPerWorker: Number(body.dailyHoursPerWorker) }),
        ...(body.avgHourlyRate !== undefined && { avgHourlyRate: Number(body.avgHourlyRate) }),
        ...(body.maxAvailableWorkers !== undefined && { maxAvailableWorkers: Number(body.maxAvailableWorkers) })
      },
      include: {
        tasks: { include: { allocations: true }, orderBy: { sortOrder: "asc" } },
        scheduleImports: { orderBy: { importedAt: "desc" } }
      }
    });
    return NextResponse.json({ project: serializeProject(project) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update project." }, { status: 500 });
  }
}

function mapStatus(status: string) {
  if (status === "At Risk") return "AT_RISK";
  if (status === "Active") return "ACTIVE";
  return "PLANNING";
}
