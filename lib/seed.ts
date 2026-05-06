import { crewTypes } from "@/lib/constants";
import type { AppState, CrewAllocation, Manager, Project, Task } from "@/lib/types";

export const managers: Manager[] = [
  { id: "pm1", name: "Priya Manager", email: "priya@piche.local" },
  { id: "pm2", name: "Marc LeBlanc", email: "marc@piche.local" },
  { id: "pm3", name: "Sofia Chen", email: "sofia@piche.local" }
];

function allocation(kind: "layout" | "stud" | "gypsum" | "joint" | "finish" | "general"): CrewAllocation {
  const base = Object.fromEntries(crewTypes.map((type) => [type.id, 0])) as CrewAllocation;
  if (kind === "layout") return { ...base, layout: 1, labourer: 0.5 };
  if (kind === "stud") return { ...base, stud: 2, layout: 0.5, labourer: 0.5 };
  if (kind === "gypsum") return { ...base, gypsum: 2, labourer: 1 };
  if (kind === "joint") return { ...base, joint: 2, finisher: 0.5 };
  if (kind === "finish") return { ...base, finisher: 2, labourer: 0.5 };
  return { ...base, labourer: 2, other: 0.5 };
}

function task(
  id: string,
  name: string,
  startDate: string,
  endDate: string,
  totalLabourHours: number,
  crewAllocation: CrewAllocation,
  sortOrder: number,
  overrides: Partial<Task> = {}
): Task {
  return {
    id,
    name,
    startDate,
    endDate,
    totalLabourHours,
    labourHoursMissing: !totalLabourHours && !overrides.totalValue,
    labourHoursSource: overrides.totalValue && !totalLabourHours ? "derived" : "manual",
    totalValue: overrides.totalValue ?? 0,
    source: overrides.source ?? "manual",
    lastImportedAt: overrides.lastImportedAt ?? "",
    scheduleImportBatchId: overrides.scheduleImportBatchId ?? "",
    crewRequirementMode: overrides.crewRequirementMode ?? "rounded",
    crewAllocation,
    notes: overrides.notes ?? "",
    assumptions: overrides.assumptions ?? "",
    documentLink: overrides.documentLink ?? "",
    sortOrder
  };
}

export const seedProjects: Project[] = [
  {
    id: "qeii",
    name: "QEII Halifax Hospital",
    managerId: "pm1",
    area: "Out of Town",
    cityName: "Halifax",
    startDate: "2026-05-04",
    endDate: "2026-09-25",
    status: "Active",
    dailyHoursPerWorker: 10,
    avgHourlyRate: 82,
    maxAvailableWorkers: 34,
    scheduleImports: [{ id: "imp-qeii-1", fileName: "QEII baseline schedule.xlsx", importedAt: "2026-04-28", newTasks: 3, updatedTasks: 0, skipped: 0, status: "Complete" }],
    tasks: [
      task("Q-101", "Level 2 Rough-in", "2026-05-04", "2026-06-12", 4200, allocation("stud"), 1, { notes: "Coordinate with mechanical rough-in zones." }),
      task("Q-142", "Mechanical Room Fit-up", "2026-06-03", "2026-07-24", 6200, allocation("gypsum"), 2, { assumptions: "Ten hour days; two crews during peak overlap." }),
      task("Q-210", "Final Tie-ins", "2026-08-03", "2026-09-25", 3600, allocation("finish"), 3)
    ]
  },
  {
    id: "terminal",
    name: "Dartmouth Ferry Terminal",
    managerId: "pm1",
    area: "Out of Town",
    cityName: "Dartmouth",
    startDate: "2026-04-27",
    endDate: "2026-07-31",
    status: "At Risk",
    dailyHoursPerWorker: 10,
    avgHourlyRate: 80,
    maxAvailableWorkers: 24,
    scheduleImports: [],
    tasks: [
      task("F-009", "Service Relocation", "2026-04-27", "2026-05-22", 1800, allocation("general"), 1),
      task("F-030", "Envelope Install", "2026-05-25", "2026-07-10", 4600, allocation("gypsum"), 2),
      task("F-070", "Commissioning Support", "2026-07-13", "2026-07-31", 1200, allocation("finish"), 3)
    ]
  },
  {
    id: "bridge",
    name: "Harbour Bridge Rehab",
    managerId: "pm2",
    area: "Out of Town",
    cityName: "Halifax",
    startDate: "2026-05-18",
    endDate: "2026-08-28",
    status: "Active",
    dailyHoursPerWorker: 9,
    avgHourlyRate: 86,
    maxAvailableWorkers: 28,
    scheduleImports: [],
    tasks: [
      task("B-020", "Access Platforms", "2026-05-18", "2026-06-19", 2500, allocation("general"), 1),
      task("B-044", "Structural Repairs", "2026-06-15", "2026-08-14", 7200, allocation("stud"), 2),
      task("B-080", "Demobilization", "2026-08-17", "2026-08-28", 800, allocation("general"), 3)
    ]
  },
  {
    id: "school",
    name: "Bedford School Addition",
    managerId: "pm3",
    area: "Out of Town",
    cityName: "Bedford",
    startDate: "2026-06-01",
    endDate: "2026-10-16",
    status: "Planning",
    dailyHoursPerWorker: 8,
    avgHourlyRate: 78,
    maxAvailableWorkers: 30,
    scheduleImports: [],
    tasks: [
      task("S-115", "Site Services", "2026-06-01", "2026-06-26", 2100, allocation("general"), 1),
      task("S-210", "Classroom Wing", "2026-06-29", "2026-09-11", 9800, allocation("stud"), 2),
      task("S-320", "Deficiency Work", "2026-09-14", "2026-10-16", 1600, allocation("finish"), 3)
    ]
  },
  {
    id: "l2-zone-schedule",
    name: "L2 Zone Labour Schedule",
    managerId: "pm1",
    area: "Calgary",
    cityName: "Calgary",
    startDate: "2026-05-22",
    endDate: "2027-01-22",
    status: "Active",
    dailyHoursPerWorker: 10,
    avgHourlyRate: 84,
    maxAvailableWorkers: 45,
    scheduleImports: [{ id: "imp-l2-1", fileName: "L2 Zone import.csv", importedAt: "2026-04-30", newTasks: 16, updatedTasks: 0, skipped: 2, status: "Complete" }],
    tasks: [
      task("C25440", "L2-Zone 1 Layout & Top Track", "2026-05-22", "2026-05-28", 74.51, allocation("layout"), 1, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C25450", "L2-Zone 1 Early Rooms & Elevator Shafts", "2026-05-29", "2026-06-11", 224.5, allocation("stud"), 2, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C56620", "L2-Zone 2A Layout & Top Track", "2026-05-29", "2026-06-04", 117.73, allocation("layout"), 3, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C56630", "L2-Zone 2A Early Rooms & Elevator Shafts", "2026-06-05", "2026-06-25", 493.28, allocation("stud"), 4, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C25470", "L2-Zone 1 Steel Stud", "2026-07-13", "2026-07-24", 656.98, allocation("stud"), 5, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C56650", "L2-Zone 2A Steel Stud", "2026-07-27", "2026-08-18", 1444.39, allocation("stud"), 6, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C73030", "L2-Zone 5 Early Rooms & Elevator Shafts", "2026-08-06", "2026-08-19", 834.01, allocation("stud"), 7, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C57450", "L2-Zone 4 Early Rooms & Elevator Shafts", "2026-08-24", "2026-09-04", 826.51, allocation("stud"), 8, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C81740", "L2-Zone 2B Steel Stud", "2026-09-17", "2026-10-07", 1892.78, allocation("stud"), 9, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C57470", "L2-Zone 4 Steel Stud", "2026-10-08", "2026-10-27", 2429.35, allocation("stud"), 10, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C73050", "L2-Zone 5 Steel Stud", "2026-10-09", "2026-10-27", 2402.89, allocation("stud"), 11, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C57060", "L2-Zone 3 Steel Stud", "2026-11-05", "2026-11-27", 2073.1, allocation("stud"), 12, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C25500", "L2-Zone 1 Board & Tape", "2026-11-19", "2026-11-27", 506.61, allocation("joint"), 13, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C59680", "L5-Zone 1 Steel Stud", "2026-12-01", "2026-12-22", 2856.29, allocation("stud"), 14, { source: "import", lastImportedAt: "2026-04-30" }),
      task("P1-UNDER", "P1 Underslab insulation NP", "2026-12-07", "2027-01-15", 2920, allocation("general"), 15, { source: "import", lastImportedAt: "2026-04-30" }),
      task("C56680", "L2-Zone 2A Board & Tape", "2026-12-15", "2027-01-22", 1641.18, allocation("joint"), 16, { source: "import", lastImportedAt: "2026-04-30" })
    ]
  }
];

export const initialState: AppState = {
  role: "pm",
  currentUserManagerId: "pm1",
  activeView: "dashboard",
  activeProjectId: "qeii",
  activeProjectTab: "overview",
  query: "",
  statusFilter: "all",
  areaFilter: "all",
  selectedProjectIds: seedProjects.map((project) => project.id),
  selectedCrewTypeIds: crewTypes.map((type) => type.id),
  dashboardArea: "all",
  dashboardWindow: "full",
  dashboardStartDate: "",
  dashboardEndDate: "",
  chartMode: "combined",
  valueMode: "crew",
  granularity: "week",
  showDataLabels: false,
  companyMaxCapacity: 90,
  scheduleGranularity: "week",
  selectedScheduleTaskId: "",
  crewDisplayMode: "compact",
  crewRequirementMode: "rounded",
  crewScenarioCapacity: null,
  managers,
  crewTypes,
  projects: seedProjects
};
