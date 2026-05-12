import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { crewTypes } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { serializeProject, type DbProject } from "@/lib/project-serializer";
import type {
  FieldDiff,
  NewTaskDiff,
  UpdatedTaskDiff,
  RemovedTaskDiff,
  UnchangedTaskDiff,
  DiffResult,
} from "@/lib/import-types";

export const runtime = "nodejs";

// Re-export so existing import paths still work if needed
export type { FieldDiff, NewTaskDiff, UpdatedTaskDiff, RemovedTaskDiff, UnchangedTaskDiff, DiffResult };

type ApplyUpdate = {
  task_id: string;
  name: string;
  start: string;
  end: string;
  hours: number;
  total_value: number;
};

type ApplyBody = {
  fileName: string;
  selected_new: NewTaskDiff[];
  selected_updates: ApplyUpdate[];
  selected_removals: string[];
  total_new: number;
  total_updates: number;
  total_removals: number;
  total_unchanged: number;
};

// ─── Row shape coming from the spreadsheet parser ─────────────────────────────

type ParsedRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  totalHours: number;
  totalValue: number;
};

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured." },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return applyImport(request, params.projectId);
    }
    return computeDiff(request, params.projectId);
  } catch (err) {
    console.error("Schedule import error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed." },
      { status: 500 }
    );
  }
}

// ─── STEP 1: Compute diff ─────────────────────────────────────────────────────

async function computeDiff(request: Request, projectId: string) {
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
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const parsed = parseScheduleRows(file.name, await file.arrayBuffer());
  if (!parsed.length) {
    return NextResponse.json({ error: "No valid schedule rows were found." }, { status: 400 });
  }

  const avgRate = project.avgHourlyRate || 1;

  // Build lookup: displayId → DB task (only active / non-completed tasks)
  const activeTasks = project.tasks.filter(t => !t.isCompleted);
  const dbById = new Map(activeTasks.map(t => [displayTaskId(projectId, t.id), t]));

  // Task IDs present in file
  const fileIds = new Set(parsed.map(r => r.id));

  const newTasks:       NewTaskDiff[]       = [];
  const updatedTasks:   UpdatedTaskDiff[]   = [];
  const unchangedTasks: UnchangedTaskDiff[] = [];

  for (const row of parsed) {
    const existing = dbById.get(row.id);
    const derivedHours = row.totalValue > 0 ? row.totalValue / avgRate : 0;
    const importHours = row.totalHours > 0 ? row.totalHours : derivedHours;

    if (!existing) {
      newTasks.push({
        task_id:     row.id,
        name:        row.name,
        start:       toIso(row.startDate),
        end:         toIso(row.endDate),
        hours:       Math.round(importHours * 100) / 100,
        total_value: row.totalValue,
      });
      continue;
    }

    const nameDiff   = fieldDiff(existing.name, row.name);
    const startDiff  = fieldDiff(toIso(existing.startDate), toIso(row.startDate));
    const endDiff    = fieldDiff(toIso(existing.endDate), toIso(row.endDate));
    const valueDiff  = fieldDiff(existing.totalValue, row.totalValue);

    const anyChanged = nameDiff.changed || startDiff.changed || endDiff.changed || valueDiff.changed;

    if (anyChanged) {
      updatedTasks.push({
        task_id:     row.id,
        name:        nameDiff,
        start:       startDiff,
        end:         endDiff,
        hours:       fieldDiff(existing.totalLabourHours, existing.totalLabourHours),
        total_value: valueDiff,
      });
    } else {
      unchangedTasks.push({
        task_id: row.id,
        name:    existing.name,
        start:   toIso(existing.startDate),
        end:     toIso(existing.endDate),
        hours:   existing.totalLabourHours,
      });
    }
  }

  // Removed: active DB tasks not present in the file
  const removedTasks: RemovedTaskDiff[] = activeTasks
    .filter(t => !fileIds.has(displayTaskId(projectId, t.id)))
    .map(t => ({
      task_id: displayTaskId(projectId, t.id),
      name:    t.name,
      start:   toIso(t.startDate),
      end:     toIso(t.endDate),
      hours:   t.totalLabourHours,
    }));

  const totalUnchangedCount = unchangedTasks.length;
  const result: DiffResult = {
    mode:                 "diff",
    fileName:             file.name,
    uploadedAt:           new Date().toISOString(),
    new_tasks:            newTasks,
    updated_tasks:        updatedTasks,
    removed_tasks:        removedTasks,
    unchanged_tasks:      unchangedTasks,
    total_unchanged_count: totalUnchangedCount,
  };

  return NextResponse.json(result);
}

// ─── STEP 2: Apply selections ─────────────────────────────────────────────────

async function applyImport(request: Request, projectId: string) {
  const body = await request.json() as ApplyBody;

  const db = getDb();
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { include: { allocations: true }, orderBy: { sortOrder: "asc" } },
      scheduleImports: { orderBy: { importedAt: "desc" } }
    }
  });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  if (
    !body.selected_new?.length &&
    !body.selected_updates?.length &&
    !body.selected_removals?.length
  ) {
    return NextResponse.json({ error: "No changes selected." }, { status: 400 });
  }

  const batchId    = `import-${Date.now()}`;
  const importedAt = new Date();
  const avgRate    = project.avgHourlyRate || 1;

  // Build DB task lookup by display ID (active tasks only)
  const activeTasks = project.tasks.filter(t => !t.isCompleted);
  const dbById = new Map(activeTasks.map(t => [displayTaskId(projectId, t.id), t]));

  // ── 1. Create new tasks ────────────────────────────────────────────────────
  const creates: Prisma.TaskCreateManyInput[] = body.selected_new.map((t, i) => {
    const hours = t.hours > 0 ? t.hours : (t.total_value > 0 ? t.total_value / avgRate : 0);
    return {
      id:                      scopedId(projectId, t.task_id),
      projectId,
      name:                    t.name,
      startDate:               new Date(t.start),
      endDate:                 new Date(t.end),
      totalLabourHours:        hours,
      labourHoursMissing:      hours <= 0,
      labourHoursSource:       t.total_value > 0 ? "DERIVED" : "MANUAL",
      totalValue:              t.total_value,
      source:                  "EXCEL_IMPORT",
      lastImportedAt:          importedAt,
      scheduleImportBatchId:   batchId,
      crewRequirementMode:     "ROUNDED",
      sortOrder:               project.tasks.length + i + 1,
    };
  });

  let createdCount = 0;
  if (creates.length) {
    const result = await db.task.createMany({ data: creates, skipDuplicates: true });
    createdCount = result.count;

    // Seed crew allocations for new tasks
    const allocRows: Prisma.CrewAllocationCreateManyInput[] = creates.flatMap(task =>
      crewTypes.map(type => ({ taskId: task.id, crewTypeId: type.id, units: 0 }))
    );
    if (allocRows.length) {
      await db.crewAllocation.createMany({ data: allocRows, skipDuplicates: true });
    }
  }

  // ── 2. Apply updates ───────────────────────────────────────────────────────
  let updatedCount = 0;
  for (const upd of body.selected_updates) {
    const existing = dbById.get(upd.task_id);
    if (!existing) continue;
    await db.task.update({
      where: { id: existing.id },
      data: {
        name:                  upd.name,
        startDate:             new Date(upd.start),
        endDate:               new Date(upd.end),
        totalValue:            upd.total_value,
        source:                "EXCEL_IMPORT",
        lastImportedAt:        importedAt,
        scheduleImportBatchId: batchId,
      }
    });
    updatedCount++;
  }

  // ── 3. Hide removals (mark as completed → goes to Archive) ────────────────
  let removedCount = 0;
  for (const taskId of body.selected_removals) {
    const existing = dbById.get(taskId);
    if (!existing) continue;
    await db.task.update({
      where: { id: existing.id },
      data: { isCompleted: true, completedAt: importedAt, completedBy: "import" }
    });
    removedCount++;
  }

  // ── 4. Expand project date range to fit new/updated tasks ─────────────────
  const allNewDates = body.selected_new.flatMap(t => [new Date(t.start), new Date(t.end)]);
  const allUpdDates = body.selected_updates.flatMap(t => [new Date(t.start), new Date(t.end)]);
  const allDates    = [...allNewDates, ...allUpdDates];

  if (allDates.length) {
    await db.project.update({
      where: { id: projectId },
      data: {
        startDate: minDate([project.startDate, ...allDates]),
        endDate:   maxDate([project.endDate,   ...allDates]),
      }
    });
  }

  // ── 5. Record import ───────────────────────────────────────────────────────
  const skipped =
    (body.total_new       - createdCount)  +
    (body.total_updates   - updatedCount)  +
    (body.total_removals  - removedCount)  +
    body.total_unchanged;

  await db.scheduleImport.create({
    data: {
      id:          batchId,
      projectId,
      fileName:    body.fileName,
      importedAt,
      newTasks:    createdCount,
      updatedTasks: updatedCount,
      skipped,
      status:      "Complete",
    }
  });

  // ── 6. Return refreshed project ────────────────────────────────────────────
  const refreshed = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks:           { include: { allocations: true }, orderBy: { sortOrder: "asc" } },
      scheduleImports: { orderBy: { importedAt: "desc" } }
    }
  });

  return NextResponse.json({
    mode:          "complete",
    batchId,
    fileName:      body.fileName,
    importedAt:    importedAt.toISOString(),
    newTasks:      createdCount,
    updatedTasks:  updatedCount,
    removedTasks:  removedCount,
    skipped,
    project:       refreshed ? serializeProject(refreshed as DbProject) : null,
  });
}

// ─── Spreadsheet parser (unchanged from original) ─────────────────────────────

function parseScheduleRows(fileName: string, buffer: ArrayBuffer): ParsedRow[] {
  const csv = fileName.toLowerCase().endsWith(".csv");
  const workbook = csv
    ? XLSX.read(Buffer.from(buffer).toString("utf8"), { type: "string", cellDates: true, raw: false })
    : XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (!rows.length) return [];

  const headers    = Object.keys(rows[0]);
  const normalizeHeader = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
  const exact       = (...names: string[]) =>
    headers.find(h => names.some(n => normalizeHeader(h) === normalizeHeader(n)));
  const find       = (...names: string[]) =>
    headers.find(h => names.some(n => normalizeHeader(h).includes(normalizeHeader(n))));
  const idHeader    = find("task id", "activity id", "id");
  const nameHeader  = find("task name", "activity name", "name");
  const startHeader = find("start");
  const endHeader   = find("end", "finish");
  const hoursHeader = exact("total hours", "labour hours", "labor hours", "worker hours", "hours");
  const valueHeader = exact("total value") || find("value");

  return rows.map((row, i) => {
    const get    = (key?: string) => key ? String(row[key] || "") : "";
    const start  = parseDate(get(startHeader));
    const end    = parseDate(get(endHeader));
    return {
      id:         get(idHeader)  || `IMPORT-${i + 1}`,
      name:       get(nameHeader) || get(idHeader) || `IMPORT-${i + 1}`,
      startDate:  start!,
      endDate:    end!,
      totalHours: parseNumber(get(hoursHeader)),
      totalValue: parseNumber(get(valueHeader)),
    };
  }).filter((r): r is ParsedRow => Boolean(r.startDate && r.endDate));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function fieldDiff<T>(oldVal: T, newVal: T): FieldDiff<T> {
  return { old: oldVal, new: newVal, changed: oldVal !== newVal };
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function minDate(dates: Date[]) {
  return new Date(Math.min(...dates.map(d => d.getTime())));
}

function maxDate(dates: Date[]) {
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

function parseNumber(value: string) {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scopedId(projectId: string, taskId: string) {
  return `${projectId}::${taskId}`;
}

function displayTaskId(projectId: string, taskId: string) {
  return taskId.startsWith(`${projectId}::`)
    ? taskId.slice(projectId.length + 2)
    : taskId;
}
