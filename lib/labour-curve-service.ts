import type { CrewAllocation as PrismaCrewAllocation, Project as PrismaProject, ScheduleImport as PrismaScheduleImport, Task as PrismaTask } from "@prisma/client";
import { addDays, bucketKey, bucketLabel, parseDate, today } from "@/lib/dates";
import { aggregateProject, capacityForProjects, dashboardRange, nextThreeWeekPeaks, projectTotalHours, workforceAnalysis, type DateRangeFilter } from "@/lib/labour";
import type { Granularity, Project, ValueMode } from "@/lib/types";

type DbTask = PrismaTask & { allocations: PrismaCrewAllocation[] };
type DbProject = PrismaProject & { tasks: DbTask[]; scheduleImports?: PrismaScheduleImport[] };

export type LabourCurvePayload = {
  chartData: Record<string, string | number>[];
  analysis: {
    peakExact: number;
    overCapacityPeriods: number;
    riskLevel: string;
    peaks: {
      label: string;
      crew: number;
      rounded: number;
      contributors: { id: string; name: string; value: number }[];
    }[];
  };
  totalHours: number;
  thisWeekPeak: number;
  capacity: number;
  projectMix: { id: string; name: string; totalHours: number }[];
  nextThreeWeeks: { startLabel: string; endLabel: string; startIso: string; endIso: string; peakCrew: number }[];
};

const cache = new Map<string, { expiresAt: number; payload: LabourCurvePayload }>();
const ttlMs = 60_000;
const maxChartPoints = 90;
const maxSharedPeriods = 1500;

export async function getCachedLabourCurve(key: string, factory: () => LabourCurvePayload | Promise<LabourCurvePayload>) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.payload;
  const payload = await factory();
  cache.set(key, { expiresAt: Date.now() + ttlMs, payload });
  return payload;
}

export function buildCompanyLabourCurvePayload({
  projects,
  granularity,
  valueMode,
  range,
  crewTypeIds,
  capacity,
  taskFilter = "all"
}: {
  projects: Project[];
  granularity: Granularity;
  valueMode: ValueMode;
  range: DateRangeFilter;
  crewTypeIds: string[];
  capacity: number;
  taskFilter?: "all" | "remaining" | "completed";
}): LabourCurvePayload {
  // Analysis + Peak Watch always use ALL tasks (never filtered)
  const analysis = workforceAnalysis(projects, granularity, valueMode, range, crewTypeIds, capacity);
  const totalHours = projects.reduce((sum, project) => sum + projectTotalHours(project), 0);
  const thisWeekPeak = workforceAnalysis(projects, "week", "crew", dashboardRange("week"), crewTypeIds, capacity).peakExact;

  // Chart data respects the task filter
  const chartProjects = taskFilter === "all" ? projects : projects.map((p) => ({
    ...p,
    tasks: p.tasks.filter((t) => taskFilter === "remaining" ? !t.isCompleted : t.isCompleted)
  }));
  const chartData = buildChartData(chartProjects, granularity, valueMode, crewTypeIds, range, capacity);

  return {
    chartData,
    analysis: {
      peakExact: analysis.peakExact,
      overCapacityPeriods: analysis.overCapacityPeriods,
      riskLevel: analysis.riskLevel,
      peaks: analysis.peaks
    },
    totalHours,
    thisWeekPeak,
    capacity,
    projectMix: projects.map((project) => ({ id: project.id, name: project.name, totalHours: projectTotalHours(project) })),
    nextThreeWeeks: nextThreeWeekPeaks(projects).map((week) => ({
      startLabel: week.startLabel,
      endLabel: week.endLabel,
      startIso: week.startIso,
      endIso: week.endIso,
      peakCrew: week.peak?.crew ?? 0
    }))
  };
}

export function buildProjectLabourCurvePayload({
  project,
  granularity,
  valueMode,
  range,
  crewTypeIds,
  capacity
}: {
  project: Project;
  granularity: Granularity;
  valueMode: ValueMode;
  range: DateRangeFilter;
  crewTypeIds: string[];
  capacity: number;
}): LabourCurvePayload {
  return buildCompanyLabourCurvePayload({ projects: [project], granularity, valueMode, range, crewTypeIds, capacity });
}

export function prismaProjectToAppProject(project: DbProject): Project {
  return {
    id: project.id,
    name: project.name,
    managerId: project.managerId,
    area: project.area,
    cityName: project.cityName,
    startDate: toIsoDate(project.startDate),
    endDate: toIsoDate(project.endDate),
    status: project.status === "AT_RISK" ? "At Risk" : project.status === "PLANNING" ? "Planning" : "Active",
    dailyHoursPerWorker: project.dailyHoursPerWorker,
    avgHourlyRate: project.avgHourlyRate,
    maxAvailableWorkers: project.maxAvailableWorkers,
    scheduleImports: (project.scheduleImports || []).map((item) => ({
      id: item.id,
      fileName: item.fileName,
      importedAt: toIsoDate(item.importedAt),
      newTasks: item.newTasks,
      updatedTasks: item.updatedTasks,
      skipped: item.skipped,
      status: item.status === "Complete" || item.status === "Partial" || item.status === "Failed" ? item.status : "Complete"
    })),
    tasks: project.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      startDate: toIsoDate(task.startDate),
      endDate: toIsoDate(task.endDate),
      totalLabourHours: task.totalLabourHours,
      labourHoursMissing: task.labourHoursMissing,
      labourHoursSource: task.labourHoursSource === "DERIVED" ? "derived" : "manual",
      totalValue: task.totalValue,
      source: task.source === "EXCEL_IMPORT" ? "excel_import" : "manual",
      lastImportedAt: task.lastImportedAt ? toIsoDate(task.lastImportedAt) : "",
      scheduleImportBatchId: task.scheduleImportBatchId || "",
      crewRequirementMode: task.crewRequirementMode === "EXACT" ? "exact" : "rounded",
      crewAllocation: Object.fromEntries(task.allocations.map((allocation) => [allocation.crewTypeId, allocation.units])),
      notes: task.notes,
      assumptions: task.assumptions,
      documentLink: task.documentLink,
      sortOrder: task.sortOrder,
      isCompleted: task.isCompleted,
      completedAt: task.completedAt ? task.completedAt.toISOString() : undefined,
      completedBy: task.completedBy || undefined
    }))
  };
}

export function parseCurveSearchParams(searchParams: URLSearchParams) {
  const windowId = searchParams.get("window") || "full";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  return {
    granularity: parseGranularity(searchParams.get("granularity")),
    valueMode: parseValueMode(searchParams.get("valueMode")),
    range: dashboardRange(windowId, startDate, endDate),
    crewTypeIds: (searchParams.get("crewTypeIds") || "").split(",").map((id) => id.trim()).filter(Boolean),
    capacity: Number(searchParams.get("capacity") || 0),
    taskFilter: parseTaskFilter(searchParams.get("taskFilter"))
  };
}

function parseTaskFilter(value: string | null): "all" | "remaining" | "completed" {
  if (value === "remaining" || value === "completed") return value;
  return "all";
}

function buildChartData(projects: Project[], granularity: Granularity, valueMode: ValueMode, crewTypeIds: string[], range: DateRangeFilter, capacity: number) {
  const periods = buildSharedPeriods(projects, granularity, range);
  const projectSeries = new Map<string, Map<string, number>>();
  projects.forEach((project) => {
    projectSeries.set(
      project.name,
      new Map(aggregateProject(project, granularity, valueMode, range, crewTypeIds).map((point) => [point.sort, point.value]))
    );
  });

  return downsampleChartData(periods.map((period) => {
    const row: Record<string, string | number> = {
      period: period.label,
      sort: period.sort,
      "Total Demand": 0
    };

    projects.forEach((project) => {
      const value = projectSeries.get(project.name)?.get(period.sort) ?? 0;
      row[project.name] = value;
      row["Total Demand"] = Number(row["Total Demand"]) + value;
    });

    return row;
  }));
}

function buildSharedPeriods(projects: Project[], granularity: Granularity, range: DateRangeFilter) {
  if (!projects.length) return [];
  const startDate = range.startDate || projects.map((project) => project.startDate).filter(Boolean).sort()[0];
  const endDate = range.endDate || projects.map((project) => project.endDate).filter(Boolean).sort().at(-1);
  if (!startDate || !endDate) return [];

  const periods: { label: string; sort: string }[] = [];
  let cursor = periodStart(parseDate(startDate), granularity);
  const end = parseDate(endDate);
  let guard = 0;

  while (cursor <= end && guard < maxSharedPeriods) {
    periods.push({ label: bucketLabel(cursor, granularity), sort: bucketKey(cursor, granularity) });
    cursor = nextPeriod(cursor, granularity);
    guard += 1;
  }

  return periods;
}

function periodStart(date: Date, granularity: Granularity) {
  if (granularity === "day") return date;
  if (granularity === "week") {
    const next = new Date(date);
    next.setDate(next.getDate() - next.getDay() + 1);
    return next;
  }
  if (granularity === "year") return new Date(date.getFullYear(), 0, 1);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function nextPeriod(date: Date, granularity: Granularity) {
  if (granularity === "day") return addDays(date, 1);
  if (granularity === "week") return addDays(date, 7);
  const next = new Date(date);
  if (granularity === "year") {
    next.setFullYear(next.getFullYear() + 1, 0, 1);
    return next;
  }
  next.setMonth(next.getMonth() + 1, 1);
  return next;
}

function downsampleChartData(rows: Record<string, string | number>[]) {
  if (rows.length <= maxChartPoints) return rows;
  const step = Math.ceil(rows.length / maxChartPoints);
  const sampled = rows.filter((_, index) => index % step === 0);
  const last = rows[rows.length - 1];
  return sampled[sampled.length - 1] === last ? sampled : [...sampled, last];
}

function parseGranularity(value: string | null): Granularity {
  return value === "day" || value === "month" || value === "year" ? value : "week";
}

function parseValueMode(value: string | null): ValueMode {
  return value === "hours" ? "hours" : "crew";
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
