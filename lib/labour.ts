import { addDays, bucketKey, bucketLabel, iso, parseDate, today, workingDays } from "@/lib/dates";
import type { Granularity, PeriodPoint, Project, Task, ValueMode } from "@/lib/types";

export type DateRangeFilter = {
  startDate?: string | null;
  endDate?: string | null;
};

export function taskLabourHours(task: Pick<Task, "totalLabourHours" | "totalValue">, avgHourlyRate: number): number {
  if (task.totalLabourHours > 0) return task.totalLabourHours;
  if (task.totalValue > 0) return task.totalValue / Math.max(1, avgHourlyRate);
  return 0;
}

export function taskWorkingDays(task: Pick<Task, "startDate" | "endDate">): Date[] {
  return workingDays(task.startDate, task.endDate);
}

export function taskAverageCrew(task: Task, project: Project): number {
  const days = Math.max(1, taskWorkingDays(task).length);
  return taskLabourHours(task, project.avgHourlyRate) / days / Math.max(1, project.dailyHoursPerWorker);
}

export function taskRoundedCrew(task: Task, project: Project): number {
  return Math.ceil(taskAverageCrew(task, project));
}

export function taskSeverity(task: Task, project: Project, scenarioCapacity?: number | null): "normal" | "warning" | "danger" {
  const capacity = scenarioCapacity || project.maxAvailableWorkers;
  const rounded = taskRoundedCrew(task, project);
  if (rounded > capacity) return "danger";
  if (rounded >= capacity * 0.65 || rounded >= 8) return "warning";
  return "normal";
}

export function projectTotalHours(project: Project): number {
  return project.tasks.reduce((sum, task) => sum + taskLabourHours(task, project.avgHourlyRate), 0);
}

export function effectiveTaskHours(task: Task, project: Project, crewTypeIds: string[]): number {
  const totalHours = taskLabourHours(task, project.avgHourlyRate);
  const allocationTotal = Object.values(task.crewAllocation).reduce((sum, value) => sum + Number(value || 0), 0);
  if (!crewTypeIds.length || !allocationTotal) return totalHours;
  const selectedUnits = crewTypeIds.reduce((sum, id) => sum + Number(task.crewAllocation[id] || 0), 0);
  return selectedUnits ? totalHours * (selectedUnits / allocationTotal) : 0;
}

export function aggregateProject(
  project: Project,
  granularity: Granularity,
  valueMode: ValueMode,
  range: DateRangeFilter = {},
  crewTypeIds: string[] = []
): PeriodPoint[] {
  const buckets = new Map<string, PeriodPoint>();

  project.tasks.forEach((task) => {
    const working = boundedWorkingDays(task.startDate, task.endDate, range);
    if (working.labourHoursTruncated) {
      console.warn(`[labour] Timeline truncated while aggregating task ${task.id} in project ${project.id}. Check task dates before relying on curve totals.`);
    }
    const days = working.days;
    const totalWorkingDays = countBoundedWorkingDays(task.startDate, task.endDate);
    const hours = effectiveTaskHours(task, project, crewTypeIds);
    const dailyHours = hours / Math.max(1, totalWorkingDays);
    const dailyCrew = dailyHours / Math.max(1, project.dailyHoursPerWorker);

    days.forEach((date) => {
      const key = bucketKey(date, granularity);
      const current = buckets.get(key) || {
        label: bucketLabel(date, granularity),
        sort: key,
        value: 0,
        hours: 0,
        crew: 0
      };
      current.hours += dailyHours;
      current.crew += dailyCrew;
      current.labourHoursTruncated = current.labourHoursTruncated || working.labourHoursTruncated;
      current.value = valueMode === "hours" ? current.hours : current.crew;
      buckets.set(key, current);
    });
  });

  return Array.from(buckets.values()).sort((a, b) => a.sort.localeCompare(b.sort));
}

export function periodTotals(
  projects: Project[],
  granularity: Granularity,
  valueMode: ValueMode,
  range: DateRangeFilter = {},
  crewTypeIds: string[] = []
): PeriodPoint[] {
  const totals = new Map<string, PeriodPoint>();
  projects.forEach((project) => {
    aggregateProject(project, granularity, valueMode, range, crewTypeIds).forEach((point) => {
      const current = totals.get(point.label) || { ...point, value: 0, hours: 0, crew: 0 };
      current.hours += point.hours;
      current.crew += point.crew;
      current.value += point.value;
      totals.set(point.label, current);
    });
  });
  return Array.from(totals.values()).sort((a, b) => a.sort.localeCompare(b.sort));
}

export function capacityForProjects(projects: Project[], companyCapacity: number, isVp: boolean): number {
  return isVp ? companyCapacity : projects.reduce((sum, project) => sum + project.maxAvailableWorkers, 0);
}

export function workforceAnalysis(
  projects: Project[],
  granularity: Granularity,
  valueMode: ValueMode,
  range: DateRangeFilter,
  crewTypeIds: string[],
  capacity: number
) {
  const periods = periodTotals(projects, granularity, valueMode, range, crewTypeIds);
  const crewPeriods = periodTotals(projects, granularity, "crew", range, crewTypeIds);
  const peaks = crewPeriods
    .map((period) => ({
      ...period,
      rounded: Math.ceil(period.crew),
      contributors: projectContributors(projects, granularity, range, crewTypeIds, period.label)
    }))
    .sort((a, b) => b.crew - a.crew)
    .slice(0, 6);
  const overCapacity = crewPeriods.filter((period) => period.crew > capacity);
  const peakExact = peaks[0]?.crew ?? 0;
  const riskLevel = overCapacity.length ? "Red" : peakExact >= capacity * 0.85 ? "Yellow" : "Green";

  return {
    periods,
    crewPeriods,
    peaks,
    overCapacityPeriods: overCapacity.length,
    peakExact,
    riskLevel
  };
}

export function projectContributors(
  projects: Project[],
  granularity: Granularity,
  range: DateRangeFilter,
  crewTypeIds: string[],
  label: string
) {
  return projects
    .map((project) => {
      const point = aggregateProject(project, granularity, "crew", range, crewTypeIds).find((item) => item.label === label);
      return { id: project.id, name: project.name, value: point?.crew ?? 0 };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function dashboardRange(windowId: string, startDate?: string, endDate?: string): DateRangeFilter {
  const start = parseDate(today());
  if (windowId === "week") return { startDate: iso(start), endDate: iso(addDays(start, 6)) };
  if (windowId === "two") return { startDate: iso(start), endDate: iso(addDays(start, 13)) };
  if (windowId === "six") return { startDate: iso(start), endDate: iso(addDays(start, 41)) };
  if (windowId === "month") return { startDate: iso(new Date(start.getFullYear(), start.getMonth(), 1)), endDate: iso(new Date(start.getFullYear(), start.getMonth() + 1, 0)) };
  if (windowId === "custom") return { startDate: startDate || null, endDate: endDate || null };
  return {};
}

function boundedWorkingDays(startDate: string, endDate: string, range: DateRangeFilter): { days: Date[]; labourHoursTruncated: boolean } {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const rangeStart = range.startDate ? parseDate(range.startDate) : start;
  const rangeEnd = range.endDate ? parseDate(range.endDate) : end;
  const effectiveStart = new Date(Math.max(start.getTime(), rangeStart.getTime()));
  const effectiveEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
  if (!Number.isFinite(effectiveStart.getTime()) || !Number.isFinite(effectiveEnd.getTime()) || effectiveStart > effectiveEnd) {
    return { days: [], labourHoursTruncated: false };
  }
  return collectWorkingDays(effectiveStart, effectiveEnd);
}

function countBoundedWorkingDays(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) return 1;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(1, count);
}

function collectWorkingDays(start: Date, end: Date): { days: Date[]; labourHoursTruncated: boolean } {
  const days: Date[] = [];
  const cursor = new Date(start);
  let guard = 0;
  let labourHoursTruncated = false;
  while (cursor <= end) {
    if (guard >= maxTaskTimelineDays) {
      labourHoursTruncated = true;
      console.warn(`[labour] Working-day collection stopped after ${maxTaskTimelineDays} calendar days from ${start.toISOString()} to ${end.toISOString()}.`);
      break;
    }
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return { days: days.length ? days : [new Date(start)], labourHoursTruncated };
}

const maxTaskTimelineDays = 10_000;

export function ganttPeriods(project: Project, granularity: Granularity) {
  const start = parseDate(project.startDate);
  const end = parseDate(project.endDate);
  const periods: { key: string; label: string; start: Date; end: Date }[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const periodStart = periodStartFor(cursor, granularity);
    const periodEnd = periodEndFor(cursor, granularity);
    periods.push({
      key: bucketKey(cursor, granularity),
      label: bucketLabel(cursor, granularity),
      start: periodStart,
      end: periodEnd
    });
    if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
    if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
    if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1, 1);
    if (granularity === "year") cursor.setFullYear(cursor.getFullYear() + 1, 0, 1);
  }

  return periods;
}

function periodStartFor(date: Date, granularity: Granularity): Date {
  const next = new Date(date);
  if (granularity === "day") return next;
  if (granularity === "week") {
    next.setDate(next.getDate() - next.getDay() + 1);
    return next;
  }
  if (granularity === "year") return new Date(next.getFullYear(), 0, 1);
  return new Date(next.getFullYear(), next.getMonth(), 1);
}

function periodEndFor(date: Date, granularity: Granularity): Date {
  const start = periodStartFor(date, granularity);
  if (granularity === "day") return start;
  if (granularity === "week") return addDays(start, 6);
  if (granularity === "year") return new Date(start.getFullYear(), 11, 31);
  return new Date(start.getFullYear(), start.getMonth() + 1, 0);
}

export function taskPlacement(task: Task, periods: ReturnType<typeof ganttPeriods>) {
  const start = parseDate(task.startDate);
  const end = parseDate(task.endDate);
  const startIndex = Math.max(0, periods.findIndex((period) => end >= period.start && start <= period.end));
  let endIndex = periods.findIndex((period) => end >= period.start && end <= period.end);
  if (endIndex < 0) endIndex = periods.length - 1;
  return { startIndex, span: Math.max(1, endIndex - startIndex + 1) };
}

export function nextThreeWeekPeaks(projects: Project[]) {
  const start = parseDate(today());
  return [0, 1, 2].map((index) => {
    const weekStart = addDays(start, index * 7);
    const weekEnd = addDays(weekStart, 6);
    const points = periodTotals(projects, "day", "crew", { startDate: iso(weekStart), endDate: iso(weekEnd) });
    const peak = points.sort((a, b) => b.crew - a.crew)[0];
    return {
      startLabel: weekStart.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      endLabel: weekEnd.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      peak
    };
  });
}
