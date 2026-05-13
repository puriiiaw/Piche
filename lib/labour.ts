import { addDays, bucketKey, bucketLabel, dateRange, iso, parseDate, today, workingDays } from "@/lib/dates";
import type { Granularity, PeriodPoint, Project, Task, ValueMode } from "@/lib/types";

export type DateRangeFilter = {
  startDate?: string | null;
  endDate?: string | null;
};

export function taskLabourHours(task: Pick<Task, "totalLabourHours" | "labourHoursMissing">): number {
  if (task.labourHoursMissing) return 0;
  return task.totalLabourHours;
}

export function taskWorkingDays(task: Pick<Task, "startDate" | "endDate">): Date[] {
  return workingDays(task.startDate, task.endDate);
}

export function taskAverageCrew(task: Task, project: Project): number {
  const days = Math.max(1, taskWorkingDays(task).length);
  return taskLabourHours(task) / days / Math.max(1, project.dailyHoursPerWorker);
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
  return project.tasks
    .filter((task) => !task.isDeleted)
    .reduce((sum, task) => sum + taskLabourHours(task), 0);
}

export function effectiveTaskHours(task: Task, project: Project, crewTypeIds: string[]): number {
  const totalHours = taskLabourHours(task);
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
  const dailyTotals = new Map<string, { date: Date; hours: number; crew: number }>();

  project.tasks.filter((task) => !task.isDeleted).forEach((task) => {
    const days = taskWorkingDays(task);
    const filteredDays = filterDates(days, range);
    const hours = effectiveTaskHours(task, project, crewTypeIds);
    const dailyHours = hours / Math.max(1, days.length);
    const dailyCrew = dailyHours / Math.max(1, project.dailyHoursPerWorker);

    filteredDays.forEach((date) => {
      const key = iso(date);
      const current = dailyTotals.get(key) || { date, hours: 0, crew: 0 };
      current.hours += dailyHours;
      current.crew += dailyCrew;
      dailyTotals.set(key, current);
    });
  });

  const buckets = new Map<string, PeriodPoint>();
  dailyTotals.forEach((day) => {
    const key = bucketKey(day.date, granularity);
    const current = buckets.get(key) || {
      label: bucketLabel(day.date, granularity),
      sort: key,
      value: 0,
      hours: 0,
      crew: 0
    };
    current.hours += day.hours;
    current.crew = Math.max(current.crew, day.crew);
    current.value = valueMode === "hours" ? current.hours : current.crew;
    buckets.set(key, current);
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
  // Pre-compute each project's crew aggregation once — reused for totals AND contributor lookups
  const projectCrewData = projects.map((project) => ({
    project,
    periods: aggregateProject(project, granularity, "crew", range, crewTypeIds)
  }));

  // Merge pre-computed data into combined crew periods (avoids a second pass through all tasks)
  const crewTotals = new Map<string, PeriodPoint>();
  for (const { periods } of projectCrewData) {
    for (const point of periods) {
      const current = crewTotals.get(point.label) ?? { ...point, value: 0, hours: 0, crew: 0 };
      current.hours += point.hours;
      current.crew += point.crew;
      current.value += point.value;
      crewTotals.set(point.label, current);
    }
  }
  const crewPeriods = Array.from(crewTotals.values()).sort((a, b) => a.sort.localeCompare(b.sort));

  // Reuse crew data when valueMode === "crew" to avoid a redundant full pass
  const periods = valueMode === "crew" ? crewPeriods : periodTotals(projects, granularity, valueMode, range, crewTypeIds);

  // Build peaks with contributors from already-computed project data (no extra aggregateProject calls)
  const peaks = crewPeriods
    .map((period) => ({
      ...period,
      rounded: Math.ceil(period.crew),
      contributors: projectCrewData
        .map(({ project, periods: projectPeriods }) => {
          const point = projectPeriods.find((p) => p.label === period.label);
          return { id: project.id, name: project.name, value: point?.crew ?? 0 };
        })
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value)
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

function filterDates(dates: Date[], range: DateRangeFilter): Date[] {
  const start = range.startDate ? parseDate(range.startDate).getTime() : -Infinity;
  const end = range.endDate ? parseDate(range.endDate).getTime() : Infinity;
  return dates.filter((date) => date.getTime() >= start && date.getTime() <= end);
}

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
  return new Date(next.getFullYear(), next.getMonth(), 1);
}

function periodEndFor(date: Date, granularity: Granularity): Date {
  const start = periodStartFor(date, granularity);
  if (granularity === "day") return start;
  if (granularity === "week") return addDays(start, 6);
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
      startIso: iso(weekStart),
      endIso: iso(weekEnd),
      peak
    };
  });
}
