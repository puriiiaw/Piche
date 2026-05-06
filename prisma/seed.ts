import { PrismaClient } from "@prisma/client";
import { crewTypes } from "../lib/constants";
import { managers, seedProjects } from "../lib/seed";

const prisma = new PrismaClient();

async function main() {
  for (const manager of managers) {
    await prisma.manager.upsert({
      where: { id: manager.id },
      update: manager,
      create: manager
    });
  }

  for (const crewType of crewTypes) {
    await prisma.crewType.upsert({
      where: { id: crewType.id },
      update: crewType,
      create: crewType
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
        managerId: project.managerId
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
        managerId: project.managerId
      }
    });
  }
}

function mapStatus(status: string) {
  if (status === "At Risk") return "AT_RISK" as const;
  if (status === "Planning") return "PLANNING" as const;
  return "ACTIVE" as const;
}

main().finally(async () => {
  await prisma.$disconnect();
});
