import type { CrewAllocation as PrismaCrewAllocation, Project as PrismaProject, ScheduleImport as PrismaScheduleImport, Task as PrismaTask } from "@prisma/client";
import type { Project } from "@/lib/types";

type DbTask = PrismaTask & { allocations: PrismaCrewAllocation[] };
export type DbProject = PrismaProject & { tasks: DbTask[]; scheduleImports: PrismaScheduleImport[] };

export function serializeProject(project: DbProject): Project {
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
    tasks: project.tasks.map((task) => ({
      id: displayTaskId(project.id, task.id),
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
    })),
    scheduleImports: project.scheduleImports.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      importedAt: toIsoDate(item.importedAt),
      newTasks: item.newTasks,
      updatedTasks: item.updatedTasks,
      skipped: item.skipped,
      status: item.status === "Partial" || item.status === "Failed" ? item.status : "Complete"
    }))
  };
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function displayTaskId(projectId: string, taskId: string) {
  return taskId.startsWith(`${projectId}::`) ? taskId.slice(projectId.length + 2) : taskId;
}
