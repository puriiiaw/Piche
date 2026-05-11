import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildProjectLabourCurvePayload, getCachedLabourCurve, parseCurveSearchParams, prismaProjectToAppProject } from "@/lib/labour-curve-service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured. Connect PostgreSQL before requesting labour curve data." }, { status: 503 });
  }

  const url = new URL(request.url);
  const parsed = parseCurveSearchParams(url.searchParams);
  const cacheKey = `project:${params.projectId}:${url.searchParams.toString()}`;

  const payload = await getCachedLabourCurve(cacheKey, async () => {
    const db = getDb();
    const project = await db.project.findUnique({
      where: { id: params.projectId },
      include: {
        tasks: { include: { allocations: true }, orderBy: { sortOrder: "asc" } },
        scheduleImports: true
      }
    });

    if (!project) {
      return buildProjectLabourCurvePayload({
        project: {
          id: params.projectId,
          name: "Missing project",
          managerId: "",
          area: "",
          cityName: "",
          startDate: "",
          endDate: "",
          status: "Planning",
          dailyHoursPerWorker: 1,
          avgHourlyRate: 1,
          maxAvailableWorkers: parsed.capacity,
          tasks: [],
          scheduleImports: []
        },
        granularity: parsed.granularity,
        valueMode: parsed.valueMode,
        range: parsed.range,
        crewTypeIds: parsed.crewTypeIds,
        capacity: parsed.capacity
      });
    }

    const appProject = prismaProjectToAppProject(project);
    return buildProjectLabourCurvePayload({
      project: appProject,
      granularity: parsed.granularity,
      valueMode: parsed.valueMode,
      range: parsed.range,
      crewTypeIds: parsed.crewTypeIds,
      capacity: parsed.capacity || appProject.maxAvailableWorkers
    });
  });

  return NextResponse.json(payload);
}
