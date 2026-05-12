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


type ApplyUpdate = {
  task_id: string;
  name: string;
  start: string;
  end: string;
  hours: number | null;
  total_value: number | null;
  hours_changed: boolean;
  total_value_changed: boolean;
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
  totalHours: number | null;   // null = not present in file
  totalValue: number | null;   // null = not present in file
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

    if (!existing) {
      newTasks.push({
        task_id:     row.id,
        name:        row.name,
        start:       toIso(row.startDate),
        end:         toIso(row.endDate),
        hours:       row.totalHours,
        total_value: row.totalValue,
      });
      continue;
    }

    const nameDiff   = fieldDiff(existing.name, row.name);
    const startDiff  = fieldDiff(toIso(existing.startDate), toIso(row.startDate));
    const endDiff    = fieldDiff(toIso(existing.endDate), toIso(row.endDate));

    // Hours: only "changed" when file has a value AND it differs from stored
    const dbHours = existing.labourHoursMissing ? null : existing.totalLabourHours;
    const hoursDiff = nullableFieldDiff(dbHours, row.totalHours);

    // Total Value: same rule — only changed when file has a value AND it differs
    const dbValue = existing.totalValue > 0 ? existing.totalValue : null;
    const valueDiff = nullableFieldDiff(dbValue, row.totalValue);

    const anyChanged = nameDiff.changed || startDiff.changed || endDiff.changed ||
                       hoursDiff.changed || valueDiff.changed;

    if (anyChanged) {
      updatedTasks.push({
        task_id:     row.id,
        name:        nameDiff,
        start:       startDiff,
        end:         endDiff,
        hours:       hoursDiff,
        total_value: valueDiff,
      });
    } else {
      unchangedTasks.push({
        task_id: row.id,
        name:    existing.name,
        start:   toIso(existing.startDate),
        end:     toIso(existing.endDate),
        hours:   dbHours,
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
      hours:   t.labourHoursMissing ? null : t.totalLabourHours,
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

  // Build DB task lookup by display ID (active tasks only)
  const activeTasks = project.tasks.filter(t => !t.isCompleted);
  const dbById = new Map(activeTasks.map(t => [displayTaskId(projectId, t.id), t]));

  // ── 1. Create new tasks ────────────────────────────────────────────────────
  const creates: Prisma.TaskCreateManyInput[] = body.selected_new.map((t, i) => ({
    id:                      scopedId(projectId, t.task_id),
    projectId,
    name:                    t.name,
    startDate:               new Date(t.start),
    endDate:                 new Date(t.end),
    totalLabourHours:        t.hours ?? 0,
    labourHoursMissing:      t.hours === null || t.hours <= 0,
    labourHoursSource:       "MANUAL" as const,
    totalValue:              t.total_value ?? 0,
    source:                  "EXCEL_IMPORT" as const,
    lastImportedAt:          importedAt,
    scheduleImportBatchId:   batchId,
    crewRequirementMode:     "ROUNDED" as const,
    sortOrder:               project.tasks.length + i + 1,
  }));

  let createdCount = 0;
  if (creates.length) {
    const result = await db.task.createMany({ data: creates, skipDuplicates: true });
    createdCount = result.count;

    const allocRows: Prisma.CrewAllocationCreateManyInput[] = creates.flatMap(task =>
      crewTypes.map(type => ({ taskId: task.id, crewTypeId: type.id, units: 0 }))
    );
    if (allocRows.length) {
      await db.crewAllocation.createMany({ data: allocRows, skipDuplicates: true });
    }
  }

  // ── 2. Apply updates — only overwrite fields where changed = true ──────────
  let updatedCount = 0;
  for (const upd of body.selected_updates) {
    const existing = dbById.get(upd.task_id);
    if (!existing) continue;

    const data: Prisma.TaskUpdateInput = {
      name:                  upd.name,
      startDate:             new Date(upd.start),
      endDate:               new Date(upd.end),
      source:                "EXCEL_IMPORT",
      lastImportedAt:        importedAt,
      scheduleImportBatchId: batchId,
    };

    // Only overwrite hours if the file had a value (hours_changed = true)
    if (upd.hours_changed && upd.hours !== null) {
      data.totalLabourHours   = upd.hours;
      data.labourHoursMissing = upd.hours <= 0;
    }

    // Only overwrite total_value if the file had a value
    if (upd.total_value_changed && upd.total_value !== null) {
      data.totalValue = upd.total_value;
    }

    await db.task.update({ where: { id: existing.id }, data });
    updatedCount++;
  }

  // ── 3. Hide removals ──────────────────────────────────────────────────────
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

  // ── 4. Expand project date range ──────────────────────────────────────────
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

  // ── 5. Compute import stats ───────────────────────────────────────────────
  const allSelected = [...body.selected_new, ...body.selected_updates];
  const withHours   = allSelected.filter(t => "hours" in t && t.hours !== null && (t.hours as number) > 0).length;
  const missingHrs  = allSelected.filter(t => "hours" in t && (t.hours === null || (t.hours as number) <= 0)).length;
  const withValue   = allSelected.filter(t => "total_value" in t && t.total_value !== null && (t.total_value as number) > 0).length;

  // ── 6. Record import ──────────────────────────────────────────────────────
  const skipped =
    (body.total_new      - createdCount)  +
    (body.total_updates  - updatedCount)  +
    (body.total_removals - removedCount)  +
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
      status:      `Complete|${withHours}|${missingHrs}|${withValue}`,
    }
  });

  // ── 7. Return refreshed project ───────────────────────────────────────────
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
    withHours,
    missingHrs,
    withValue,
    skipped,
    project:       refreshed ? serializeProject(refreshed as DbProject) : null,
  });
}

// ─── Spreadsheet parser ───────────────────────────────────────────────────────

function parseScheduleRows(fileName: string, buffer: ArrayBuffer): ParsedRow[] {
  const csv = fileName.toLowerCase().endsWith(".csv");
  const workbook = csv
    ? XLSX.read(Buffer.from(buffer).toString("utf8"), { type: "string", cellDates: true, raw: false })
    : XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (!rows.length) return [];

  const headers = Object.keys(rows[0]);
  const norm = (v: string) => v.toLowerCase().replace(/[\s\r\n]+/g, " ").trim();
  const exact = (...names: string[]) =>
    headers.find(h => names.some(n => norm(h) === norm(n)));
  const fuzzy = (...names: string[]) =>
    headers.find(h => names.some(n => norm(h).includes(norm(n))));

  // Exact column names from the spec, with common variants
  const idHeader    = exact("activity id", "task id") || fuzzy("activity id", "task id", "id");
  const nameHeader  = exact("activity name", "task name") || fuzzy("activity name", "task name", "name");
  const startHeader = exact("start") || fuzzy("start");
  const endHeader   = exact("finish", "end") || fuzzy("finish", "end");
  const hoursHeader = exact("total hours", "labour hours", "labor hours", "hours");
  const valueHeader = exact("total value", "value");

  return rows.map((row, i) => {
    const get   = (key?: string) => key ? String(row[key] ?? "") : "";
    const start = parseDate(get(startHeader));
    const end   = parseDate(get(endHeader));
    if (!start || !end) return null;

    const rawId = get(idHeader).trim();  // trim whitespace/WBS indentation
    return {
      id:         rawId  || `IMPORT-${i + 1}`,
      name:       get(nameHeader).trim() || rawId || `IMPORT-${i + 1}`,
      startDate:  start,
      endDate:    end,
      totalHours: parseNullableNumber(get(hoursHeader)),
      totalValue: parseNullableNumber(get(valueHeader)),
    };
  }).filter((r): r is ParsedRow => r !== null);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function fieldDiff<T>(oldVal: T, newVal: T): FieldDiff<T> {
  return { old: oldVal, new: newVal, changed: oldVal !== newVal };
}

// Only mark as changed when the incoming file value is non-null AND differs
function nullableFieldDiff<T>(stored: T | null, incoming: T | null): FieldDiff<T | null> {
  const changed = incoming !== null && incoming !== stored;
  return { old: stored, new: incoming, changed };
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  // DD/MM/YYYY
  const dmyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNullableNumber(value: string): number | null {
  if (!value || value.trim() === "" || value.trim() === "-") return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
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

function scopedId(projectId: string, taskId: string) {
  return `${projectId}::${taskId}`;
}

function displayTaskId(projectId: string, taskId: string) {
  return taskId.startsWith(`${projectId}::`)
    ? taskId.slice(projectId.length + 2)
    : taskId;
}
