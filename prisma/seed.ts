import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { crewTypes } from "../lib/constants";
import { managers, seedProjects } from "../lib/seed";
import type { Task } from "../lib/types";

const prisma = new PrismaClient();

async function main() {
  for (const manager of managers) {
    await prisma.manager.upsert({
      where: { id: manager.id },
      update: manager,
      create: manager,
    });
  }

  for (const crewType of crewTypes) {
    await prisma.crewType.upsert({
      where: { id: crewType.id },
      update: crewType,
      create: crewType,
    });
  }

  for (const project of seedProjects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        name: project.name,
        area: project.area,
        cityName: project.cityName,
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate),
        status: mapStatus(project.status),
        dailyHoursPerWorker: project.dailyHoursPerWorker,
        avgHourlyRate: project.avgHourlyRate,
        maxAvailableWorkers: project.maxAvailableWorkers,
        managerId: project.managerId,
      },
      create: {
        id: project.id,
        name: project.name,
        area: project.area,
        cityName: project.cityName,
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate),
        status: mapStatus(project.status),
        dailyHoursPerWorker: project.dailyHoursPerWorker,
        avgHourlyRate: project.avgHourlyRate,
        maxAvailableWorkers: project.maxAvailableWorkers,
        managerId: project.managerId,
      },
    });

    for (const task of project.tasks) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: taskPayload(project.id, task),
        create: {
          id: task.id,
          ...taskPayload(project.id, task),
        },
      });

      for (const [crewTypeId, units] of Object.entries(task.crewAllocation)) {
        await prisma.crewAllocation.upsert({
          where: { taskId_crewTypeId: { taskId: task.id, crewTypeId } },
          update: { units },
          create: { taskId: task.id, crewTypeId, units },
        });
      }
    }

    for (const item of project.scheduleImports) {
      await prisma.scheduleImport.upsert({
        where: { id: item.id },
        update: {
          fileName: item.fileName,
          importedAt: new Date(item.importedAt),
          newTasks: item.newTasks,
          updatedTasks: item.updatedTasks,
          skipped: item.skipped,
          status: item.status,
        },
        create: {
          id: item.id,
          projectId: project.id,
          fileName: item.fileName,
          importedAt: new Date(item.importedAt),
          newTasks: item.newTasks,
          updatedTasks: item.updatedTasks,
          skipped: item.skipped,
          status: item.status,
        },
      });
    }
  }

  const adminUsername = "admin";
  const adminPassword = "PicheAdmin2026!";
  const adminHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      name: "Piche Admin",
      username: adminUsername,
      passwordHash: adminHash,
      role: "ADMIN",
      assignedProjectIds: [],
    },
  });

  console.log("Seeded. Admin login -> username: admin  password: PicheAdmin2026!");
}

function taskPayload(projectId: string, task: Task) {
  return {
    projectId,
    name: task.name,
    startDate: new Date(task.startDate),
    endDate: new Date(task.endDate),
    totalLabourHours: task.totalLabourHours,
    labourHoursMissing: task.labourHoursMissing,
    labourHoursSource: task.labourHoursSource === "derived" ? "DERIVED" as const : "MANUAL" as const,
    totalValue: task.totalValue,
    source: task.source === "excel_import" ? "EXCEL_IMPORT" as const : "MANUAL" as const,
    lastImportedAt: task.lastImportedAt ? new Date(task.lastImportedAt) : null,
    scheduleImportBatchId: task.scheduleImportBatchId || null,
    crewRequirementMode: task.crewRequirementMode === "exact" ? "EXACT" as const : "ROUNDED" as const,
    notes: task.notes,
    assumptions: task.assumptions,
    documentLink: task.documentLink,
    sortOrder: task.sortOrder,
  };
}

function mapStatus(status: string) {
  if (status === "At Risk") return "AT_RISK" as const;
  if (status === "Planning") return "PLANNING" as const;
  return "ACTIVE" as const;
}

main().finally(() => prisma.$disconnect());
