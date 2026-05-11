import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { crewTypes } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { serializeProject, type DbProject } from "@/lib/project-serializer";

export const runtime = "nodejs";

type ParsedScheduleRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  totalValue: number;
};

type PreviewRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  action: "new" | "update" | "unchanged";
  selected: boolean;
};

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL is not configured. Connect PostgreSQL before running backend imports." }, { status: 503 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return applySelectedRows(request, params.projectId);
    }

    return previewUploadedFile(request, params.projectId);
  } catch (error) {
    console.error("Schedule import failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 500 });
  }
}

async function previewUploadedFile(request: Request, projectId: string) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV, XLS, or XLSX schedule file." }, { status: 400 });
  }

  const db = getDb();
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { tasks: { include: { allocations: true } } }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const rows = parseScheduleRows(file.name, await file.arrayBuffer());
  if (!rows.length) {
    return NextResponse.json({ error: "No valid schedule rows were found." }, { status: 400 });
  }

  const existingById = new Map(project.tasks.map((task) => [displayTaskId(project.id, task.id), task]));
  const previewRows: PreviewRow[] = rows.map((row) => {
    const existing = existingById.get(row.id);
    const action = !existing
      ? "new"
      : existing.name !== row.name || existing.startDate.getTime() !== row.startDate.getTime() || existing.endDate.getTime() !== row.endDate.getTime()
        ? "update"
        : "unchanged";

    return {
      id: row.id,
      name: row.name,
      startDate: toIsoDate(row.startDate),
      endDate: toIsoDate(row.endDate),
      totalValue: row.totalValue,
      action,
      selected: action !== "unchanged"
    };
  });

  return NextResponse.json({
    mode: "preview",
    fileName: file.name,
    totalRows: previewRows.length,
    newRows: previewRows.filter((row) => row.action === "new").length,
    updateRows: previewRows.filter((row) => row.action === "update").length,
    unchangedRows: previewRows.filter((row) => row.action === "unchanged").length,
    rows: previewRows
  });
}

async function applySelectedRows(request: Request, projectId: string) {
  const body = await request.json() as { fileName?: string; rows?: PreviewRow[] };
  const selectedRows = (body.rows || [])
    .filter((row) => row.selected && row.action !== "unchanged")
    .map((row) => ({
      id: row.id,
      name: row.name,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      totalValue: Number(row.totalValue || 0)
    }))
    .filter((row) => row.id && row.name && !Number.isNaN(row.startDate.getTime()) && !Number.isNaN(row.endDate.getTime()));

  const db = getDb();
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { tasks: { include: { allocations: true } } }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (!selectedRows.length) {
    return NextResponse.json({ error: "Choose at least one new or changed task before applying the import." }, { status: 400 });
  }

  const existingById = new Map(project.tasks.map((task) => [displayTaskId(project.id, task.id), task]));
  const batchId = `import-${Date.now()}`;
  const importedAt = new Date();
  const updates: { id: string; row: ParsedScheduleRow }[] = [];
  const creates: Prisma.TaskCreateManyInput[] = [];

  for (const [index, row] of selectedRows.entries()) {
    const existing = existingById.get(row.id);
    if (existing) {
      updates.push({ id: existing.id, row });
      continue;
    }

    const totalLabourHours = row.totalValue > 0 ? row.totalValue / Math.max(1, project.avgHourlyRate) : 0;
    creates.push({
      id: scopedTaskId(project.id, row.id),
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
      sortOrder: project.tasks.length + index + 1
    });
  }

  for (const { id, row } of updates) {
    await db.task.update({
      where: { id },
      data: {
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
        source: "EXCEL_IMPORT",
        lastImportedAt: importedAt,
        scheduleImportBatchId: batchId
      }
    });
  }

  const created = creates.length ? await db.task.createMany({ data: creates, skipDuplicates: true }) : { count: 0 };
  const allocationRows: Prisma.CrewAllocationCreateManyInput[] = creates.flatMap((task) =>
    crewTypes.map((type) => ({ taskId: task.id, crewTypeId: type.id, units: 0 }))
  );
  if (allocationRows.length) {
    await db.crewAllocation.createMany({ data: allocationRows, skipDuplicates: true });
  }

  await db.project.update({
    where: { id: project.id },
    data: {
      startDate: minDate([project.startDate, ...selectedRows.map((row) => row.startDate)]),
      endDate: maxDate([project.endDate, ...selectedRows.map((row) => row.endDate)])
    }
  });

  await db.scheduleImport.create({
    data: {
      id: batchId,
      projectId: project.id,
      fileName: body.fileName || "Selected schedule rows",
      importedAt,
      newTasks: created.count,
      updatedTasks: updates.length,
      skipped: (body.rows || []).length - selectedRows.length,
      status: "Complete"
    }
  });

  const refreshed = await db.project.findUnique({
    where: { id: project.id },
    include: {
      tasks: { include: { allocations: true }, orderBy: { sortOrder: "asc" } },
      scheduleImports: { orderBy: { importedAt: "desc" } }
    }
  });

  return NextResponse.json({
    mode: "complete",
    batchId,
    fileName: body.fileName || "Selected schedule rows",
    importedAt: importedAt.toISOString(),
    newTasks: created.count,
    updatedTasks: updates.length,
    skipped: (body.rows || []).length - selectedRows.length,
    totalRows: body.rows?.length || selectedRows.length,
    project: refreshed ? serializeProject(refreshed as DbProject) : null
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

function scopedTaskId(projectId: string, taskId: string) {
  return `${projectId}::${taskId}`;
}

function displayTaskId(projectId: string, taskId: string) {
  return taskId.startsWith(`${projectId}::`) ? taskId.slice(projectId.length + 2) : taskId;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
