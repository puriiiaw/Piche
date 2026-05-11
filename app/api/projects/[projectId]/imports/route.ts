import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { crewTypes } from "@/lib/constants";

export const runtime = "nodejs";

type ParsedScheduleRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  totalValue: number;
};

type ImportedProject = Prisma.ProjectGetPayload<{
  include: {
    tasks: { include: { allocations: true } };
    scheduleImports: true;
  };
}>;

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured. Connect PostgreSQL before running backend imports." }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV, XLS, or XLSX schedule file." }, { status: 400 });
  }

  const db = getDb();
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    include: { tasks: { include: { allocations: true } } }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const rows = parseScheduleRows(file.name, await file.arrayBuffer());
  if (!rows.length) {
    return NextResponse.json({ error: "No valid schedule rows were found." }, { status: 400 });
  }

  const existingById = new Map(project.tasks.map((task) => [task.id, task]));
  const batchId = `import-${Date.now()}`;
  const importedAt = new Date();
  let newTasks = 0;
  let updatedTasks = 0;
  let skipped = 0;

  await db.$transaction(async (tx) => {
    for (const row of rows) {
      const existing = existingById.get(row.id);
      if (existing) {
        const changed = existing.name !== row.name
          || existing.startDate.getTime() !== row.startDate.getTime()
          || existing.endDate.getTime() !== row.endDate.getTime();

        if (!changed) {
          skipped += 1;
          continue;
        }

        await tx.task.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            startDate: row.startDate,
            endDate: row.endDate,
            source: "EXCEL_IMPORT",
            lastImportedAt: importedAt,
            scheduleImportBatchId: batchId
          }
        });
        updatedTasks += 1;
        continue;
      }

      const totalLabourHours = row.totalValue > 0 ? row.totalValue / Math.max(1, project.avgHourlyRate) : 0;
      await tx.task.create({
        data: {
          id: row.id,
          projectId: project.id,
          name: row.name,
          startDate: row.startDate,
          endDate: row.endDate,
          totalLabourHours,
          labourHoursMissing: totalLabourHours <= 0 && row.totalValue <= 0,
          labourHoursSource: row.totalValue > 0 ? "DERIVED" : "MANUAL",
          totalValue: row.totalValue,
          source: "EXCEL_IMPORT",
          lastImportedAt: importedAt,
          scheduleImportBatchId: batchId,
          crewRequirementMode: "ROUNDED",
          sortOrder: project.tasks.length + newTasks + 1,
          allocations: {
            create: crewTypes.map((type) => ({ crewTypeId: type.id, units: 0 }))
          }
        }
      });
      newTasks += 1;
    }

    await tx.project.update({
      where: { id: project.id },
      data: {
        startDate: minDate([project.startDate, ...rows.map((row) => row.startDate)]),
        endDate: maxDate([project.endDate, ...rows.map((row) => row.endDate)])
      }
    });

    await tx.scheduleImport.create({
      data: {
        id: batchId,
        projectId: project.id,
        fileName: file.name,
        importedAt,
        newTasks,
        updatedTasks,
        skipped,
        status: "Complete"
      }
    });
  });

  const refreshed = await db.project.findUnique({
    where: { id: project.id },
    include: {
      tasks: { include: { allocations: true }, orderBy: { sortOrder: "asc" } },
      scheduleImports: { orderBy: { importedAt: "desc" } }
    }
  });

  return NextResponse.json({
    batchId,
    fileName: file.name,
    importedAt: importedAt.toISOString(),
    newTasks,
    updatedTasks,
    skipped,
    totalRows: rows.length,
    project: refreshed ? serializeProject(refreshed) : null
  });
}

function parseScheduleRows(fileName: string, buffer: ArrayBuffer): ParsedScheduleRow[] {
  const records = parseWorkbook(buffer, fileName.toLowerCase().endsWith(".csv"));
  return mapRows(records);
}

function parseWorkbook(buffer: ArrayBuffer, csv = false) {
  const workbook = csv
    ? XLSX.read(Buffer.from(buffer).toString("utf8"), { type: "string", cellDates: true, raw: false })
    : XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
}

function mapRows(rows: Record<string, unknown>[]): ParsedScheduleRow[] {
  const headers = Object.keys(rows[0] || {});
  const findHeader = (...names: string[]) => headers.find((item) => names.some((name) => item.toLowerCase().includes(name)));
  const idHeader = findHeader("task id", "activity id", "id");
  const nameHeader = findHeader("task name", "activity name", "name");
  const startHeader = findHeader("start");
  const endHeader = findHeader("end", "finish");
  const valueHeader = findHeader("total value", "value");

  return rows.map((row, index) => {
    const get = (key?: string) => key ? String(row[key] || "") : "";
    const startDate = normalizeDate(get(startHeader));
    const endDate = normalizeDate(get(endHeader));
    return {
      id: get(idHeader) || `IMPORT-${index + 1}`,
      name: get(nameHeader) || get(idHeader) || `IMPORT-${index + 1}`,
      startDate,
      endDate,
      totalValue: Number(get(valueHeader).replace(/[$,]/g, "") || 0)
    };
  }).filter((row): row is ParsedScheduleRow => Boolean(row.startDate && row.endDate));
}

function normalizeDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function minDate(dates: Date[]) {
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function maxDate(dates: Date[]) {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function serializeProject(project: ImportedProject) {
  return {
    ...project,
    startDate: toIsoDate(project.startDate),
    endDate: toIsoDate(project.endDate),
    status: project.status === "AT_RISK" ? "At Risk" : project.status === "PLANNING" ? "Planning" : "Active",
    tasks: project.tasks.map((task) => ({
      ...task,
      startDate: toIsoDate(task.startDate),
      endDate: toIsoDate(task.endDate),
      labourHoursSource: task.labourHoursSource === "DERIVED" ? "derived" : "manual",
      source: task.source === "EXCEL_IMPORT" ? "excel_import" : "manual",
      lastImportedAt: task.lastImportedAt ? toIsoDate(task.lastImportedAt) : "",
      crewRequirementMode: task.crewRequirementMode === "EXACT" ? "exact" : "rounded",
      crewAllocation: Object.fromEntries(task.allocations.map((allocation) => [allocation.crewTypeId, allocation.units])),
      allocations: undefined
    })),
    scheduleImports: project.scheduleImports.map((item) => ({
      ...item,
      importedAt: toIsoDate(item.importedAt),
      status: item.status
    }))
  };
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
