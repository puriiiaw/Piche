export type Role = "admin" | "pm" | "vp";
export type ProjectStatus = "Active" | "At Risk" | "Planning";
export type LabourHoursSource = "manual" | "derived";
export type TaskSource = "manual" | "excel_import";
export type RequirementMode = "rounded" | "exact";
export type Granularity = "day" | "week" | "month" | "year";
export type ChartMode = "combined" | "stacked" | "split";
export type ValueMode = "crew" | "hours";

export type Manager = {
  id: string;
  name: string;
  email: string;
};

export type AppUser = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  assignedProjectIds: string[];
};

export type CrewType = {
  id: string;
  label: string;
};

export type CrewAllocation = Record<string, number>;

export type Task = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalLabourHours: number;
  labourHoursMissing: boolean;
  labourHoursSource: LabourHoursSource;
  totalValue: number;
  source: TaskSource;
  lastImportedAt?: string;
  scheduleImportBatchId?: string;
  crewRequirementMode: RequirementMode;
  crewAllocation: CrewAllocation;
  notes: string;
  assumptions: string;
  documentLink: string;
  sortOrder: number;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
};

export type ScheduleImport = {
  id: string;
  fileName: string;
  importedAt: string;
  newTasks: number;
  updatedTasks: number;
  skipped: number;
  status: string;  // "Complete" | "Partial" | "Failed" | "Complete|withHrs|missingHrs|withValue"
};

export type Project = {
  id: string;
  name: string;
  managerId: string;
  area: string;
  cityName: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  dailyHoursPerWorker: number;
  avgHourlyRate: number;
  maxAvailableWorkers: number;
  tasks: Task[];
  scheduleImports: ScheduleImport[];
};

export type PeriodPoint = {
  label: string;
  sort: string;
  value: number;
  hours: number;
  crew: number;
  labourHoursTruncated?: boolean;
};

export type AppState = {
  role: Role;
  currentUserId: string;
  currentUserManagerId: string;
  activeView: "dashboard" | "projects" | "access" | "settings";
  activeProjectId: string;
  activeProjectTab: "overview" | "tasks" | "schedule" | "crew" | "imports" | "archive";
  dashboardTaskFilter: "all" | "remaining" | "completed";
  query: string;
  statusFilter: "all" | ProjectStatus;
  areaFilter: string;
  selectedProjectIds: string[];
  selectedCrewTypeIds: string[];
  dashboardArea: string;
  dashboardWindow: "week" | "two" | "six" | "month" | "full" | "custom";
  dashboardStartDate: string;
  dashboardEndDate: string;
  chartMode: ChartMode;
  valueMode: ValueMode;
  granularity: Granularity;
  showDataLabels: boolean;
  companyMaxCapacity: number;
  scheduleGranularity: Granularity;
  selectedScheduleTaskId: string;
  crewDisplayMode: "compact" | "detailed";
  crewRequirementMode: RequirementMode;
  crewScenarioCapacity: number | null;
  currentUserAssignedProjectIds: string[];
  managers: Manager[];
  users: AppUser[];
  crewTypes: CrewType[];
  projects: Project[];
};
