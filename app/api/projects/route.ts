import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { slug } from "@/lib/format";
import { serializeProject } from "@/lib/project-serializer";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await cleanupExpiredDeletedTasks();
  const [projects, pmUsers] = await Promise.all([
    db.project.findMany({
      include: {
        tasks: { include: { allocations: true, deletedByUser: { select: { name: true, username: true } } }, orderBy: { sortOrder: "asc" } },
        scheduleImports: { orderBy: { importedAt: "desc" } }
      },
      orderBy: { createdAt: "asc" }
    }),
    db.manager.findMany({ orderBy: { name: "asc" } })
  ]);

  const managers = pmUsers.map((m) => ({ id: m.id, name: m.name, email: m.email }));
  return NextResponse.json({ projects: projects.map(serializeProject), managers });
}

async function cleanupExpiredDeletedTasks() {
  const db = getDb();
  const expired = await db.task.findMany({
    where: { isDeleted: true, permanentDeleteAt: { lt: new Date() } },
    select: { id: true, projectId: true }
  });
  if (!expired.length) return;

  const result = await db.task.deleteMany({ where: { id: { in: expired.map((task) => task.id) } } });
  await db.auditEvent.create({
    data: {
      action: "PERMANENT_DELETE_EXPIRED_TASKS",
      entity: "Task",
      entityId: "daily-cleanup",
      after: { deletedCount: result.count, taskIds: expired.map((task) => task.id) }
    }
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

  const id = slug(name);
  const db = getDb();
  try {
    const project = await db.project.create({
      data: {
        id,
        name,
        managerId: String(body.managerId || ""),
        area: String(body.area || ""),
        cityName: String(body.cityName || ""),
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        status: mapStatus(String(body.status || "Planning")),
        dailyHoursPerWorker: Number(body.dailyHoursPerWorker || 0),
        avgHourlyRate: Number(body.avgHourlyRate || 0),
        maxAvailableWorkers: Number(body.maxAvailableWorkers || 0)
      },
      include: {
        tasks: { include: { allocations: true, deletedByUser: { select: { name: true, username: true } } }, orderBy: { sortOrder: "asc" } },
        scheduleImports: { orderBy: { importedAt: "desc" } }
      }
    });
    return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create project.";
    if (message.includes("Unique constraint") || message.includes("unique constraint")) {
      return NextResponse.json({ error: "A project with that name already exists. Please choose a different name." }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapStatus(status: string) {
  if (status === "At Risk") return "AT_RISK";
  if (status === "Active") return "ACTIVE";
  return "PLANNING";
}
