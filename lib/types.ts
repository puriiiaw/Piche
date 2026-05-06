export type Role = "pm" | "vp";
export type ProjectStatus = "Active" | "At Risk" | "Planning";
export type LabourHoursSource = "manual" | "derived";
export type TaskSource = "manual" | "import";
export type RequirementMode = "rounded" | "exact";
export type Granularity = "day" | "week" | "month";
export type ChartMode = "combined" | "stacked" | "split";
export type ValueMode = "crew" | "hours";

export type Manager = {
  id: string;
  name: string;
  email: string;
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
};

export type ScheduleImport = {
  id: string;
  fileName: string;
  importedAt: string;
  newTasks: number;
  updatedTasks: number;
  skipped: number;
  status: "Complete" | "Partial" | "Failed";
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

export type ImportReviewRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  changeType: "changed" | "new" | "unchanged";
  selected: boolean;
  existing?: Task;
};

export type PeriodPoint = {
  label: string;
  sort: string;
  value: number;
  hours: number;
  crew: number;
};

export type AppState = {
  role: Role;
  currentUserManagerId: string;
  activeView: "dashboard" | "projects" | "settings";
  activeProjectId: string;
  activeProjectTab: "overview" | "tasks" | "schedule" | "crew" | "imports";
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
  managers: Manager[];
  crewTypes: CrewType[];
  projects: Project[];
};
