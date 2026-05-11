import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db = getDb();

  try {
    const maxOrder = await db.task.aggregate({ where: { projectId: params.projectId }, _max: { sortOrder: true } });
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const task = await db.task.create({
      data: {
        id: body.id || crypto.randomUUID(),
        projectId: params.projectId,
        name: String(body.name || ""),
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        totalLabourHours: Number(body.totalLabourHours || 0),
        labourHoursMissing: Boolean(body.labourHoursMissing ?? true),
        labourHoursSource: body.labourHoursSource === "derived" ? "DERIVED" : "MANUAL",
        totalValue: Number(body.totalValue || 0),
        source: "MANUAL",
        crewRequirementMode: body.crewRequirementMode === "exact" ? "EXACT" : "ROUNDED",
        notes: String(body.notes || ""),
        assumptions: String(body.assumptions || ""),
        documentLink: String(body.documentLink || ""),
        sortOrder,
        allocations: {
          create: Object.entries(body.crewAllocation || {})
            .filter(([, units]) => Number(units) > 0)
            .map(([crewTypeId, units]) => ({ crewTypeId, units: Number(units) }))
        }
      },
      include: { allocations: true }
    });

    return NextResponse.json({
      task: {
        id: task.id,
        name: task.name,
        startDate: task.startDate.toISOString().slice(0, 10),
        endDate: task.endDate.toISOString().slice(0, 10),
        totalLabourHours: task.totalLabourHours,
        labourHoursMissing: task.labourHoursMissing,
        labourHoursSource: task.labourHoursSource === "DERIVED" ? "derived" : "manual",
        totalValue: task.totalValue,
        source: "manual",
        crewRequirementMode: task.crewRequirementMode === "EXACT" ? "exact" : "rounded",
        crewAllocation: Object.fromEntries(task.allocations.map((a) => [a.crewTypeId, a.units])),
        notes: task.notes,
        assumptions: task.assumptions,
        documentLink: task.documentLink,
        sortOrder: task.sortOrder,
        lastImportedAt: "",
        scheduleImportBatchId: ""
      }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create task." }, { status: 500 });
  }
}
