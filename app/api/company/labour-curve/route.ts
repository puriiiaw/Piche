import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildCompanyLabourCurvePayload, getCachedLabourCurve, parseCurveSearchParams, prismaProjectToAppProject } from "@/lib/labour-curve-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured. Connect PostgreSQL before requesting labour curve data." }, { status: 503 });
  }

  const url = new URL(request.url);
  const projectIds = (url.searchParams.get("projectIds") || "").split(",").map((id) => id.trim()).filter(Boolean);
  const area = url.searchParams.get("area") || "all";
  const parsed = parseCurveSearchParams(url.searchParams);
  const cacheKey = `company:${url.searchParams.toString()}`;

  const payload = await getCachedLabourCurve(cacheKey, async () => {
    const db = getDb();
    const projects = await db.project.findMany({
      where: {
        ...(projectIds.length ? { id: { in: projectIds } } : {}),
        ...(area !== "all" ? { area } : {})
      },
      include: {
        tasks: { include: { allocations: true }, orderBy: { sortOrder: "asc" } },
        scheduleImports: true
      },
      orderBy: { name: "asc" }
    });
    const appProjects = projects.map(prismaProjectToAppProject);
    return buildCompanyLabourCurvePayload({
      projects: appProjects,
      granularity: parsed.granularity,
      valueMode: parsed.valueMode,
      range: parsed.range,
      crewTypeIds: parsed.crewTypeIds,
      capacity: parsed.capacity,
      taskFilter: parsed.taskFilter
    });
  });

  return NextResponse.json(payload);
}
