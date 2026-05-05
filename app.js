const STORAGE_KEY = "piche-labour-curve-state-v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const IMPORT_COLUMNS = {
  taskId: ["task id", "activity id", "id", "text1"],
  name: ["task name", "activity name", "name", "description"],
  startDate: ["start", "start date"],
  endDate: ["finish", "end", "finish date", "end date"],
  totalValue: ["total value", "value", "contract value", "budget", "cost", "amount"]
};

const palette = ["#0F766E", "#2563EB", "#D97706", "#7C3AED", "#DC2626", "#0891B2"];
const PROJECT_AREAS = ["Calgary", "Ottawa", "Quebec", "Montreal", "Out of Town"];

const seedState = {
  role: "pm",
  activeView: "dashboard",
  activeProjectId: "qeii",
  selectedProjectIds: ["qeii", "bridge", "terminal", "school", "l2-zone-schedule"],
  dashboardProjectIds: ["qeii", "bridge", "terminal", "school", "l2-zone-schedule"],
  dashboardStartDate: "",
  dashboardEndDate: "",
  projectTaskStartDate: "",
  projectTaskEndDate: "",
  dashboardRangePreset: "next-6",
  granularity: "week",
  projectTab: "overview",
  scheduleGranularity: "week",
  activeScheduleTaskId: "",
  selectedCrewTaskId: "",
  crewAllocationMode: "compact",
  whatIfCapacity: "",
  chartMode: "combined",
  valueMode: "manpower",
  dashboardAreaFilter: "all",
  projectAreaFilter: "all",
  selectedCrewTypeIds: ["all"],
  showDataLabels: false,
  companyMaxCapacity: 90,
  query: "",
  statusFilter: "all",
  collapsed: false,
  user: { name: "Priya Manager", initials: "PM" },
  managers: [
    { id: "pm1", name: "Priya Manager" },
    { id: "pm2", name: "Marc LeBlanc" },
    { id: "pm3", name: "Sofia Chen" }
  ],
  crewTypes: [
    { id: "stud", label: "Stud" },
    { id: "gypsum", label: "Gypsum" },
    { id: "finisher", label: "Finisher" },
    { id: "joint", label: "Joint" },
    { id: "layout", label: "Layout" },
    { id: "labourer", label: "Labourer" },
    { id: "other", label: "Other" }
  ],
  currentUserManagerId: "pm1",
  projects: [
    {
      id: "qeii",
      name: "QEII Halifax Hospital",
      managerId: "pm1",
      area: "Out of Town",
      cityName: "Halifax",
      startDate: "2026-05-04",
      endDate: "2026-09-25",
      dailyHoursPerWorker: 10,
      avgHourlyRate: 85,
      maxAvailableWorkers: 34,
      status: "Active",
      tasks: [
        { id: "Q-101", name: "Level 2 Rough-in", startDate: "2026-05-04", endDate: "2026-06-12", totalLabourHours: 4200 },
        { id: "Q-142", name: "Mechanical Room Fit-up", startDate: "2026-06-03", endDate: "2026-07-24", totalLabourHours: 6200 },
        { id: "Q-210", name: "Final Tie-ins", startDate: "2026-08-03", endDate: "2026-09-25", totalLabourHours: 3600 }
      ]
    },
    {
      id: "bridge",
      name: "Harbour Bridge Rehab",
      managerId: "pm2",
      area: "Out of Town",
      cityName: "Saint John",
      startDate: "2026-05-18",
      endDate: "2026-08-28",
      dailyHoursPerWorker: 9,
      avgHourlyRate: 85,
      maxAvailableWorkers: 28,
      status: "Active",
      tasks: [
        { id: "B-020", name: "Access Platforms", startDate: "2026-05-18", endDate: "2026-06-19", totalLabourHours: 2500 },
        { id: "B-044", name: "Structural Repairs", startDate: "2026-06-15", endDate: "2026-08-14", totalLabourHours: 7200 },
        { id: "B-080", name: "Demobilization", startDate: "2026-08-17", endDate: "2026-08-28", totalLabourHours: 800 }
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
      dailyHoursPerWorker: 10,
      avgHourlyRate: 85,
      maxAvailableWorkers: 24,
      status: "At Risk",
      tasks: [
        { id: "F-009", name: "Service Relocation", startDate: "2026-04-27", endDate: "2026-05-22", totalLabourHours: 1800 },
        { id: "F-030", name: "Envelope Install", startDate: "2026-05-25", endDate: "2026-07-10", totalLabourHours: 4600 },
        { id: "F-070", name: "Commissioning Support", startDate: "2026-07-13", endDate: "2026-07-31", totalLabourHours: 1200 }
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
      dailyHoursPerWorker: 8,
      avgHourlyRate: 85,
      maxAvailableWorkers: 30,
      status: "Planning",
      tasks: [
        { id: "S-115", name: "Site Services", startDate: "2026-06-01", endDate: "2026-06-26", totalLabourHours: 2100 },
        { id: "S-210", name: "Classroom Wing", startDate: "2026-06-29", endDate: "2026-09-11", totalLabourHours: 9800 },
        { id: "S-320", name: "Deficiency Work", startDate: "2026-09-14", endDate: "2026-10-16", totalLabourHours: 1600 }
      ]
    },
    {
      id: "l2-zone-schedule",
      name: "L2 Zone Labour Schedule",
      managerId: "pm1",
      area: "Out of Town",
      cityName: "Halifax",
      startDate: "2026-05-22",
      endDate: "2027-01-22",
      dailyHoursPerWorker: 10,
      avgHourlyRate: 85,
      maxAvailableWorkers: 45,
      status: "Active",
      tasks: [
        { id: "C25440", name: "L2-Zone 1 Layout & Top Track", startDate: "2026-05-22", endDate: "2026-05-28", totalLabourHours: 74.51 },
        { id: "C25450", name: "L2-Zone 1 Early Rooms & Elevator Shafts", startDate: "2026-05-29", endDate: "2026-06-11", totalLabourHours: 224.5 },
        { id: "C56620", name: "L2-Zone 2A Layout & Top Track", startDate: "2026-05-29", endDate: "2026-06-04", totalLabourHours: 117.73 },
        { id: "C44490", name: "P1 Layout & Top Track", startDate: "2026-06-05", endDate: "2026-06-11", totalLabourHours: 52.97 },
        { id: "C56630", name: "L2-Zone 2A Early Rooms & Elevator Shafts", startDate: "2026-06-05", endDate: "2026-06-25", totalLabourHours: 493.28 },
        { id: "C44500", name: "P1 Early Rooms & Elevator Shafts", startDate: "2026-06-12", endDate: "2026-07-06", totalLabourHours: 188.07 },
        { id: "C25470", name: "L2-Zone 1 Steel Stud", startDate: "2026-07-13", endDate: "2026-07-24", totalLabourHours: 656.98 },
        { id: "C81670", name: "L2-Zone 2B Layout & Top Track", startDate: "2026-07-21", endDate: "2026-07-27", totalLabourHours: 154.28 },
        { id: "C56650", name: "L2-Zone 2A Steel Stud", startDate: "2026-07-27", endDate: "2026-08-18", totalLabourHours: 1444.39 },
        { id: "C81690", name: "L2-Zone 2B Early Rooms & Elevator Shafts", startDate: "2026-07-28", endDate: "2026-08-19", totalLabourHours: 646.41 },
        { id: "C73020", name: "L2-Zone 5 Layout & Top Track", startDate: "2026-07-29", endDate: "2026-08-06", totalLabourHours: 161.81 },
        { id: "C73030", name: "L2-Zone 5 Early Rooms & Elevator Shafts", startDate: "2026-08-06", endDate: "2026-08-19", totalLabourHours: 834.01 },
        { id: "C57440", name: "L2-Zone 4 Layout & Top Track", startDate: "2026-08-17", endDate: "2026-08-21", totalLabourHours: 148.27 },
        { id: "C57030", name: "L2-Zone 3 Layout & Top Track", startDate: "2026-08-24", endDate: "2026-08-28", totalLabourHours: 132.24 },
        { id: "C57450", name: "L2-Zone 4 Early Rooms & Elevator Shafts", startDate: "2026-08-24", endDate: "2026-09-04", totalLabourHours: 826.51 },
        { id: "C57040", name: "L2-Zone 3 Early Rooms & Elevator Shafts", startDate: "2026-08-31", endDate: "2026-09-15", totalLabourHours: 730.23 },
        { id: "C59650", name: "L5-Zone 1 Layout & Top Track", startDate: "2026-09-11", endDate: "2026-09-17", totalLabourHours: 188.27 },
        { id: "C44520", name: "P1 Steel Stud", startDate: "2026-09-14", endDate: "2026-10-05", totalLabourHours: 577.23 },
        { id: "C81740", name: "L2-Zone 2B Steel Stud", startDate: "2026-09-17", endDate: "2026-10-07", totalLabourHours: 1892.78 },
        { id: "C59660", name: "L5-Zone 1 Early Rooms & Elevator Shafts", startDate: "2026-09-18", endDate: "2026-10-01", totalLabourHours: 975.59 },
        { id: "C61370", name: "L5-Zone 5 Layout & Top Track", startDate: "2026-09-18", endDate: "2026-09-24", totalLabourHours: 134.81 },
        { id: "C61370B", name: "L5-Zone 5 Layout & Top Track", startDate: "2026-09-18", endDate: "2026-09-24", totalLabourHours: 35.33 },
        { id: "C61380", name: "L5-Zone 5 Early Rooms & Elevator Shafts", startDate: "2026-09-25", endDate: "2026-10-08", totalLabourHours: 669 },
        { id: "C61380B", name: "L5-Zone 5 Early Rooms & Elevator Shafts", startDate: "2026-09-25", endDate: "2026-10-08", totalLabourHours: 165.41 },
        { id: "C82230", name: "L2-Zone 1 Steel Stud Second Pass", startDate: "2026-10-05", endDate: "2026-10-09", totalLabourHours: 37.26 },
        { id: "C57470", name: "L2-Zone 4 Steel Stud", startDate: "2026-10-08", endDate: "2026-10-27", totalLabourHours: 2429.35 },
        { id: "C73050", name: "L2-Zone 5 Steel Stud", startDate: "2026-10-09", endDate: "2026-10-27", totalLabourHours: 2402.89 },
        { id: "C45980", name: "L9-NP Layout & Top Track", startDate: "2026-10-22", endDate: "2026-10-22", totalLabourHours: 3.9 },
        { id: "C29350", name: "L2-Zone 1 Drywall Ceiling Framing", startDate: "2026-10-23", endDate: "2026-10-24", totalLabourHours: 25 },
        { id: "C46010", name: "L9-NP Steel Stud", startDate: "2026-10-30", endDate: "2026-11-03", totalLabourHours: 66.98 },
        { id: "C82320", name: "L2-Zone 2A Steel Stud Second Pass", startDate: "2026-11-04", endDate: "2026-11-06", totalLabourHours: 58.87 },
        { id: "C57060", name: "L2-Zone 3 Steel Stud", startDate: "2026-11-05", endDate: "2026-11-27", totalLabourHours: 2073.1 },
        { id: "C57930", name: "LE-Zone 1 Layout & Top Track", startDate: "2026-11-17", endDate: "2026-11-23", totalLabourHours: 287.76 },
        { id: "C25500", name: "L2-Zone 1 Board & Tape", startDate: "2026-11-19", endDate: "2026-11-27", totalLabourHours: 506.61 },
        { id: "C63540", name: "L8-Zone 1 Layout & Top Track", startDate: "2026-11-19", endDate: "2026-11-25", totalLabourHours: 7.86 },
        { id: "C57940", name: "LE-Zone 1 Early Rooms & Elevator Shafts", startDate: "2026-11-24", endDate: "2026-12-14", totalLabourHours: 1503.14 },
        { id: "C73930", name: "LE-Zone 6 Layout & Top Track", startDate: "2026-11-24", endDate: "2026-11-30", totalLabourHours: 383.69 },
        { id: "C63550", name: "L8-Zone 1 Early Rooms & Elevator Shafts", startDate: "2026-11-26", endDate: "2026-12-09", totalLabourHours: 88.31 },
        { id: "C73940", name: "LE-Zone 6 Early Rooms & Elevator Shafts", startDate: "2026-12-01", endDate: "2026-12-21", totalLabourHours: 1974.93 },
        { id: "C74410", name: "L4-Zone 1 Layout & Top Track", startDate: "2026-12-01", endDate: "2026-12-07", totalLabourHours: 91.53 },
        { id: "C59680", name: "L5-Zone 1 Steel Stud", startDate: "2026-12-01", endDate: "2026-12-22", totalLabourHours: 2856.29 },
        { id: "C29370", name: "L2-Zone 1 Board & Tape Drywall Ceiling", startDate: "2026-12-02", endDate: "2026-12-08", totalLabourHours: 22.29 },
        { id: "P1-UNDER", name: "P1 Underslab insulation NP", startDate: "2026-12-07", endDate: "2027-01-15", totalLabourHours: 2920 },
        { id: "C74420", name: "L4-Zone 1 Early Rooms & Elevator Shafts", startDate: "2026-12-08", endDate: "2026-12-21", totalLabourHours: 386.61 },
        { id: "C56680", name: "L2-Zone 2A Board & Tape", startDate: "2026-12-15", endDate: "2027-01-22", totalLabourHours: 1641.18 }
      ]
    }
  ]
};

let state = loadState();
let chartInstances = [];
let scheduleImportDraft = null;
let lastUndo = null;

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored ? hydrateState(stored) : structuredClone(seedState);
  } catch {
    return structuredClone(seedState);
  }
}

function hydrateState(stored) {
  const next = { ...structuredClone(seedState), ...stored };
  const storedProjects = Array.isArray(stored.projects) ? stored.projects : [];
  const byId = new Map(storedProjects.map((project) => [project.id, project]));
  const addedProjectIds = [];
  seedState.projects.forEach((project) => {
    if (!byId.has(project.id)) {
      byId.set(project.id, structuredClone(project));
      addedProjectIds.push(project.id);
    }
  });
  next.projects = Array.from(byId.values());
  next.projects.forEach((project) => {
    if (!project.maxAvailableWorkers) {
      const seedProject = seedState.projects.find((item) => item.id === project.id);
      project.maxAvailableWorkers = seedProject?.maxAvailableWorkers || Math.max(10, Math.ceil(project.tasks?.length || 1) * 4);
    }
    if (!project.avgHourlyRate) {
      const seedProject = seedState.projects.find((item) => item.id === project.id);
      project.avgHourlyRate = seedProject?.avgHourlyRate || 85;
    }
    if (!project.area) {
      const seedProject = seedState.projects.find((item) => item.id === project.id);
      project.area = seedProject?.area || "Out of Town";
    }
    if (!project.cityName) {
      const seedProject = seedState.projects.find((item) => item.id === project.id);
      project.cityName = seedProject?.cityName || project.area || "";
    }
    project.tasks = (project.tasks || []).map((task) => normalizeTask(task, next.crewTypes || seedState.crewTypes));
    ensureTaskOrder(project);
  });
  const allProjectIds = next.projects.map((project) => project.id);
  next.selectedProjectIds = mergeProjectSelection(next.selectedProjectIds, allProjectIds, addedProjectIds);
  next.dashboardProjectIds = mergeProjectSelection(next.dashboardProjectIds, visibleIdsForState(next), addedProjectIds);
  next.selectedCrewTypeIds = normalizeCrewSelection(next.selectedCrewTypeIds, next.crewTypes || seedState.crewTypes);
  next.chartMode = "combined";
  if (!["overview", "tasks", "schedule", "crew", "imports"].includes(next.projectTab)) next.projectTab = "overview";
  return next;
}

function mergeProjectSelection(selected, availableIds, addedProjectIds = []) {
  if (!Array.isArray(selected)) return availableIds;
  const clean = selected.filter((id) => availableIds.includes(id));
  addedProjectIds.forEach((id) => {
    if (availableIds.includes(id) && !clean.includes(id)) clean.push(id);
  });
  return clean;
}

function visibleIdsForState(next) {
  return next.role === "vp"
    ? next.projects.map((project) => project.id)
    : next.projects.filter((project) => project.managerId === next.currentUserManagerId).map((project) => project.id);
}

function normalizeTask(task, crewTypes = seedState.crewTypes) {
  const allocation = {};
  crewTypes.forEach((type) => {
    allocation[type.id] = Number(task.crewAllocation?.[type.id] || 0);
  });
  return {
    ...task,
    source: task.source || "manual",
    lastImportedAt: task.lastImportedAt || "",
    scheduleImportBatchId: task.scheduleImportBatchId || "",
    labourHoursMissing: Boolean(task.labourHoursMissing),
    totalValue: Number(task.totalValue || 0),
    labourHoursSource: task.labourHoursSource || "manual",
    notes: task.notes || "",
    assumptions: task.assumptions || "",
    documentLink: task.documentLink || "",
    crewRequirementMode: task.crewRequirementMode || "rounded",
    sortOrder: Number(task.sortOrder || 0),
    crewAllocation: allocation
  };
}

function ensureTaskOrder(project) {
  project.tasks = sortTasksByStartDate(project.tasks || []);
  project.tasks.forEach((task, index) => {
    task.sortOrder = Number(task.sortOrder || index + 1);
  });
  project.tasks.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

function normalizeCrewSelection(selected, crewTypes = seedState.crewTypes) {
  const ids = crewTypes.map((type) => type.id);
  if (!Array.isArray(selected) || !selected.length || selected.includes("all")) return ["all"];
  const clean = selected.filter((id) => ids.includes(id));
  return clean.length ? clean : ["all"];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  chartInstances = [];
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="shell ${state.collapsed ? "is-collapsed" : ""}">
      ${sidebarTemplate()}
      <main class="main">
        ${headerTemplate()}
        <section class="content">${viewTemplate()}</section>
      </main>
    </div>
    ${modalTemplate()}
    ${undoTemplate()}
  `;
  bindEvents();
  drawCharts();
  saveState();
}

function undoTemplate() {
  if (!lastUndo) return "";
  return `<div class="undo-toast"><span>${lastUndo.message}</span><button class="button secondary" data-action="undo-last">Undo</button></div>`;
}

function visibleProjects() {
  if (state.role === "vp") return state.projects;
  return state.projects.filter((project) => project.managerId === state.currentUserManagerId);
}

function managerName(id) {
  return state.managers.find((manager) => manager.id === id)?.name || "Unassigned";
}

function sidebarTemplate() {
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "projects", label: "Projects", icon: "folder" },
    ...(state.role === "vp" ? [{ id: "company", label: "Company View", icon: "chart" }] : []),
    { id: "settings", label: "Settings", icon: "panel" }
  ];
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">P</div>
        <div class="brand-text"><strong>Piche</strong><span>Labour Curve</span></div>
      </div>
      <nav class="nav">
        ${nav.map((item) => `
          <button class="nav-item ${state.activeView === item.id || (state.activeView === "project" && item.id === "projects") ? "active" : ""}" data-view="${item.id}" title="${item.label}">
            ${icon(item.icon)}<span>${item.label}</span>
          </button>
        `).join("")}
      </nav>
      <button class="collapse-btn" data-action="collapse" title="Collapse sidebar">${icon("panel")}<span>Collapse</span></button>
    </aside>
  `;
}

function headerTemplate() {
  const project = activeProject();
  const title = state.activeView === "company" ? "Company View" : state.activeView === "projects" ? "Projects" : state.activeView === "project" && project ? project.name : state.activeView === "settings" ? "Settings" : "Dashboard";
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">${state.role === "vp" ? "Executive view" : state.role === "field" ? "Field mode" : "Project view"}</p>
        <h1>${title}</h1>
      </div>
      <div class="header-actions">
        <div class="segmented" aria-label="Role switcher">
          <button class="${state.role === "pm" ? "selected" : ""}" data-role="pm">Project View</button>
          <button class="${state.role === "vp" ? "selected" : ""}" data-role="vp">Executive View</button>
          <button class="${state.role === "field" ? "selected" : ""}" data-role="field">Field Mode</button>
        </div>
        <button class="button secondary" data-action="reset">${icon("refresh")}Reset demo</button>
        ${state.activeView === "projects" ? `<button class="button primary" data-action="new-project">${icon("plus")}Create Project</button>` : ""}
        <div class="avatar" title="${state.user.name}">${state.role === "vp" ? "EV" : state.role === "field" ? "FM" : "PV"}</div>
      </div>
    </header>
  `;
}

function viewTemplate() {
  if (state.activeView === "company") return companyTemplate();
  if (state.activeView === "projects") return projectsTemplate();
  if (state.activeView === "project") return projectDetailTemplate(activeProject());
  if (state.activeView === "settings") return settingsTemplate();
  return dashboardTemplate();
}

function dashboardTemplate() {
  const projects = visibleProjects().filter((project) => state.dashboardAreaFilter === "all" || project.area === state.dashboardAreaFilter);
  const chartProjects = selectedDashboardProjects();
  const range = dashboardDateRange();
  const analysis = workforceAnalysis(chartProjects, state.granularity, range);
  return `
    ${dashboardKpiRow(chartProjects, analysis)}
    <div class="dashboard-grid">
      <section class="chart-card main-chart">
        <div class="curve-card-head">
          <div class="curve-head-top">
            <div><h2>Crew demand</h2><p>Filter by project, crew type, area, and time window.</p></div>
            ${chartToolbar()}
          </div>
          ${dashboardFilterBar(projects)}
        </div>
        <canvas id="dashboard-chart" height="320"></canvas>
        ${legendTemplate(chartProjects.length ? chartProjects : projects)}
      </section>
      <aside class="side-panel">
        <div class="panel-head">
          <div><h2>Action Required</h2><p>What needs attention next.</p></div>
        </div>
        ${actionPanelTemplate(chartProjects, analysis)}
        <div class="panel-note">
          <strong>Simple workflow</strong>
          <span>Set daily hours once on a project. Every task then calculates crew demand automatically.</span>
        </div>
      </aside>
    </div>
    <section class="table-card">
      <div class="card-head"><div><h2>Peak Analysis</h2><p>Top peak dates and contributing projects</p></div></div>
      ${peakAnalysisTable(analysis.peaks)}
    </section>
    <section class="table-card">
      <div class="card-head"><div><h2>Project Contribution</h2><p>Total hours, capacity, and demand by project</p></div></div>
      ${projectContributionTable(chartProjects, range)}
    </section>
  `;
}

function companyTemplate() {
  const selected = state.projects.filter((project) => state.selectedProjectIds.includes(project.id));
  const metrics = workforceAnalysis(selected, state.granularity);
  return `
    ${kpiRow(selected, metrics)}
    <section class="chart-card company-card">
      <div class="curve-card-head">
        <div class="curve-head-top">
          <div><h2>Company crew demand</h2><p>Filter by project, crew type, and time window.</p></div>
          ${chartToolbar()}
        </div>
        ${companyFilterBar()}
      </div>
      <canvas id="company-chart" height="420"></canvas>
    </section>
    <section class="split">
      <div class="table-card">
        <div class="card-head"><div><h2>Peak Watch</h2><p>Highest crew demand across selected projects</p></div></div>
        ${peaksTable(selected)}
      </div>
      <div class="table-card">
        <div class="card-head"><div><h2>Project Mix</h2><p>Colour-coded company demand</p></div></div>
        ${legendTemplate(selected)}
      </div>
    </section>
  `;
}

function settingsTemplate() {
  return `
    <section class="table-card">
      <div class="card-head"><div><h2>Settings</h2><p>Defaults used across labour planning.</p></div></div>
      <div class="settings-grid">
        <article class="insight-card"><strong>Project areas</strong><p>${PROJECT_AREAS.join(", ")}</p></article>
        <article class="insight-card"><strong>Crew types</strong><p>${state.crewTypes.map((type) => type.label).join(", ")}</p></article>
        <article class="insight-card"><strong>Import rules</strong><p>Task ID is the matching key. Labour hours are never overwritten by schedule imports.</p></article>
      </div>
    </section>
  `;
}

function projectsTemplate() {
  const projects = visibleProjects().filter((project) => {
    const matchesSearch = `${project.name} ${managerName(project.managerId)} ${project.area || ""} ${project.cityName || ""}`.toLowerCase().includes(state.query.toLowerCase());
    const matchesStatus = state.statusFilter === "all" || project.status === state.statusFilter;
    const matchesArea = state.projectAreaFilter === "all" || project.area === state.projectAreaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });
  return `
    <section class="table-card">
      <div class="card-head">
        <div><h2>Projects</h2><p>${state.role === "vp" ? "All company projects" : "Only projects assigned to you"}</p></div>
        <div class="filters">
          <input class="search" data-field="query" value="${escapeHtml(state.query)}" placeholder="Search projects" />
          <select data-field="statusFilter">
            ${["all", "Active", "At Risk", "Planning"].map((status) => `<option value="${status}" ${state.statusFilter === status ? "selected" : ""}>${status === "all" ? "All status" : projectStatusLabel(status)}</option>`).join("")}
          </select>
          <select data-field="projectAreaFilter">
            ${areaOptions(state.projectAreaFilter, "All areas")}
          </select>
          <button class="button primary" data-action="new-project">${icon("plus")}Create Project</button>
        </div>
      </div>
      ${projectTable(projects, true)}
    </section>
  `;
}

function projectDetailTemplate(project) {
  if (!project) return `<section class="empty">No project selected.</section>`;
  const metrics = summarizeProjects([project], state.granularity, state.valueMode);
  const canEdit = state.role === "pm" && project.managerId === state.currentUserManagerId;
  const visibleTasks = filteredProjectTasks(project);
  const activeTask = visibleTasks.find((task) => task.id === state.activeScheduleTaskId) || visibleTasks[0] || null;
  return `
    <section class="detail">
      <div class="detail-head">
        <div>
          <p class="eyebrow">Project detail</p>
          <h2>${project.name}</h2>
          <p>${formatDate(project.startDate)} to ${formatDate(project.endDate)} - ${managerName(project.managerId)} - ${project.area}${project.cityName ? ` (${project.cityName})` : ""}</p>
        </div>
        <div class="hours-setting">
          <label>Daily Hours Per Worker</label>
          <input type="number" min="1" step="0.5" value="${project.dailyHoursPerWorker}" data-project-hours="${project.id}" ${canEdit ? "" : "disabled"} />
          <span>Applied to every task in this project.</span>
        </div>
        <div class="hours-setting">
          <label>Avg Hour Rate</label>
          <div class="money-input"><span>CAD</span><input type="number" min="1" step="0.01" value="${project.avgHourlyRate || 85}" data-project-rate="${project.id}" ${canEdit ? "" : "disabled"} /></div>
          <span>Total value divided by rate can calculate labour hours.</span>
        </div>
        <div class="hours-setting">
          <label>Max Available Workers</label>
          <input type="number" min="1" step="1" value="${project.maxAvailableWorkers || 1}" data-project-capacity="${project.id}" ${canEdit ? "" : "disabled"} />
          <span>Used for capacity risk detection.</span>
        </div>
      </div>
      ${projectTabs()}
      ${state.projectTab === "overview" ? projectOverviewTemplate(project, metrics, visibleTasks) : ""}
      ${state.projectTab === "tasks" ? `
        <div class="detail-grid single">
          <div class="table-card">
            <div class="card-head">
              <div><h2>Tasks</h2><p>Plan work, dates, labour hours, and crew demand.</p></div>
              ${canEdit ? `<button class="button primary" data-action="new-task" data-project="${project.id}">${icon("plus")}Add Task</button>` : ""}
            </div>
            ${projectTaskFilterBar()}
            ${taskTable(project, canEdit, visibleTasks)}
          </div>
        </div>
      ` : ""}
      ${state.projectTab === "schedule" ? scheduleTemplate(project, activeTask, visibleTasks) : ""}
      ${state.projectTab === "crew" ? crewAllocationTemplate(project, canEdit, visibleTasks) : ""}
      ${state.projectTab === "imports" ? importsTemplate(project, canEdit) : ""}
    </section>
  `;
}

function projectTabs() {
  return `
    <div class="detail-tabs">
      ${[
        ["overview", "Overview"],
        ["tasks", "Tasks"],
        ["schedule", "Schedule"],
        ["crew", "Crew Allocation"],
        ["imports", "Imports"]
      ].map(([id, label]) => `<button class="detail-tab ${state.projectTab === id ? "active" : ""}" data-project-tab="${id}">${label}</button>`).join("")}
    </div>
  `;
}

function projectOverviewTemplate(project, metrics, visibleTasks) {
  const missing = project.tasks.filter((task) => task.labourHoursMissing).length;
  return `
    <div class="detail-grid">
      <section class="chart-card">
        <div class="curve-card-head">
          <div class="curve-head-top">
            <div><h2>Labour curve</h2><p>Total crew demand for this project.</p></div>
            ${chartToolbar()}
          </div>
          ${projectCurveFilterBar(project, true)}
        </div>
        <canvas id="project-chart" height="340"></canvas>
        ${legendTemplate([project])}
      </section>
      <aside class="side-panel">
        <div class="panel-head"><div><h2>Action Required</h2><p>Project items that need attention.</p></div></div>
        <div class="insight-list">
          ${missing ? `<article class="insight-card danger"><strong>${missing} tasks missing labour hours</strong><p>Add hours or total value before using the crew plan.</p></article>` : `<article class="insight-card good"><strong>Labour hours complete</strong><p>No missing task hours found.</p></article>`}
          ${metrics.peak ? `<article class="insight-card warning"><strong>Peak crew needed: ${formatNumber(metrics.peak, 2)}</strong><p>Review Schedule and Crew Allocation before committing labour.</p></article>` : ""}
          <article class="insight-card"><strong>${visibleTasks.length} tasks visible</strong><p>Use the Tasks tab for editing and the Imports tab for GC schedule updates.</p></article>
        </div>
      </aside>
    </div>
  `;
}

function importsTemplate(project, canEdit) {
  const imports = project.scheduleImports || [];
  return `
    <section class="table-card">
      <div class="card-head">
        <div><h2>Imports</h2><p>Upload and review GC schedule updates before applying them.</p></div>
        ${canEdit ? `<button class="button primary" data-action="import-schedule" data-project="${project.id}">${icon("upload")}Import Schedule</button>` : ""}
      </div>
      <div class="table-wrap compact-table">
        <table>
          <thead><tr><th>File</th><th>Uploaded</th><th>New tasks</th><th>Updated</th><th>Skipped</th><th>Status</th></tr></thead>
          <tbody>
            ${imports.length ? imports.slice().reverse().map((item) => `<tr><td><strong>${escapeHtml(item.fileName)}</strong></td><td>${formatDate(item.uploadedAt.slice(0, 10))}</td><td>${item.importedCount}</td><td>${item.updatedCount}</td><td>${item.skippedCount}</td><td><span class="status active">${item.status}</span></td></tr>`).join("") : `<tr><td colspan="6">No schedule imports yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function activeProject() {
  return state.projects.find((project) => project.id === state.activeProjectId);
}

function activeVisibleProject(projects = visibleProjects()) {
  return projects.find((project) => project.id === state.activeProjectId) || projects[0];
}

function projectTaskFilterBar() {
  return `
    <div class="task-filter-bar">
      <label class="mini-field"><span>From</span><input type="date" data-field="projectTaskStartDate" value="${state.projectTaskStartDate || ""}" /></label>
      <label class="mini-field"><span>To</span><input type="date" data-field="projectTaskEndDate" value="${state.projectTaskEndDate || ""}" /></label>
      <button class="mini-button" data-action="clear-project-task-dates">Clear Dates</button>
    </div>
  `;
}

function projectTaskDateRange() {
  if (state.projectTaskStartDate && state.projectTaskEndDate && state.projectTaskStartDate > state.projectTaskEndDate) {
    return { startDate: state.projectTaskEndDate, endDate: state.projectTaskStartDate };
  }
  return {
    startDate: state.projectTaskStartDate || null,
    endDate: state.projectTaskEndDate || null
  };
}

function filteredProjectTasks(project) {
  const range = projectTaskDateRange();
  return orderedProjectTasks(project).filter((task) => taskOverlapsRange(task, range));
}

function orderedProjectTasks(project) {
  return [...(project.tasks || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
}

function selectedDashboardIds() {
  const visibleIds = visibleProjects().map((project) => project.id);
  if (!Array.isArray(state.dashboardProjectIds)) return visibleIds;
  return state.dashboardProjectIds.filter((id) => visibleIds.includes(id));
}

function selectedDashboardProjects() {
  const selected = selectedDashboardIds();
  return visibleProjects().filter((project) => selected.includes(project.id) && (state.dashboardAreaFilter === "all" || project.area === state.dashboardAreaFilter));
}

function selectedCrewTypeIds() {
  return normalizeCrewSelection(state.selectedCrewTypeIds, state.crewTypes);
}

function isAllCrewTypesSelected() {
  return selectedCrewTypeIds().includes("all");
}

function crewTypeLabel(id) {
  return state.crewTypes.find((type) => type.id === id)?.label || id;
}

function projectColor(projectId) {
  const projects = visibleProjects();
  const index = Math.max(0, projects.findIndex((project) => project.id === projectId));
  return palette[index % palette.length];
}

function dashboardDateRange() {
  const todayDate = new Date();
  if (state.dashboardRangePreset && state.dashboardRangePreset !== "custom") {
    const start = new Date(todayDate);
    const end = new Date(todayDate);
    if (state.dashboardRangePreset === "this-week") end.setDate(start.getDate() + 6);
    if (state.dashboardRangePreset === "next-2") end.setDate(start.getDate() + 13);
    if (state.dashboardRangePreset === "next-6") end.setDate(start.getDate() + 41);
    if (state.dashboardRangePreset === "this-month") {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 0);
    }
    if (state.dashboardRangePreset === "full") return {};
    return { startDate: iso(start), endDate: iso(end) };
  }
  if (state.dashboardStartDate && state.dashboardEndDate && state.dashboardStartDate > state.dashboardEndDate) {
    return {
      startDate: state.dashboardEndDate,
      endDate: state.dashboardStartDate
    };
  }
  return {
    startDate: state.dashboardStartDate || null,
    endDate: state.dashboardEndDate || null
  };
}

function dashboardKpiRow(projects, metrics) {
  return `
    <div class="kpi-row compact-four">
      ${kpiCard("Active Projects", projects.filter((project) => project.status !== "Planning").length, "Carrying labour now")}
      ${kpiCard("Crew Needed This Week", `${formatNumber(currentWeekManpower(projects), 2)} / ${Math.ceil(currentWeekManpower(projects) || 0)}`, "Exact Crew / Rounded Crew")}
      ${kpiCard("Peak Crew Needed", `${formatNumber(metrics.peakExact, 2)} / ${Math.ceil(metrics.peakExact || 0)}`, metrics.peakLabel || "No scheduled labour", metrics.overCapacityPeriods ? "danger" : "good")}
      ${kpiCard("Total Labour Hours", formatNumber(projects.reduce((sum, project) => sum + projectTotalHours(project), 0)), "Across selected work")}
    </div>
  `;
}

function kpiRow(projects, metrics) {
  return `
    <div class="kpi-row">
      ${kpiCard("Active Projects", projects.filter((project) => project.status !== "Planning").length, "Currently carrying labour")}
      ${kpiCard("Total Labour Hours", formatNumber(projects.reduce((sum, project) => sum + projectTotalHours(project), 0)), "Across visible projects")}
      ${kpiCard("Peak Crew Needed", `${formatNumber(metrics.peakExact, 2)} / ${Math.ceil(metrics.peakExact || 0)}`, "Exact Crew / Rounded Crew")}
      ${kpiCard("Crew Needed This Week", `${formatNumber(currentWeekManpower(projects), 2)} / ${Math.ceil(currentWeekManpower(projects) || 0)}`, "Exact Crew / Rounded Crew")}
      ${kpiCard("Over-Capacity Periods", metrics.overCapacityPeriods, "Periods above available workforce", metrics.overCapacityPeriods ? "danger" : "good")}
      ${kpiCard("Maximum Required Crew", Math.ceil(metrics.peakExact || 0), "Rounded crew required")}
      ${kpiCard("Status", statusLabel(metrics.riskLevel), `Capacity ${formatNumber(metrics.capacity, 0)} workers`, metrics.riskLevel.toLowerCase())}
    </div>
  `;
}

function kpiCard(title, value, description, tone = "") {
  return `<article class="kpi-card ${tone}"><span>${title}</span><strong>${value}</strong><p>${description}</p></article>`;
}

function actionPanelTemplate(projects, analysis) {
  const missingHours = projects.reduce((sum, project) => sum + project.tasks.filter((task) => task.labourHoursMissing).length, 0);
  const items = [];
  if (analysis.overCapacityPeriods) items.push({ tone: "danger", title: "Peak exceeds capacity", text: `${analysis.overCapacityPeriods} period${analysis.overCapacityPeriods === 1 ? "" : "s"} need more crew than available. Try shifting one high-crew task or increasing capacity for the peak week.` });
  if (missingHours) items.push({ tone: "warning", title: `${missingHours} tasks missing labour hours`, text: "Add labour hours or total value so crew demand is accurate." });
  if (!items.length) items.push({ tone: "good", title: "On track", text: "No urgent labour planning actions in this view." });
  return `<div class="insight-list">${items.map((item) => `<article class="insight-card ${item.tone}"><strong>${item.title}</strong><p>${item.text}</p></article>`).join("")}</div>`;
}

function statusLabel(value) {
  if (value === "Green") return "On Track";
  if (value === "Yellow") return "Needs Attention";
  if (value === "Red") return "Over Capacity";
  return value;
}

function projectStatusLabel(status) {
  return status === "At Risk" ? "Needs Attention" : status;
}

function chartToolbar() {
  return `
    <div class="chart-view-controls">
      <div class="segmented">
        ${["manpower", "hours"].map((mode) => `<button class="${state.valueMode === mode ? "selected" : ""}" data-value-mode="${mode}">${mode === "manpower" ? "Crew Needed" : "Labour Hours"}</button>`).join("")}
      </div>
      ${granularityControl()}
    </div>
  `;
}

function dashboardFilterBar(projects) {
  return filterBarTemplate({
    scope: "dashboard",
    projects,
    selectedProjectIds: selectedDashboardIds(),
    includeProjects: true,
    capacityMode: state.role === "vp" ? "company" : "none"
  });
}

function companyFilterBar() {
  return filterBarTemplate({
    scope: "company",
    projects: state.projects,
    selectedProjectIds: state.selectedProjectIds,
    includeProjects: true,
    capacityMode: "company"
  });
}

function projectCurveFilterBar(project, canEdit) {
  return filterBarTemplate({
    scope: "project",
    projects: [],
    selectedProjectIds: [],
    includeProjects: false,
    capacityMode: "project",
    project,
    canEdit
  });
}

function filterBarTemplate({ scope, projects, selectedProjectIds, includeProjects, capacityMode, project = null, canEdit = false }) {
  return `
    <div class="curve-filter-bar ${includeProjects ? "" : "no-projects"} ${capacityMode !== "none" ? "with-capacity" : ""}">
      <label class="filter-group">
        <span>Crew Type</span>
        ${crewDropdown(scope)}
      </label>
      ${includeProjects ? `<label class="filter-group">
        <span>Projects</span>
        ${projectDropdown(scope, projects, selectedProjectIds)}
      </label>` : ""}
      ${scope === "dashboard" ? `<label class="filter-group compact-group">
        <span>Area</span>
        <select data-field="dashboardAreaFilter">${areaOptions(state.dashboardAreaFilter, "All areas")}</select>
      </label>` : ""}
      <label class="filter-group">
        <span>Time window</span>
        <div class="date-range-group preset-range">
          <select data-field="dashboardRangePreset">
            ${[["this-week", "This Week"], ["next-2", "Next 2 Weeks"], ["next-6", "Next 6 Weeks"], ["this-month", "This Month"], ["full", "Full Project"]].map(([id, label]) => `<option value="${id}" ${state.dashboardRangePreset === id ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <button class="mini-button clear-filter-button" data-action="${scope}-clear-filters">Apply</button>
        </div>
      </label>
      <label class="filter-group compact-group">
        <span>Data Labels</span>
        <button class="mini-button labels-toggle ${state.showDataLabels ? "is-active" : ""}" data-toggle-labels="true">${state.showDataLabels ? "On" : "Off"}</button>
      </label>
      ${capacityControlTemplate(capacityMode, project, canEdit)}
      ${filterChipsTemplate(scope)}
    </div>
  `;
}

function capacityControlTemplate(mode, project, canEdit) {
  if (mode === "company") {
    return `<label class="filter-group compact-group">
      <span>Maximum Workforce</span>
      <input type="number" min="1" data-field="companyMaxCapacity" value="${state.companyMaxCapacity || ""}" />
    </label>`;
  }
  if (mode === "project" && project) {
    return `<label class="filter-group compact-group">
      <span>Maximum Workforce</span>
      <input type="number" min="1" data-project-capacity="${project.id}" value="${project.maxAvailableWorkers || ""}" ${canEdit ? "" : "disabled"} />
    </label>`;
  }
  return "";
}

function filterChipsTemplate(scope) {
  const labels = {
    "this-week": "This Week",
    "next-2": "Next 2 Weeks",
    "next-6": "Next 6 Weeks",
    "this-month": "This Month",
    full: "Full Project"
  };
  const chips = [`<span class="filter-chip">${labels[state.dashboardRangePreset] || "Next 6 Weeks"}</span>`];
  if (scope === "dashboard" && state.dashboardAreaFilter !== "all") chips.push(`<span class="filter-chip">${state.dashboardAreaFilter}</span>`);
  if (!isAllCrewTypesSelected()) chips.push(`<span class="filter-chip">${selectedCrewTypeIds().length} crew types</span>`);
  return `<div class="filter-chips">${chips.join("")}</div>`;
}

function crewDropdown(scope) {
  const selected = selectedCrewTypeIds();
  const summary = isAllCrewTypesSelected()
    ? "All crews"
    : `${selected.length} crew type${selected.length === 1 ? "" : "s"} selected`;
  return `
    <details class="filter-dropdown" data-filter-scope="${scope}">
      <summary>${summary}</summary>
      <div class="filter-dropdown-panel">
        <label class="check-row"><input type="checkbox" data-crew-filter="all" ${isAllCrewTypesSelected() ? "checked" : ""} />All Crews</label>
        ${state.crewTypes.map((type) => `<label class="check-row"><input type="checkbox" data-crew-filter="${type.id}" ${selected.includes(type.id) ? "checked" : ""} />${type.label}</label>`).join("")}
      </div>
    </details>
  `;
}

function projectDropdown(scope, projects, selectedProjectIds) {
  const summary = selectedProjectSummary(projects, selectedProjectIds);
  return `
    <details class="filter-dropdown project-dropdown" data-filter-scope="${scope}">
      <summary>${summary}</summary>
      <div class="filter-dropdown-panel wide">
        <input class="dropdown-search" data-project-search="${scope}" placeholder="Search projects" />
        <div class="dropdown-actions">
          <button class="mini-button" data-action="${scope}-select-all-projects">All</button>
          <button class="mini-button" data-action="${scope}-clear-projects">Clear</button>
        </div>
        <div class="dropdown-list">
          ${projects.map((project) => `<label class="check-row" data-project-option="${scope}"><input type="checkbox" data-project-filter-scope="${scope}" data-project-filter="${project.id}" ${selectedProjectIds.includes(project.id) ? "checked" : ""} />${project.name} - ${project.area || ""}</label>`).join("")}
          <div class="empty-inline dropdown-empty" data-project-empty="${scope}" hidden>No projects match this search.</div>
        </div>
      </div>
    </details>
  `;
}

function selectedProjectSummary(projects, selectedIds) {
  if (!projects.length) return "No projects";
  if (selectedIds.length === projects.length) return "All projects";
  if (selectedIds.length === 1) return "1 project selected";
  return `${selectedIds.length} projects selected`;
}

function granularityControl() {
  return `<div class="segmented small">${["day", "week", "month", "year"].map((item) => `<button class="${state.granularity === item ? "selected" : ""}" data-granularity="${item}">${capitalize(item)}</button>`).join("")}</div>`;
}

function areaOptions(selected, allLabel = "All areas") {
  return [`<option value="all" ${selected === "all" ? "selected" : ""}>${allLabel}</option>`]
    .concat(PROJECT_AREAS.map((area) => `<option value="${area}" ${selected === area ? "selected" : ""}>${area}</option>`))
    .join("");
}

function projectTable(projects, clickable) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Project Name</th><th>Area</th><th>Manager</th><th>Dates</th><th>Total Hours</th><th>Status</th></tr></thead>
        <tbody>
          ${projects.map((project) => `
            <tr class="${clickable ? "clickable" : ""} ${state.activeProjectId === project.id ? "selected-row" : ""}" data-project-row="${project.id}">
              <td><strong>${project.name}</strong><span>${project.tasks.length} tasks - ${project.dailyHoursPerWorker} hrs/day</span></td>
              <td>${project.area || ""}<span>${project.cityName || ""}</span></td>
              <td>${managerName(project.managerId)}</td>
              <td>${formatDate(project.startDate)} - ${formatDate(project.endDate)}</td>
              <td>${formatNumber(projectTotalHours(project))}</td>
              <td><span class="status ${project.status.toLowerCase().replace(" ", "-")}">${projectStatusLabel(project.status)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function taskTable(project, canEdit, tasks = orderedProjectTasks(project)) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th></th><th>Task ID</th><th>Task Name</th><th>Start</th><th>End</th><th>Total Value</th><th>Labour Hours</th><th>Status</th><th>Exact Crew</th><th>Rounded Crew</th><th></th></tr></thead>
        <tbody>
          ${canEdit ? quickAddTaskRow(project) : ""}
          ${tasks.map((task) => `
            <tr draggable="${canEdit ? "true" : "false"}" data-task-drag="${task.id}">
              <td class="drag-cell">${canEdit ? `<span class="drag-handle" title="Drag to reorder">${icon("drag")}</span>` : ""}</td>
              <td><strong>${task.id}</strong></td>
              <td>${task.name}</td>
              <td>${formatDate(task.startDate)}</td>
              <td>${formatDate(task.endDate)}</td>
              <td>${task.totalValue ? currency(task.totalValue) : ""}</td>
              <td>${task.labourHoursMissing ? "" : formatNumber(task.totalLabourHours)}</td>
              <td>${taskStatusBadges(task)}</td>
              <td>${formatNumber(taskAverageManpower(task, project.dailyHoursPerWorker), 2)}</td>
              <td>${Math.ceil(taskAverageManpower(task, project.dailyHoursPerWorker))}</td>
              <td class="row-actions">${canEdit ? `<button title="Edit task" data-action="edit-task" data-project="${project.id}" data-task="${task.id}">${icon("edit")}Edit</button><button title="Delete task" data-action="delete-task" data-project="${project.id}" data-task="${task.id}">${icon("trash")}Delete</button>` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function taskStatusBadges(task) {
  const badges = [];
  if (task.source === "excel_import") badges.push(`<span class="status imported">Excel Import</span>`);
  if (task.labourHoursMissing) badges.push(`<span class="status missing">Hours Missing</span>`);
  return badges.length ? `<div class="status-stack">${badges.join("")}</div>` : `<span class="status manual">Manual</span>`;
}

function quickAddTaskRow(project) {
  return `
    <tr class="quick-add-row">
      <td></td>
      <td><input data-quick="id" placeholder="Task ID" /></td>
      <td><input data-quick="name" placeholder="Task name" title="Enter total hours - system calculates manpower automatically" /></td>
      <td><input data-quick="startDate" type="date" value="${project.startDate}" /></td>
      <td><input data-quick="endDate" type="date" value="${project.endDate}" /></td>
      <td><input data-quick="totalValue" type="number" min="0" placeholder="Value" /></td>
      <td><input data-quick="totalLabourHours" type="number" min="0" placeholder="Hours" /></td>
      <td colspan="3"><span class="help-text">Enter hours or value. Value uses the project avg hour rate.</span></td>
      <td><button class="button primary" data-action="quick-add-task" data-project="${project.id}">${icon("plus")}Add</button></td>
    </tr>
  `;
}

function crewAllocationTemplate(project, canEdit, tasks = filteredProjectTasks(project)) {
  return `
    <div class="detail-grid single">
      <section class="table-card">
        <div class="card-head">
          <div><h2>Crew Allocation</h2><p>Break required crew into labour types without changing the main task table.</p></div>
          <div class="segmented small"><button class="${state.crewAllocationMode === "compact" ? "selected" : ""}" data-crew-view="compact">Simple</button><button class="${state.crewAllocationMode === "advanced" ? "selected" : ""}" data-crew-view="advanced">Advanced</button></div>
        </div>
        ${canEdit ? crewTypeManager() : ""}
        ${projectTaskFilterBar()}
        ${state.crewAllocationMode === "advanced" ? crewAllocationTable(project, canEdit, tasks) : crewAllocationCompact(project, canEdit, tasks)}
      </section>
    </div>
  `;
}

function crewAllocationCompact(project, canEdit, tasks = filteredProjectTasks(project)) {
  const selectedTask = tasks.find((task) => task.id === state.selectedCrewTaskId) || tasks[0];
  return `
    <div class="crew-compact-layout">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Task</th><th>Dates</th><th>Total crew needed</th><th>Status</th></tr></thead>
          <tbody>
            ${tasks.map((task) => {
              const summary = crewAllocationSummary(project, task);
              return `<tr class="clickable ${selectedTask?.id === task.id ? "selected-row" : ""}" data-crew-row="${task.id}"><td><strong>${task.id}</strong><span>${task.name}</span></td><td>${formatDate(task.startDate)} - ${formatDate(task.endDate)}</td><td>${formatNumber(summary.required, summary.mode === "exact" ? 2 : 0)} ${summary.mode === "exact" ? "Exact Crew" : "Rounded Crew"}</td><td><span class="status ${summary.statusClass}">${summary.status}</span></td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      <aside class="crew-side-panel">
        ${selectedTask ? crewAllocationSidePanel(project, selectedTask, canEdit) : `<div class="empty-inline">Select a task to allocate crew.</div>`}
      </aside>
    </div>
  `;
}

function crewAllocationSidePanel(project, task, canEdit) {
  const summary = crewAllocationSummary(project, task);
  return `
    <div class="task-detail-stack">
      <h3>${task.name}</h3>
      <p>${task.id} - ${formatDate(task.startDate)} to ${formatDate(task.endDate)}</p>
      <div class="task-metrics">
        <div><span>Total crew needed</span><strong>${formatNumber(summary.required, summary.mode === "exact" ? 2 : 0)}</strong></div>
        <div><span>Status</span><strong>${summary.status}</strong></div>
      </div>
      <label class="field"><span>Crew calculation</span><select data-crew-mode-task="${task.id}" ${canEdit ? "" : "disabled"}><option value="rounded" ${summary.mode === "rounded" ? "selected" : ""}>Rounded Crew</option><option value="exact" ${summary.mode === "exact" ? "selected" : ""}>Exact Crew</option></select></label>
      <div class="crew-side-inputs">
        ${state.crewTypes.map((type) => `<label class="field"><span>${type.label}</span><input class="crew-input" type="number" min="0" step="0.25" value="${summary.allocation[type.id]}" data-crew-task="${task.id}" data-crew-type="${type.id}" ${canEdit ? "" : "disabled"} /></label>`).join("")}
      </div>
      <div class="controls"><button class="button secondary" data-action="auto-distribute-crew" data-task="${task.id}">Auto distribute</button><button class="button secondary" data-action="copy-previous-crew" data-task="${task.id}">Copy previous</button></div>
    </div>
  `;
}

function crewTypeManager() {
  return `
    <div class="crew-type-manager">
      <div class="crew-add-row">
        <input data-crew-type-name placeholder="New crew type" />
        <button class="button secondary" data-action="add-crew-type">${icon("plus")}Add Crew Type</button>
      </div>
      <div class="crew-type-list">
        ${state.crewTypes.map((type) => `<label class="crew-type-chip"><input type="checkbox" data-crew-type-remove="${type.id}" />${type.label}</label>`).join("")}
      </div>
      <button class="button secondary danger-button" data-action="remove-selected-crew-types">Remove Selected</button>
    </div>
  `;
}

function crewAllocationTable(project, canEdit, tasks = filteredProjectTasks(project)) {
  return `
    <div class="table-wrap">
      <table class="crew-table">
        <thead>
          <tr>
            <th>Task ID</th>
            <th>Task Name</th>
            <th>Start</th>
            <th>End</th>
            <th>Required Crew</th>
            ${state.crewTypes.map((type) => `<th>${type.label}</th>`).join("")}
            <th>Total Allocated</th>
            <th>Remaining</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map((task) => crewAllocationRow(project, task, canEdit)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function crewAllocationRow(project, task, canEdit) {
  const summary = crewAllocationSummary(project, task);
  return `
    <tr class="crew-row ${summary.statusTone}">
      <td><strong>${task.id}</strong></td>
      <td>${task.name}<span>${summary.warning || "Enter crew counts by type."}</span></td>
      <td>${formatDate(task.startDate)}</td>
      <td>${formatDate(task.endDate)}</td>
      <td><strong>${formatNumber(summary.required, summary.mode === "exact" ? 2 : 0)}</strong><select class="mini-select" data-crew-mode-task="${task.id}" ${canEdit ? "" : "disabled"}><option value="rounded" ${summary.mode === "rounded" ? "selected" : ""}>Rounded Crew</option><option value="exact" ${summary.mode === "exact" ? "selected" : ""}>Exact Crew</option></select></td>
      ${state.crewTypes.map((type) => `<td><input class="crew-input" type="number" min="0" step="0.25" max="${Math.max(0, summary.remaining + summary.allocation[type.id])}" value="${summary.allocation[type.id]}" data-crew-task="${task.id}" data-crew-type="${type.id}" ${canEdit ? "" : "disabled"} /></td>`).join("")}
      <td>${formatNumber(summary.allocated, 2)}</td>
      <td>${formatNumber(summary.remaining, 2)}</td>
      <td><span class="status ${summary.statusClass}">${summary.status}</span></td>
    </tr>
  `;
}

function scheduleTemplate(project, activeTask, tasks = filteredProjectTasks(project)) {
  const timeline = scheduleTimeline(project, state.scheduleGranularity, tasks);
  return `
    <div class="detail-grid schedule-layout">
      <section class="table-card schedule-card">
        <div class="card-head">
          <div><h2>Schedule</h2><p>Visual task timeline for simple project planning.</p></div>
          ${scheduleGranularityControl()}
        </div>
        ${projectTaskFilterBar()}
        ${scheduleLegend()}
        ${whatIfPanel(project, tasks)}
        ${timeline.periods.length && tasks.length ? scheduleBoard(project, timeline, tasks) : `<div class="empty-inline">No tasks to place on the schedule yet.</div>`}
      </section>
      <aside class="table-card task-panel">
        <div class="card-head"><div><h2>Task Detail</h2><p>Hover bars for a quick read or click one for detail.</p></div></div>
        ${activeTask ? scheduleTaskPanel(project, activeTask) : `<div class="empty-inline">Select a task to see dates, labour, and crew demand.</div>`}
      </aside>
    </div>
  `;
}

function scheduleGranularityControl() {
  return `<div class="controls"><div class="segmented small">${["day", "week", "month"].map((item) => `<button class="${state.scheduleGranularity === item ? "selected" : ""}" data-schedule-granularity="${item}">${capitalize(item)}</button>`).join("")}</div><div class="segmented small">${[2, 4, 6].map((weeks) => `<button data-schedule-lookahead="${weeks}">${weeks} weeks</button>`).join("")}</div></div>`;
}

function scheduleBoard(project, timeline, tasks = filteredProjectTasks(project)) {
  const columns = timeline.periods.map(() => `${timeline.columnWidth}px`).join(" ");
  return `
    <div class="schedule-board">
      <div class="schedule-grid" style="grid-template-columns: 280px ${columns};">
        <div class="schedule-corner">Task</div>
        ${timeline.periods.map((period) => `<div class="schedule-head-cell">${period.label}</div>`).join("")}
        ${tasks.map((task) => scheduleRow(project, task, timeline)).join("")}
      </div>
    </div>
  `;
}

function scheduleLegend() {
  return `<div class="schedule-legend"><span><i class="legend-normal"></i>Normal</span><span><i class="legend-warning"></i>Needs Attention</span><span><i class="legend-danger"></i>Over Capacity</span><span><i class="legend-selected"></i>Selected</span></div>`;
}

function whatIfPanel(project, tasks) {
  const currentPeak = Math.max(0, ...aggregateDailySeries(tasks, project.dailyHoursPerWorker, "week", "manpower").map((point) => point.value));
  const capacity = Number(state.whatIfCapacity || project.maxAvailableWorkers || 0);
  return `
    <div class="what-if-panel">
      <strong>What-if mode</strong>
      <label class="mini-field"><span>Crew capacity</span><input type="number" min="1" data-field="whatIfCapacity" value="${state.whatIfCapacity || project.maxAvailableWorkers || ""}" /></label>
      <span>Current peak: ${formatNumber(currentPeak, 2)} crew</span>
      <span>${currentPeak > capacity ? "Over capacity in this scenario" : "On track in this scenario"}</span>
    </div>
  `;
}

function scheduleRow(project, task, timeline) {
  const duration = taskDurationDates(task).length;
  const severity = taskSeverity(project, task);
  const exact = taskAverageManpower(task, project.dailyHoursPerWorker);
  const placement = taskPlacement(task, timeline);
  return `
    <div class="schedule-task-info">
      <strong>${task.id}</strong>
      <span>${task.name}</span>
      <small>${duration} day${duration === 1 ? "" : "s"} · ${formatNumber(exact, 2)} / ${Math.ceil(exact)} workers</small>
    </div>
    <div class="schedule-row-track" style="grid-column: 2 / span ${timeline.periods.length};">
      <button
        class="schedule-bar ${severity} ${state.activeScheduleTaskId === task.id ? "selected" : ""}"
        data-schedule-task="${task.id}"
        title="${task.name} | ${formatDate(task.startDate)} to ${formatDate(task.endDate)} | ${formatNumber(task.totalLabourHours)} hrs | ${formatNumber(exact, 2)} workers"
        style="left:${placement.left}px; width:${placement.width}px;"
      >
        <span>${task.id}</span>
      </button>
    </div>
  `;
}

function scheduleTaskPanel(project, task) {
  const exact = taskAverageManpower(task, project.dailyHoursPerWorker);
  const rounded = Math.ceil(exact);
  const severity = taskSeverity(project, task);
  return `
    <div class="task-detail-stack">
      <div class="task-pill ${severity}">${severityLabel(severity)}</div>
      <h3>${task.name}</h3>
      <p>${task.id}</p>
      <div class="task-metrics">
        <div><span>Start</span><strong>${formatDate(task.startDate)}</strong></div>
        <div><span>Finish</span><strong>${formatDate(task.endDate)}</strong></div>
        <div><span>Labour Hours</span><strong>${formatNumber(task.totalLabourHours)}</strong></div>
        <div><span>Exact Crew</span><strong>${formatNumber(exact, 2)}</strong></div>
        <div><span>Rounded Crew</span><strong>${rounded}</strong></div>
        <div><span>Duration</span><strong>${taskDurationDates(task).length} days</strong></div>
      </div>
      <p class="task-detail-note">This task’s bar color reflects its workforce intensity compared with the project capacity, so users can relate schedule placement to labour pressure quickly.</p>
      ${(task.notes || task.assumptions || task.documentLink) ? `<div class="task-context"><strong>Task context</strong>${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ""}${task.assumptions ? `<p>${escapeHtml(task.assumptions)}</p>` : ""}${task.documentLink ? `<a href="${escapeHtml(task.documentLink)}" target="_blank" rel="noreferrer">Open document</a>` : ""}</div>` : ""}
    </div>
  `;
}

function peaksTemplate(projects) {
  const weeks = nextThreeWeekPeaks(projects);
  return `
    <div class="peak-week-list">
      ${weeks.map((week, index) => `
        <div class="peak-summary">
          <span>Week ${index + 1}</span>
          <strong>${formatNumber(week.peak?.value || 0, 1)} workers</strong>
          <p>${week.startLabel} to ${week.endLabel}${week.peak ? ` - peak ${week.peak.label}` : " - no scheduled labour"}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function insightsTemplate(analysis) {
  return `<div class="insight-list">${analysis.insights.map((insight) => `
    <article class="insight-card ${insight.tone}">
      <strong>${insight.title}</strong>
      <p>${insight.text}</p>
    </article>
  `).join("")}</div>`;
}

function peakAnalysisTable(peaks) {
  return `
    <div class="table-wrap compact-table">
      <table>
        <thead><tr><th>Peak Period</th><th>Exact Crew</th><th>Rounded Crew</th><th>Contributing Projects</th></tr></thead>
        <tbody>
          ${peaks.map((peak) => `<tr><td><strong>${peak.label}</strong></td><td>${formatNumber(peak.value, 2)}</td><td>${peak.rounded}</td><td>${peak.contributors.slice(0, 3).map((item) => `${item.name} (${formatNumber(item.value, 1)})`).join(", ")}</td></tr>`).join("") || `<tr><td colspan="4">No labour inside this filter.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function projectContributionTable(projects, range = {}) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Project</th><th>Total Hours</th><th>Capacity</th><th>Peak Exact Crew</th><th>Peak Rounded Crew</th><th>Status</th></tr></thead>
        <tbody>
          ${projects.map((project) => {
            const points = aggregateProject(project, state.granularity, "manpower", range);
            const peak = Math.max(0, ...points.map((point) => point.value));
            const capacity = Number(project.maxAvailableWorkers || 0);
            const over = peak > capacity;
            return `<tr><td><strong>${project.name}</strong><span>${managerName(project.managerId)}</span></td><td>${formatNumber(projectTotalHours(project))}</td><td>${formatNumber(capacity, 0)}</td><td>${formatNumber(peak, 2)}</td><td>${Math.ceil(peak)}</td><td><span class="status ${over ? "at-risk" : "active"}">${over ? "Over Capacity" : "Healthy"}</span></td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function peaksTable(projects) {
  const peaks = topPeaks(projects, state.granularity, state.valueMode);
  return `<div class="table-wrap compact-table"><table><thead><tr><th>Period</th><th>Demand</th></tr></thead><tbody>${peaks.map((peak) => `<tr><td>${peak.label}</td><td><strong>${formatNumber(peak.value, 1)}</strong></td></tr>`).join("")}</tbody></table></div>`;
}

function legendTemplate(projects) {
  return `<div class="legend-list">${projects.map((project, index) => `
    <button class="legend-row" data-project-row="${project.id}"><i style="background:${palette[index % palette.length]}"></i><span>${project.name}</span><strong>${formatNumber(projectTotalHours(project))} hrs</strong></button>
  `).join("")}</div>`;
}

function modalTemplate() {
  return `<div class="modal-root" id="modal-root"></div>`;
}

function openProjectModal(project = null) {
  const isEdit = Boolean(project);
  const managerOptions = state.role === "pm"
    ? state.managers.filter((manager) => manager.id === state.currentUserManagerId)
    : state.managers;
  showModal(`
    <form class="modal-card" data-form="project">
      <h2>${isEdit ? "Edit Project" : "Create Project"}</h2>
      <p>Keep setup short. Daily hours per worker is set once here and reused by every task.</p>
      <input type="hidden" name="id" value="${project?.id || ""}" />
      ${field("Project Name", "name", project?.name || "", "text", true)}
      <div class="form-row">
        ${selectField("Manager", "managerId", project?.managerId || state.currentUserManagerId, managerOptions.map((manager) => [manager.id, manager.name]))}
        ${selectField("Status", "status", project?.status || "Active", [["Active", "Active"], ["At Risk", "Needs Attention"], ["Planning", "Planning"]])}
      </div>
      <div class="form-row">
        ${selectField("Area", "area", project?.area || "Calgary", PROJECT_AREAS.map((area) => [area, area]))}
        ${field("City Name", "cityName", project?.cityName || "", "text", true, "Required for Out of Town projects.")}
      </div>
      <div class="form-row">
        ${field("Start Date", "startDate", project?.startDate || today(), "date", true)}
        ${field("End Date", "endDate", project?.endDate || today(30), "date", true)}
      </div>
      <div class="form-row">
        ${field("Daily Hours Per Worker", "dailyHoursPerWorker", project?.dailyHoursPerWorker || 10, "number", true, "Example: 10 hours/day")}
        <label class="field"><span>Avg Hour Rate</span><div class="money-input"><span>CAD</span><input name="avgHourlyRate" type="number" min="1" step="0.01" value="${project?.avgHourlyRate || 85}" required /></div><small>Used when labour hours are calculated from total value.</small></label>
      </div>
      ${field("Max Available Workers", "maxAvailableWorkers", project?.maxAvailableWorkers || 20, "number", true, "Capacity line and risk detection use this.")}
      <div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><button class="button primary">${isEdit ? "Save Project" : "Create Project"}</button></div>
    </form>
  `);
}

function openTaskModal(projectId, task = null) {
  showModal(`
    <form class="modal-card" data-form="task" data-project="${projectId}">
      <h2>${task ? "Edit Task" : "Add Task"}</h2>
      <p>Enter labour hours directly, or enter total value to calculate using the project rate.</p>
      <input type="hidden" name="originalId" value="${task?.id || ""}" />
      ${field("Task ID", "id", task?.id || "", "text", true)}
      ${field("Task Name", "name", task?.name || "", "text", true)}
      <div class="form-row">
        ${field("Start Date", "startDate", task?.startDate || today(), "date", true)}
        ${field("End Date", "endDate", task?.endDate || today(14), "date", true)}
      </div>
      <div class="form-row">
        ${field("Total Value", "totalValue", task?.totalValue || "", "number", false, "Optional. Uses project avg hour rate.")}
        ${field("Total Labour Hours", "totalLabourHours", task ? (task.labourHoursMissing ? "" : task.totalLabourHours ?? "") : 100, "number", false, "Enter manually or calculate from value.")}
      </div>
      ${field("Notes", "notes", task?.notes || "", "text", false)}
      ${field("Assumptions", "assumptions", task?.assumptions || "", "text", false)}
      ${field("Document Link", "documentLink", task?.documentLink || "", "url", false)}
      <div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><button class="button primary">${task ? "Save Task" : "Add Task"}</button></div>
    </form>
  `);
}

function openScheduleImportModal(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  scheduleImportDraft = {
    projectId,
    step: 1,
    fileName: "",
    headers: [],
    rows: [],
    mapping: {},
    extracted: [],
    skipped: [],
    selectedUpdates: new Set(),
    selectedNew: new Set(),
    search: "",
    summary: null,
    error: ""
  };
  renderScheduleImportModal(project);
}

function renderScheduleImportModal(project = state.projects.find((item) => item.id === scheduleImportDraft?.projectId)) {
  if (!scheduleImportDraft || !project) return;
  const draft = scheduleImportDraft;
  showModal(`
    <section class="modal-card import-modal">
      <div class="import-head">
        <div>
          <h2>Import Schedule</h2>
          <p>Only Task ID, Task Name, Start Date, and End Date will be imported. Labour hours must be entered separately.</p>
        </div>
        <button type="button" class="icon-button" data-action="close-modal" title="Close">${icon("close")}</button>
      </div>
      ${importSteps(draft.step)}
      ${draft.step === 1 ? importUploadStep(draft) : ""}
      ${draft.step === 2 ? importReviewStep(project, draft) : ""}
      ${draft.step === 3 ? importSummaryStep(draft) : ""}
    </section>
  `);
}

function importSteps(active) {
  return `<div class="import-steps">${[["1", "Upload File"], ["2", "Review Changes"], ["3", "Finish Import"]].map(([number, label]) => `<span class="${Number(number) === active ? "active" : Number(number) < active ? "done" : ""}"><b>${number}</b>${label}</span>`).join("")}</div>`;
}

function importUploadStep(draft) {
  const needsMapping = draft.headers.length && !isMappingComplete(draft.mapping);
  return `
    <div class="import-upload">
      <label class="file-drop" data-file-drop>
        <input type="file" data-import-file accept=".xlsx,.xls,.csv" />
        ${icon("upload")}
        <strong>Upload GC Schedule</strong>
        <span>.xlsx, .xls, or .csv</span>
      </label>
      ${draft.error ? `<div class="import-alert error">${draft.error}</div>` : ""}
      ${draft.fileName ? `
        <div class="import-file-summary">
          <strong>${escapeHtml(draft.fileName)}</strong>
          <span>${draft.rows.length} rows detected</span>
          <span>Detected columns: ${draft.headers.map(escapeHtml).join(", ") || "None"}</span>
        </div>
        ${needsMapping ? importMappingFields(draft) : `<div class="import-alert success">Columns detected. Review the mapping, then continue.</div>${importMappingFields(draft)}`}
      ` : ""}
      <div class="modal-actions">
        <button type="button" class="button secondary" data-action="close-modal">Cancel</button>
        <button type="button" class="button primary" data-action="continue-import" ${draft.rows.length && isMappingComplete(draft.mapping) ? "" : "disabled"}>Continue</button>
      </div>
    </div>
  `;
}

function importMappingFields(draft) {
  const options = (selected) => [`<option value="">Choose column</option>`].concat(draft.headers.map((header, index) => `<option value="${index}" ${String(selected) === String(index) ? "selected" : ""}>${escapeHtml(header || `Column ${index + 1}`)}</option>`)).join("");
  return `
    <div class="mapping-grid">
      ${[
        ["taskId", "Task ID"],
        ["name", "Task Name"],
        ["startDate", "Start Date"],
        ["endDate", "End Date"],
        ["totalValue", "Total Value"]
      ].map(([key, label]) => `<label class="field"><span>${label}</span><select data-import-map="${key}">${options(draft.mapping[key])}</select></label>`).join("")}
    </div>
  `;
}

function importReviewStep(project, draft) {
  const comparison = compareImportedTasks(project, draft.extracted);
  const term = draft.search.trim().toLowerCase();
  const changes = comparison.changes.filter((item) => importMatchesSearch(item.uploaded, term));
  const newTasks = comparison.newTasks.filter((item) => importMatchesSearch(item.uploaded, term));
  const unchanged = comparison.unchanged.filter((item) => importMatchesSearch(item.uploaded, term));
  return `
    <div class="import-review">
      <div class="import-toolbar">
        <input class="search" data-import-search value="${escapeHtml(draft.search)}" placeholder="Search Task ID or Task Name" />
        <button type="button" class="button secondary" data-action="select-all-import">Select All</button>
        <button type="button" class="button secondary" data-action="clear-import-selection">Clear Selection</button>
        ${draft.skipped.length ? `<button type="button" class="button secondary" data-action="export-skipped-rows">Export Skipped Rows</button>` : ""}
      </div>
      <div class="import-summary-grid">
        <span><strong>${comparison.changes.length}</strong> schedule changes</span>
        <span><strong>${comparison.newTasks.length}</strong> new tasks</span>
        <span><strong>${comparison.unchanged.length}</strong> unchanged</span>
        <span><strong>${draft.skipped.length}</strong> skipped rows</span>
      </div>
      ${draft.skipped.length ? `<div class="import-alert error">${draft.skipped.length} rows skipped because required fields were missing.</div>` : ""}
      <section class="import-section">
        <div class="section-title"><h3>Existing Tasks with Schedule Changes</h3><span>${changes.length}</span></div>
        ${changes.length ? importChangeTable(changes, draft) : `<div class="empty-inline">No schedule changes detected for matched tasks.</div>`}
      </section>
      <section class="import-section">
        <div class="section-title"><h3>New Tasks Found in Uploaded Schedule</h3><span>${newTasks.length}</span></div>
        ${newTasks.length ? importNewTaskTable(newTasks, draft) : `<div class="empty-inline">No new tasks found in this upload.</div>`}
      </section>
      <details class="import-section muted-section">
        <summary>Unchanged Tasks <span>${unchanged.length}</span></summary>
        ${unchanged.length ? importUnchangedTable(unchanged) : `<div class="empty-inline">No unchanged matched tasks.</div>`}
      </details>
      <div class="modal-actions">
        <button type="button" class="button secondary" data-action="back-import">Back</button>
        <button type="button" class="button secondary" data-action="skip-updates">Skip Updates</button>
        <button type="button" class="button primary" data-action="finish-import">Finish Import</button>
      </div>
    </div>
  `;
}

function importChangeTable(items, draft) {
  return `<div class="table-wrap import-table"><table><thead><tr><th>Confirm</th><th>Task ID</th><th>Task Name</th><th>Current Start</th><th>New Start</th><th>Current End</th><th>New End</th><th>Change</th></tr></thead><tbody>${items.map(({ existing, uploaded }) => `
    <tr class="import-change ${draft.selectedUpdates.has(uploaded.id) ? "selected" : ""}">
      <td><input type="checkbox" data-import-update="${escapeHtml(uploaded.id)}" ${draft.selectedUpdates.has(uploaded.id) ? "checked" : ""} /></td>
      <td><strong>${escapeHtml(uploaded.id)}</strong></td>
      <td>${escapeHtml(uploaded.name)}</td>
      <td>${formatDate(existing.startDate)}</td>
      <td>${formatDate(uploaded.startDate)}</td>
      <td>${formatDate(existing.endDate)}</td>
      <td>${formatDate(uploaded.endDate)}</td>
      <td><span class="status changed">${changeSummary(existing, uploaded)}</span></td>
    </tr>`).join("")}</tbody></table></div>`;
}

function importNewTaskTable(items, draft) {
  return `<div class="table-wrap import-table"><table><thead><tr><th>Select</th><th>Task ID</th><th>Task Name</th><th>Start Date</th><th>End Date</th><th>Total Value</th><th>Labour Hours</th><th>Status</th></tr></thead><tbody>${items.map(({ uploaded }) => `
    <tr class="import-new ${draft.selectedNew.has(uploaded.id) ? "selected" : ""}">
      <td><input type="checkbox" data-import-new="${escapeHtml(uploaded.id)}" ${draft.selectedNew.has(uploaded.id) ? "checked" : ""} /></td>
      <td><strong>${escapeHtml(uploaded.id)}</strong></td>
      <td>${escapeHtml(uploaded.name)}</td>
      <td>${formatDate(uploaded.startDate)}</td>
      <td>${formatDate(uploaded.endDate)}</td>
      <td>${uploaded.totalValue ? currency(uploaded.totalValue) : ""}</td>
      <td>${uploaded.totalValue ? formatNumber(uploaded.totalValue / (state.projects.find((item) => item.id === draft.projectId)?.avgHourlyRate || 1), 2) : ""}</td>
      <td><span class="status imported">New Task Added</span>${uploaded.totalValue ? `<span class="status active">Hours Calculated</span>` : `<span class="status missing">Hours Missing</span>`}</td>
    </tr>`).join("")}</tbody></table></div>`;
}

function importUnchangedTable(items) {
  return `<div class="table-wrap import-table"><table><thead><tr><th>Task ID</th><th>Task Name</th><th>Start Date</th><th>End Date</th><th>Status</th></tr></thead><tbody>${items.map(({ uploaded }) => `
    <tr>
      <td><strong>${escapeHtml(uploaded.id)}</strong></td>
      <td>${escapeHtml(uploaded.name)}</td>
      <td>${formatDate(uploaded.startDate)}</td>
      <td>${formatDate(uploaded.endDate)}</td>
      <td><span class="status unchanged">Unchanged</span></td>
    </tr>`).join("")}</tbody></table></div>`;
}

function importSummaryStep(draft) {
  const summary = draft.summary || { updated: 0, added: 0, unchanged: 0, skipped: 0 };
  const nothingImported = !summary.updated && !summary.added;
  return `
    <div class="import-complete">
      <h3>${nothingImported ? "Import Finished with No Changes" : "Import Complete"}</h3>
      ${nothingImported ? `<div class="import-alert error">No tasks were imported or updated. Review your selection and mapping before trying again.</div>` : ""}
      <ul>
        <li><strong>${summary.updated}</strong> existing tasks updated</li>
        <li><strong>${summary.added}</strong> new tasks added</li>
        <li><strong>${summary.unchanged}</strong> unchanged tasks ignored</li>
        <li><strong>${summary.skipped}</strong> rows skipped because required fields were missing</li>
      </ul>
      <div class="modal-actions"><button type="button" class="button primary" data-action="close-modal">Done</button></div>
    </div>
  `;
}

function field(label, name, value, type, required, help = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(String(value))}" ${required ? "required" : ""} />${help ? `<small>${help}</small>` : ""}</label>`;
}

function selectField(label, name, value, options) {
  return `<label class="field"><span>${label}</span><select name="${name}">${options.map(([id, text]) => `<option value="${id}" ${value === id ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
}

function showModal(html) {
  document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop">${html}</div>`;
  bindModalEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    state.activeView = button.dataset.view;
    render();
  }));
  document.querySelectorAll("[data-project-tab]").forEach((button) => button.addEventListener("click", () => {
    state.projectTab = button.dataset.projectTab;
    render();
  }));
  document.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => {
    state.role = button.dataset.role;
    if (state.role !== "vp" && state.activeView === "company") state.activeView = "dashboard";
    render();
  }));
  document.querySelectorAll("[data-action='collapse']").forEach((button) => button.addEventListener("click", () => {
    state.collapsed = !state.collapsed;
    render();
  }));
  document.querySelectorAll("[data-action='reset']").forEach((button) => button.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(seedState);
    render();
  }));
  document.querySelectorAll("[data-action='clear-dashboard-dates']").forEach((button) => button.addEventListener("click", () => {
    state.dashboardStartDate = "";
    state.dashboardEndDate = "";
    render();
  }));
  document.querySelectorAll("[data-action='new-project']").forEach((button) => button.addEventListener("click", () => openProjectModal()));
  document.querySelectorAll("[data-action='new-task']").forEach((button) => button.addEventListener("click", () => openTaskModal(button.dataset.project)));
  document.querySelectorAll("[data-action='import-schedule']").forEach((button) => button.addEventListener("click", () => openScheduleImportModal(button.dataset.project)));
  document.querySelectorAll("[data-action='quick-add-task']").forEach((button) => button.addEventListener("click", () => {
    const row = button.closest("tr");
    const project = state.projects.find((item) => item.id === button.dataset.project);
    const value = (name) => row.querySelector(`[data-quick='${name}']`)?.value;
    if (!value("id") || !value("name") || !value("startDate") || !value("endDate") || (!value("totalLabourHours") && !value("totalValue"))) return;
    const totalValue = Number(value("totalValue") || 0);
    const labour = labourHoursFromInputs(value("totalLabourHours"), totalValue, project.avgHourlyRate);
    project.tasks.push({
      id: value("id"),
      name: value("name"),
      startDate: value("startDate"),
      endDate: value("endDate"),
      totalValue,
      totalLabourHours: labour.hours,
      labourHoursSource: labour.source,
      source: "manual",
      lastImportedAt: "",
      scheduleImportBatchId: "",
      labourHoursMissing: false,
      crewRequirementMode: "rounded",
      crewAllocation: Object.fromEntries(state.crewTypes.map((type) => [type.id, 0]))
    });
    sortAndNumberProjectTasks(project);
    syncProjectDateRange(project);
    render();
  }));
  document.querySelectorAll("[data-action='edit-task']").forEach((button) => button.addEventListener("click", () => {
    const project = state.projects.find((item) => item.id === button.dataset.project);
    openTaskModal(project.id, project.tasks.find((task) => task.id === button.dataset.task));
  }));
  document.querySelectorAll("[data-action='delete-task']").forEach((button) => button.addEventListener("click", () => {
    const project = state.projects.find((item) => item.id === button.dataset.project);
    const removed = project.tasks.find((task) => task.id === button.dataset.task);
    const index = project.tasks.findIndex((task) => task.id === button.dataset.task);
    project.tasks = project.tasks.filter((task) => task.id !== button.dataset.task);
    lastUndo = removed ? {
      message: `Deleted ${removed.id}.`,
      run: () => {
        project.tasks.splice(index, 0, removed);
        renumberTaskOrder(project);
        syncProjectDateRange(project);
      }
    } : null;
    render();
  }));
  document.querySelectorAll("[data-action='undo-last']").forEach((button) => button.addEventListener("click", () => {
    if (!lastUndo) return;
    lastUndo.run();
    lastUndo = null;
    render();
  }));
  document.querySelectorAll("[data-project-row]").forEach((row) => row.addEventListener("click", () => {
    state.activeProjectId = row.dataset.projectRow;
    state.activeView = "project";
    state.projectTab = "overview";
    render();
  }));
  document.querySelectorAll("[data-granularity]").forEach((button) => button.addEventListener("click", () => {
    state.granularity = button.dataset.granularity;
    render();
  }));
  document.querySelectorAll("[data-schedule-granularity]").forEach((button) => button.addEventListener("click", () => {
    state.scheduleGranularity = button.dataset.scheduleGranularity;
    render();
  }));
  document.querySelectorAll("[data-schedule-lookahead]").forEach((button) => button.addEventListener("click", () => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + Number(button.dataset.scheduleLookahead) * 7 - 1);
    state.projectTaskStartDate = iso(start);
    state.projectTaskEndDate = iso(end);
    render();
  }));
  document.querySelectorAll("[data-crew-view]").forEach((button) => button.addEventListener("click", () => {
    state.crewAllocationMode = button.dataset.crewView;
    render();
  }));
  document.querySelectorAll("[data-chart-mode]").forEach((button) => button.addEventListener("click", () => {
    state.chartMode = button.dataset.chartMode;
    render();
  }));
  document.querySelectorAll("[data-value-mode]").forEach((button) => button.addEventListener("click", () => {
    state.valueMode = button.dataset.valueMode;
    render();
  }));
  document.querySelectorAll("input[data-crew-filter]").forEach((input) => input.addEventListener("change", () => {
    const id = input.dataset.crewFilter;
    if (id === "all") {
      state.selectedCrewTypeIds = ["all"];
      render();
      return;
    }
    const selected = new Set(selectedCrewTypeIds().filter((item) => item !== "all"));
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    state.selectedCrewTypeIds = selected.size ? Array.from(selected) : ["all"];
    render();
  }));
  document.querySelectorAll("[data-toggle-labels]").forEach((button) => button.addEventListener("click", () => {
    state.showDataLabels = !state.showDataLabels;
    render();
  }));
  document.querySelectorAll("[data-field='query']").forEach((input) => input.addEventListener("input", () => {
    state[input.dataset.field] = input.value;
    render();
  }));
  document.querySelectorAll("[data-field='statusFilter'], [data-field='projectAreaFilter'], [data-field='dashboardStartDate'], [data-field='dashboardEndDate'], [data-field='dashboardRangePreset'], [data-field='companyMaxCapacity'], [data-field='dashboardAreaFilter'], [data-field='whatIfCapacity']").forEach((input) => input.addEventListener("change", () => {
    state[input.dataset.field] = input.type === "number" ? Number(input.value || 0) : input.value;
    render();
  }));
  document.querySelectorAll("[data-field='projectTaskStartDate'], [data-field='projectTaskEndDate']").forEach((input) => input.addEventListener("change", () => {
    state[input.dataset.field] = input.value;
    render();
  }));
  document.querySelectorAll("[data-action='clear-project-task-dates']").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    state.projectTaskStartDate = "";
    state.projectTaskEndDate = "";
    render();
  }));
  document.querySelectorAll("[data-action='dashboard-clear-filters'], [data-action='company-clear-filters'], [data-action='project-clear-filters']").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    state.dashboardStartDate = "";
    state.dashboardEndDate = "";
    if (button.dataset.action.startsWith("dashboard")) state.dashboardRangePreset = "next-6";
    state.selectedCrewTypeIds = ["all"];
    state.projectFilterQuery = "";
    state.dashboardAreaFilter = "all";
    if (button.dataset.action.startsWith("dashboard")) state.dashboardProjectIds = visibleProjects().map((project) => project.id);
    if (button.dataset.action.startsWith("company")) state.selectedProjectIds = state.projects.map((project) => project.id);
    render();
  }));
  document.querySelectorAll("[data-action='dashboard-select-all-projects'], [data-action='company-select-all-projects']").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    if (button.dataset.action.startsWith("dashboard")) state.dashboardProjectIds = visibleProjects().map((project) => project.id);
    if (button.dataset.action.startsWith("company")) state.selectedProjectIds = state.projects.map((project) => project.id);
    render();
  }));
  document.querySelectorAll("[data-action='dashboard-clear-projects'], [data-action='company-clear-projects']").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    if (button.dataset.action.startsWith("dashboard")) state.dashboardProjectIds = [];
    if (button.dataset.action.startsWith("company")) state.selectedProjectIds = [];
    render();
  }));
  document.querySelectorAll("[data-project-filter]").forEach((input) => input.addEventListener("change", () => {
    const scope = input.dataset.projectFilterScope;
    const selected = new Set(scope === "dashboard" ? selectedDashboardIds() : state.selectedProjectIds);
    if (input.checked) selected.add(input.dataset.projectFilter);
    else selected.delete(input.dataset.projectFilter);
    if (scope === "dashboard") state.dashboardProjectIds = Array.from(selected);
    if (scope === "company") state.selectedProjectIds = Array.from(selected);
    render();
  }));
  document.querySelectorAll("[data-project-search]").forEach((input) => input.addEventListener("input", () => {
    const scope = input.dataset.projectSearch;
    const term = input.value.trim().toLowerCase();
    const options = Array.from(document.querySelectorAll(`[data-project-option='${scope}']`));
    let visible = 0;
    options.forEach((option) => {
      const match = option.textContent.toLowerCase().includes(term);
      option.hidden = !match;
      if (match) visible += 1;
    });
    const empty = document.querySelector(`[data-project-empty='${scope}']`);
    if (empty) empty.hidden = visible !== 0;
  }));
  document.querySelectorAll("details.filter-dropdown").forEach((details) => details.addEventListener("toggle", () => {
    if (!details.open) return;
    document.querySelectorAll("details.filter-dropdown").forEach((other) => {
      if (other !== details) other.open = false;
    });
  }));
  document.querySelectorAll("[data-project-hours]").forEach((input) => input.addEventListener("change", () => {
    const project = state.projects.find((item) => item.id === input.dataset.projectHours);
    project.dailyHoursPerWorker = Math.max(1, Number(input.value || 1));
    render();
  }));
  document.querySelectorAll("[data-project-rate]").forEach((input) => input.addEventListener("change", () => {
    const project = state.projects.find((item) => item.id === input.dataset.projectRate);
    project.avgHourlyRate = Math.max(1, Number(input.value || 1));
    project.tasks.forEach((task) => {
      if (task.labourHoursSource === "value" && Number(task.totalValue || 0)) {
        task.totalLabourHours = task.totalValue / project.avgHourlyRate;
        task.labourHoursMissing = false;
      }
    });
    render();
  }));
  document.querySelectorAll("[data-schedule-task]").forEach((button) => button.addEventListener("click", () => {
    state.activeScheduleTaskId = button.dataset.scheduleTask;
    render();
  }));
  document.querySelectorAll("[data-project-capacity]").forEach((input) => input.addEventListener("change", () => {
    const project = state.projects.find((item) => item.id === input.dataset.projectCapacity);
    project.maxAvailableWorkers = Math.max(1, Number(input.value || 1));
    render();
  }));
  document.querySelectorAll("[data-crew-task]").forEach((input) => input.addEventListener("change", () => {
    const project = activeVisibleProject();
    if (!project) return;
    const task = project.tasks.find((item) => item.id === input.dataset.crewTask);
    if (!task) return;
    const summary = crewAllocationSummary(project, task);
    const current = Number(task.crewAllocation?.[input.dataset.crewType] || 0);
    const requested = Math.max(0, Number(input.value || 0));
    const maxAllowed = Math.max(0, summary.required - (summary.allocated - current));
    task.crewAllocation[input.dataset.crewType] = Math.min(requested, maxAllowed);
    render();
  }));
  document.querySelectorAll("[data-crew-mode-task]").forEach((select) => select.addEventListener("change", () => {
    const project = activeVisibleProject();
    const task = project?.tasks.find((item) => item.id === select.dataset.crewModeTask);
    if (!task) return;
    task.crewRequirementMode = select.value;
    render();
  }));
  document.querySelectorAll("[data-crew-row]").forEach((row) => row.addEventListener("click", () => {
    state.selectedCrewTaskId = row.dataset.crewRow;
    render();
  }));
  document.querySelectorAll("[data-action='auto-distribute-crew']").forEach((button) => button.addEventListener("click", () => {
    const project = activeVisibleProject();
    const task = project?.tasks.find((item) => item.id === button.dataset.task);
    if (!task || !state.crewTypes.length) return;
    const required = requiredCrewForTask(project, task);
    const perType = required / state.crewTypes.length;
    state.crewTypes.forEach((type) => {
      task.crewAllocation[type.id] = Number(perType.toFixed(2));
    });
    render();
  }));
  document.querySelectorAll("[data-action='copy-previous-crew']").forEach((button) => button.addEventListener("click", () => {
    const project = activeVisibleProject();
    const tasks = orderedProjectTasks(project);
    const index = tasks.findIndex((task) => task.id === button.dataset.task);
    if (index <= 0) return;
    const task = tasks[index];
    task.crewAllocation = { ...(tasks[index - 1].crewAllocation || {}) };
    render();
  }));
  document.querySelectorAll("[data-action='add-crew-type']").forEach((button) => button.addEventListener("click", () => {
    const input = button.closest(".crew-type-manager")?.querySelector("[data-crew-type-name]");
    const label = input?.value;
    if (!label) return;
    const id = slug(label);
    if (state.crewTypes.some((type) => type.id === id)) return;
    state.crewTypes.push({ id, label: label.trim() });
    state.projects.forEach((project) => project.tasks.forEach((task) => {
      task.crewAllocation ||= {};
      task.crewAllocation[id] = Number(task.crewAllocation[id] || 0);
    }));
    render();
  }));
  document.querySelectorAll("[data-action='remove-selected-crew-types']").forEach((button) => button.addEventListener("click", () => {
    const selected = Array.from(document.querySelectorAll("[data-crew-type-remove]:checked")).map((input) => input.dataset.crewTypeRemove);
    if (!selected.length) return;
    state.crewTypes = state.crewTypes.filter((type) => !selected.includes(type.id));
    state.projects.forEach((project) => project.tasks.forEach((task) => {
      selected.forEach((id) => {
        if (task.crewAllocation) delete task.crewAllocation[id];
      });
    }));
    state.selectedCrewTypeIds = normalizeCrewSelection(state.selectedCrewTypeIds, state.crewTypes);
    render();
  }));
  bindTaskDragEvents();
}

function bindModalEvents() {
  document.querySelectorAll("[data-action='close-modal']").forEach((button) => button.addEventListener("click", closeModal));
  document.querySelectorAll("[data-form='project']").forEach((form) => form.addEventListener("submit", saveProjectForm));
  document.querySelectorAll("[data-form='task']").forEach((form) => form.addEventListener("submit", saveTaskForm));
  document.querySelectorAll("[data-import-file]").forEach((input) => input.addEventListener("change", handleScheduleFileUpload));
  document.querySelectorAll("[data-file-drop]").forEach((drop) => {
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("is-dragover");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("is-dragover"));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("is-dragover");
      const file = event.dataTransfer.files?.[0];
      if (file) readScheduleFile(file);
    });
  });
  document.querySelectorAll("[data-import-map]").forEach((select) => select.addEventListener("change", () => {
    scheduleImportDraft.mapping[select.dataset.importMap] = select.value === "" ? "" : Number(select.value);
    renderScheduleImportModal();
  }));
  document.querySelectorAll("[data-action='continue-import']").forEach((button) => button.addEventListener("click", continueScheduleImport));
  document.querySelectorAll("[data-action='back-import']").forEach((button) => button.addEventListener("click", () => {
    scheduleImportDraft.step = 1;
    renderScheduleImportModal();
  }));
  document.querySelectorAll("[data-import-search]").forEach((input) => input.addEventListener("input", () => {
    scheduleImportDraft.search = input.value;
    renderScheduleImportModal();
  }));
  document.querySelectorAll("[data-import-update]").forEach((input) => input.addEventListener("change", () => {
    toggleSetValue(scheduleImportDraft.selectedUpdates, input.dataset.importUpdate, input.checked);
    input.closest("tr")?.classList.toggle("selected", input.checked);
  }));
  document.querySelectorAll("[data-import-new]").forEach((input) => input.addEventListener("change", () => {
    toggleSetValue(scheduleImportDraft.selectedNew, input.dataset.importNew, input.checked);
    input.closest("tr")?.classList.toggle("selected", input.checked);
  }));
  document.querySelectorAll("[data-action='select-all-import']").forEach((button) => button.addEventListener("click", () => {
    const project = state.projects.find((item) => item.id === scheduleImportDraft.projectId);
    const comparison = compareImportedTasks(project, scheduleImportDraft.extracted);
    comparison.changes.forEach((item) => scheduleImportDraft.selectedUpdates.add(item.uploaded.id));
    comparison.newTasks.forEach((item) => scheduleImportDraft.selectedNew.add(item.uploaded.id));
    renderScheduleImportModal();
  }));
  document.querySelectorAll("[data-action='clear-import-selection']").forEach((button) => button.addEventListener("click", () => {
    scheduleImportDraft.selectedUpdates.clear();
    scheduleImportDraft.selectedNew.clear();
    renderScheduleImportModal();
  }));
  document.querySelectorAll("[data-action='skip-updates']").forEach((button) => button.addEventListener("click", () => {
    scheduleImportDraft.selectedUpdates.clear();
    renderScheduleImportModal();
  }));
  document.querySelectorAll("[data-action='finish-import']").forEach((button) => button.addEventListener("click", finishScheduleImport));
  document.querySelectorAll("[data-action='export-skipped-rows']").forEach((button) => button.addEventListener("click", exportSkippedRows));
}

function exportSkippedRows() {
  if (!scheduleImportDraft?.skipped.length) return;
  const rows = [["Row", "Task ID", "Task Name", "Start Date", "End Date"]]
    .concat(scheduleImportDraft.skipped.map((item) => [item.row, item.task.id, item.task.name, item.task.startDate, item.task.endDate]));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "skipped-schedule-rows.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindTaskDragEvents() {
  document.querySelectorAll("[data-task-drag]").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", row.dataset.taskDrag);
      row.classList.add("is-dragging");
    });
    row.addEventListener("dragend", () => row.classList.remove("is-dragging"));
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      row.classList.add("is-drop-target");
    });
    row.addEventListener("dragleave", () => row.classList.remove("is-drop-target"));
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("is-drop-target");
      const sourceId = event.dataTransfer.getData("text/plain");
      const targetId = row.dataset.taskDrag;
      moveTaskInProject(state.activeProjectId, sourceId, targetId);
      render();
    });
  });
}

function moveTaskInProject(projectId, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;
  project.tasks = orderedProjectTasks(project);
  const from = project.tasks.findIndex((task) => task.id === sourceId);
  const to = project.tasks.findIndex((task) => task.id === targetId);
  if (from < 0 || to < 0) return;
  const [task] = project.tasks.splice(from, 1);
  project.tasks.splice(to, 0, task);
  renumberTaskOrder(project);
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
  if (scheduleImportDraft?.step === 3) {
    scheduleImportDraft = null;
    render();
    return;
  }
  scheduleImportDraft = null;
}

function saveProjectForm(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const id = form.get("id") || slug(form.get("name"));
  const project = {
    id,
    name: form.get("name"),
    managerId: form.get("managerId"),
    status: form.get("status"),
    area: form.get("area"),
    cityName: form.get("cityName"),
    startDate: form.get("startDate"),
    endDate: form.get("endDate"),
    dailyHoursPerWorker: Number(form.get("dailyHoursPerWorker")),
    avgHourlyRate: Number(form.get("avgHourlyRate") || 85),
    maxAvailableWorkers: Number(form.get("maxAvailableWorkers")),
    tasks: state.projects.find((item) => item.id === id)?.tasks || [],
    scheduleImports: state.projects.find((item) => item.id === id)?.scheduleImports || []
  };
  const index = state.projects.findIndex((item) => item.id === id);
  if (index >= 0) state.projects[index] = project;
  else state.projects.push(project);
  state.activeProjectId = id;
  state.activeView = "projects";
  closeModal();
  render();
}

function saveTaskForm(event) {
  event.preventDefault();
  const project = state.projects.find((item) => item.id === event.currentTarget.dataset.project);
  const form = new FormData(event.currentTarget);
  const existingTask = project
    ?.tasks.find((item) => item.id === (form.get("originalId") || form.get("id")));
  const totalValue = Number(form.get("totalValue") || 0);
  const labour = labourHoursFromInputs(form.get("totalLabourHours"), totalValue, project.avgHourlyRate);
  const task = {
    id: form.get("id"),
    name: form.get("name"),
    startDate: form.get("startDate"),
    endDate: form.get("endDate"),
    totalValue,
    totalLabourHours: labour.hours,
    labourHoursSource: labour.source,
    notes: form.get("notes"),
    assumptions: form.get("assumptions"),
    documentLink: form.get("documentLink"),
    source: existingTask?.source || "manual",
    lastImportedAt: existingTask?.lastImportedAt || "",
    scheduleImportBatchId: existingTask?.scheduleImportBatchId || "",
    labourHoursMissing: labour.missing,
    crewRequirementMode: existingTask?.crewRequirementMode || "rounded",
    sortOrder: existingTask?.sortOrder || project.tasks.length + 1,
    crewAllocation: existingTask?.crewAllocation || Object.fromEntries(state.crewTypes.map((type) => [type.id, 0]))
  };
  const originalId = form.get("originalId");
  const index = project.tasks.findIndex((item) => item.id === (originalId || task.id));
  if (index >= 0) project.tasks[index] = task;
  else {
    project.tasks.push(task);
    sortAndNumberProjectTasks(project);
  }
  syncProjectDateRange(project);
  closeModal();
  render();
}

function handleScheduleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file || !scheduleImportDraft) return;
  readScheduleFile(file);
}

function readScheduleFile(file) {
  if (!file || !scheduleImportDraft) return;
  scheduleImportDraft.fileName = file.name;
  scheduleImportDraft.error = "";
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const matrix = parseScheduleFile(file, reader.result);
      const cleanRows = matrix.filter((row) => row.some((cell) => String(cell ?? "").trim()));
      const headerIndex = findScheduleHeaderRow(cleanRows);
      scheduleImportDraft.headers = (cleanRows[headerIndex] || []).map((cell, index) => String(cell || `Column ${index + 1}`).trim());
      scheduleImportDraft.rows = cleanRows.slice(headerIndex + 1);
      scheduleImportDraft.mapping = detectImportMapping(scheduleImportDraft.headers);
    } catch (error) {
      scheduleImportDraft.error = error.message || "Could not read this file.";
      scheduleImportDraft.headers = [];
      scheduleImportDraft.rows = [];
      scheduleImportDraft.mapping = {};
    }
    renderScheduleImportModal();
  };
  reader.onerror = () => {
    scheduleImportDraft.error = "Could not read this file.";
    renderScheduleImportModal();
  };
  if (file.name.toLowerCase().endsWith(".csv")) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function parseScheduleFile(file, result) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(String(result || ""));
  if (!window.XLSX) throw new Error("Excel parser is unavailable. Check your connection and try again, or upload CSV.");
  const workbook = XLSX.read(result, { type: "array", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("No worksheet found in this file.");
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, raw: true, defval: "" });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  rows.push(row);
  return rows;
}

function detectImportMapping(headers) {
  return Object.fromEntries(Object.entries(IMPORT_COLUMNS).map(([fieldName, aliases]) => {
    const index = headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
    return [fieldName, index >= 0 ? index : ""];
  }));
}

function findScheduleHeaderRow(rows) {
  let best = 0;
  let bestScore = -1;
  rows.slice(0, 30).forEach((row, index) => {
    const headers = row.map((cell, cellIndex) => String(cell || `Column ${cellIndex + 1}`).trim());
    const mapping = detectImportMapping(headers);
    const score = ["taskId", "name", "startDate", "endDate"].filter((key) => mapping[key] !== "").length;
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

function isMappingComplete(mapping) {
  return ["taskId", "name", "startDate", "endDate"].every((key) => mapping[key] !== "" && mapping[key] !== undefined);
}

function continueScheduleImport() {
  if (!scheduleImportDraft || !isMappingComplete(scheduleImportDraft.mapping)) return;
  const parsed = extractImportedTasks(scheduleImportDraft.rows, scheduleImportDraft.mapping);
  scheduleImportDraft.extracted = parsed.tasks;
  scheduleImportDraft.skipped = parsed.skipped;
  scheduleImportDraft.step = 2;
  const project = state.projects.find((item) => item.id === scheduleImportDraft.projectId);
  const comparison = compareImportedTasks(project, scheduleImportDraft.extracted);
  scheduleImportDraft.selectedUpdates = new Set();
  scheduleImportDraft.selectedNew = new Set(project.tasks.length ? [] : comparison.newTasks.map((item) => item.uploaded.id));
  renderScheduleImportModal();
}

function extractImportedTasks(rows, mapping) {
  const tasks = [];
  const skipped = [];
  const seen = new Set();
  rows.forEach((row, index) => {
    const task = {
      id: String(row[mapping.taskId] ?? "").trim(),
      name: String(row[mapping.name] ?? "").trim(),
      startDate: normalizeImportDate(row[mapping.startDate]),
      endDate: normalizeImportDate(row[mapping.endDate]),
      totalValue: mapping.totalValue === "" || mapping.totalValue === undefined ? 0 : parseImportNumber(row[mapping.totalValue])
    };
    if (!task.id || !task.name || !task.startDate || !task.endDate) {
      skipped.push({ row: index + 2, task });
      return;
    }
    if (seen.has(task.id)) return;
    seen.add(task.id);
    tasks.push(task);
  });
  return { tasks, skipped };
}

function compareImportedTasks(project, importedTasks) {
  const existingById = new Map((project?.tasks || []).map((task) => [task.id, task]));
  const changes = [];
  const newTasks = [];
  const unchanged = [];
  importedTasks.forEach((uploaded) => {
    const existing = existingById.get(uploaded.id);
    if (!existing) {
      newTasks.push({ uploaded });
      return;
    }
    const changed = existing.startDate !== uploaded.startDate || existing.endDate !== uploaded.endDate;
    if (changed) changes.push({ existing, uploaded });
    else unchanged.push({ existing, uploaded });
  });
  return { changes, newTasks, unchanged };
}

function finishScheduleImport() {
  const draft = scheduleImportDraft;
  const project = state.projects.find((item) => item.id === draft?.projectId);
  if (!draft || !project) return;
  const comparison = compareImportedTasks(project, draft.extracted);
  const batchId = `import-${Date.now()}`;
  const importedAt = new Date().toISOString();
  let updated = 0;
  let added = 0;
  comparison.changes.forEach(({ existing, uploaded }) => {
    if (!draft.selectedUpdates.has(uploaded.id)) return;
    existing.name = uploaded.name;
    existing.startDate = uploaded.startDate;
    existing.endDate = uploaded.endDate;
    existing.source = existing.source || "manual";
    existing.lastImportedAt = importedAt;
    existing.scheduleImportBatchId = batchId;
    updated += 1;
  });
  comparison.newTasks.forEach(({ uploaded }) => {
    if (!draft.selectedNew.has(uploaded.id)) return;
    const labour = labourHoursFromInputs("", Number(uploaded.totalValue || 0), project.avgHourlyRate);
    project.tasks.push(normalizeTask({
      id: uploaded.id,
      name: uploaded.name,
      startDate: uploaded.startDate,
      endDate: uploaded.endDate,
      totalValue: Number(uploaded.totalValue || 0),
      totalLabourHours: labour.hours,
      labourHoursSource: labour.source,
      source: "excel_import",
      lastImportedAt: importedAt,
      scheduleImportBatchId: batchId,
      labourHoursMissing: labour.missing,
      crewRequirementMode: "rounded"
    }, state.crewTypes));
    added += 1;
  });
  sortAndNumberProjectTasks(project);
  syncProjectDateRange(project);
  project.scheduleImports ||= [];
  project.scheduleImports.push({
    id: batchId,
    projectId: project.id,
    fileName: draft.fileName,
    uploadedBy: state.user.name,
    uploadedAt: importedAt,
    totalRows: draft.rows.length,
    importedCount: added,
    updatedCount: updated,
    skippedCount: draft.skipped.length,
    status: "complete"
  });
  draft.summary = {
    updated,
    added,
    unchanged: comparison.unchanged.length + comparison.changes.filter((item) => !draft.selectedUpdates.has(item.uploaded.id)).length + comparison.newTasks.filter((item) => !draft.selectedNew.has(item.uploaded.id)).length,
    skipped: draft.skipped.length
  };
  draft.step = 3;
  saveState();
  renderScheduleImportModal(project);
}

function importMatchesSearch(task, term) {
  if (!term) return true;
  return `${task.id} ${task.name}`.toLowerCase().includes(term);
}

function changeSummary(existing, uploaded) {
  const changes = [];
  if (existing.startDate !== uploaded.startDate || existing.endDate !== uploaded.endDate) changes.push("Date changed");
  if (existing.name !== uploaded.name) changes.push("Name changed");
  return changes.join(", ") || "Unchanged";
}

function toggleSetValue(set, value, checked) {
  if (checked) set.add(value);
  else set.delete(value);
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeImportDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return iso(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Math.round((value - 25569) * DAY_MS));
    return iso(date);
  }
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return iso(parsed);
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return "";
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const first = Number(match[1]);
  const second = Number(match[2]);
  const month = first > 12 ? second : first;
  const day = first > 12 ? first : second;
  return iso(new Date(year, month - 1, day));
}

function parseImportNumber(value) {
  if (typeof value === "number") return value;
  const clean = String(value ?? "").replace(/[$,\s]/g, "");
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
}

function drawCharts() {
  const dashboardCanvas = document.getElementById("dashboard-chart");
  if (dashboardCanvas) drawProjectChart(dashboardCanvas, selectedDashboardProjects(), "dashboard", dashboardDateRange());
  const companyCanvas = document.getElementById("company-chart");
  if (companyCanvas) drawProjectChart(companyCanvas, state.projects.filter((project) => state.selectedProjectIds.includes(project.id)), "company");
  const projectCanvas = document.getElementById("project-chart");
  const project = activeVisibleProject();
  if (projectCanvas && project) drawProjectChart(projectCanvas, [project], "project");
}

function drawProjectChart(canvas, projects, variant, range = {}) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = rect.width * scale;
  canvas.height = Number(canvas.getAttribute("height")) * scale;
  ctx.scale(scale, scale);
  const width = rect.width;
  const height = Number(canvas.getAttribute("height"));
  const pad = { left: 52, right: 18, top: 22, bottom: 44 };
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  const series = chartSeries(projects, variant, range);
  const labels = Array.from(new Set(series.flatMap((item) => item.points.map((point) => point.label))));
  const labelSort = new Map();
  series.forEach((item) => item.points.forEach((point) => labelSort.set(point.label, point.sort)));
  labels.sort((a, b) => String(labelSort.get(a)).localeCompare(String(labelSort.get(b))));
  const valuesBySeries = series.map((item) => labels.map((label) => item.points.find((point) => point.label === label)?.value || 0));
  const totals = labels.map((_, index) => valuesBySeries.reduce((sum, values) => sum + values[index], 0));
  const capacity = state.valueMode === "manpower" ? capacityForProjects(projects) : 0;
  const max = Math.max(8, capacity, ...(state.chartMode === "stacked" ? totals : valuesBySeries.flat()), ...(state.chartMode === "combined" ? totals : []));
  drawGrid(ctx, width, height, pad, max);
  if (labels.length === 0) {
    drawEmptyChart(ctx, width, height);
    return;
  }
  const x = (index) => pad.left + (labels.length === 1 ? (width - pad.left - pad.right) / 2 : index * ((width - pad.left - pad.right) / (labels.length - 1)));
  const y = (value) => height - pad.bottom - (value / max) * (height - pad.top - pad.bottom);
  if (capacity) drawOverCapacityZones(ctx, totals, labels, x, y, capacity, height, pad);
  if (state.chartMode === "stacked") {
    const running = labels.map(() => 0);
    valuesBySeries.forEach((values, seriesIndex) => {
      const top = values.map((value, index) => running[index] + value);
      drawArea(ctx, top.map((value, index) => [x(index), y(value)]), running.map((value, index) => [x(index), y(value)]), series[seriesIndex].color);
      values.forEach((value, index) => running[index] += value);
    });
  } else {
    valuesBySeries.forEach((values, seriesIndex) => drawLine(ctx, values.map((value, index) => [x(index), y(value)]), series[seriesIndex].color));
    drawLine(ctx, totals.map((value, index) => [x(index), y(value)]), "#111827", 3);
    drawLineLabels(ctx, series, valuesBySeries, totals, x, y, labels.length);
  }
  if (capacity) drawCapacityLine(ctx, width, y(capacity), pad, capacity);
  drawPeakMarker(ctx, totals, labels, x, y);
  if (state.showDataLabels) drawDataLabels(ctx, totals, labels, x, y, capacity, max);
  drawLabels(ctx, labels, width, height, pad);
  attachTooltip(canvas, labels, series, totals, pad);
}

function chartSeries(projects, variant, range = {}) {
  if (variant === "project" && projects[0]) {
    return projects[0].tasks.map((task, index) => ({
      name: `${task.id} ${task.name}`,
      color: palette[index % palette.length],
      points: aggregateTask(task, projects[0].dailyHoursPerWorker, state.granularity, state.valueMode, range)
    }));
  }
  return projects.map((project, index) => ({
    name: project.name,
    color: palette[index % palette.length],
    points: aggregateProject(project, state.granularity, state.valueMode, range)
  }));
}

function drawGrid(ctx, width, height, pad, max) {
  ctx.strokeStyle = "#E5EAF1";
  ctx.fillStyle = "#64748B";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const value = (max / 4) * i;
    const y = height - pad.bottom - (i / 4) * (height - pad.top - pad.bottom);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(formatNumber(value, 0), 10, y + 4);
  }
}

function drawLine(ctx, points, color, lineWidth = 2.5) {
  if (!points.length) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function drawLineLabels(ctx, series, valuesBySeries, totals, x, y, count) {
  if (!count) return;
  const index = count - 1;
  ctx.save();
  ctx.font = "11px Inter, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.fillText("Total", x(index) + 8, y(totals[index] || 0) - 6);
  valuesBySeries.forEach((values, seriesIndex) => {
    if (!values[index]) return;
    ctx.fillStyle = series[seriesIndex].color;
    ctx.fillText(series[seriesIndex].name.slice(0, 18), x(index) + 8, y(values[index]) + 12 + (seriesIndex % 3) * 12);
  });
  ctx.restore();
}

function drawArea(ctx, top, bottom, color) {
  if (!top.length) return;
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = color;
  ctx.beginPath();
  top.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  bottom.slice().reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCapacityLine(ctx, width, y, pad, capacity) {
  ctx.save();
  ctx.strokeStyle = "#DC2626";
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad.left, y);
  ctx.lineTo(width - pad.right, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#DC2626";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillText(`Maximum Available Workforce: ${formatNumber(capacity, 0)}`, pad.left + 8, Math.max(14, y - 8));
  ctx.restore();
}

function drawOverCapacityZones(ctx, totals, labels, x, y, capacity, height, pad) {
  ctx.save();
  ctx.fillStyle = "rgba(220, 38, 38, 0.08)";
  totals.forEach((total, index) => {
    if (total <= capacity) return;
    const prev = index > 0 ? x(index - 1) : x(index);
    const next = index < labels.length - 1 ? x(index + 1) : x(index);
    const left = labels.length === 1 ? pad.left : (prev + x(index)) / 2;
    const right = labels.length === 1 ? x(index) + 20 : (next + x(index)) / 2;
    ctx.fillRect(left, pad.top, Math.max(10, right - left), height - pad.top - pad.bottom);
  });
  ctx.restore();
}

function drawPeakMarker(ctx, totals, labels, x, y) {
  if (!totals.length) return;
  const peakValue = Math.max(...totals);
  const index = totals.indexOf(peakValue);
  ctx.save();
  ctx.fillStyle = "#D97706";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x(index), y(peakValue), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#92400E";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillText(`Peak ${formatNumber(peakValue, 1)}`, Math.min(x(index) + 10, x(index) - 70), Math.max(18, y(peakValue) - 10));
  ctx.restore();
}

function drawDataLabels(ctx, totals, labels, x, y, capacity, max) {
  if (!totals.length) return;
  ctx.save();
  ctx.fillStyle = "#475569";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  const step = labels.length > 18 ? 2 : 1;
  totals.forEach((total, index) => {
    if (index % step !== 0) return;
    const offset = Math.max(10, max * 0.012);
    const labelY = Math.max(16, y(total + offset));
    const value = state.valueMode === "hours" ? formatNumber(total, 0) : formatNumber(total, 2);
    ctx.fillText(value, x(index), labelY);
  });
  ctx.restore();
}

function drawLabels(ctx, labels, width, height, pad) {
  ctx.fillStyle = "#64748B";
  ctx.font = "12px Inter, system-ui, sans-serif";
  const step = Math.max(1, Math.ceil(labels.length / 7));
  labels.forEach((label, index) => {
    if (index % step !== 0 && index !== labels.length - 1) return;
    const x = pad.left + (labels.length === 1 ? (width - pad.left - pad.right) / 2 : index * ((width - pad.left - pad.right) / (labels.length - 1)));
    ctx.fillText(label, Math.min(width - 70, x - 18), height - 16);
  });
}

function drawEmptyChart(ctx, width, height) {
  ctx.fillStyle = "#64748B";
  ctx.font = "14px Inter, system-ui, sans-serif";
  ctx.fillText("Add tasks to build the labour curve.", width / 2 - 105, height / 2);
}

function attachTooltip(canvas, labels, series, totals, pad) {
  const tooltip = getTooltip();
  canvas.onmousemove = (event) => {
    const rect = canvas.getBoundingClientRect();
    const index = Math.round(((event.clientX - rect.left - pad.left) / Math.max(1, rect.width - pad.left - pad.right)) * (labels.length - 1));
    if (index < 0 || index >= labels.length) {
      tooltip.classList.remove("show");
      return;
    }
    const unit = state.valueMode === "hours" ? "hrs" : "workers";
    const rows = series.map((item) => {
      const value = item.points.find((point) => point.label === labels[index])?.value || 0;
      return `<div><i style="background:${item.color}"></i><span>${escapeHtml(item.name)}</span><strong>${formatNumber(value, 2)} ${unit}</strong></div>`;
    }).join("");
    tooltip.innerHTML = `<b>${labels[index]}</b><div><i style="background:#111827"></i><span>Total</span><strong>${formatNumber(totals[index], 2)} ${unit}</strong></div>${rows}`;
    tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - 340, event.clientX + 14))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(window.innerHeight - 220, event.clientY + 14))}px`;
    tooltip.classList.add("show");
  };
  canvas.onmouseleave = () => tooltip.classList.remove("show");
}

function getTooltip() {
  let tooltip = document.getElementById("chart-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "chart-tooltip";
    tooltip.className = "chart-tooltip";
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function aggregateProject(project, granularity, valueMode, range = {}) {
  return aggregateDailySeries(project.tasks, project.dailyHoursPerWorker, granularity, valueMode, range);
}

function aggregateTask(task, dailyHoursPerWorker, granularity, valueMode, range = {}) {
  return aggregateDailySeries([task], dailyHoursPerWorker, granularity, valueMode, range);
}

function aggregateDailySeries(tasks, dailyHoursPerWorker, granularity, valueMode, range = {}) {
  const dailyTotals = new Map();
  tasks.forEach((task) => {
    const taskDays = taskDurationDates(task);
    const days = filterDatesByRange(taskDays, range);
    const durationDays = Math.max(1, taskDays.length);
    const dailyHours = task.totalLabourHours / durationDays;
    const dailyManpower = taskAverageManpower(task, dailyHoursPerWorker);
    const filtered = filteredCrewDemand(task, dailyHours, dailyManpower);
    days.forEach((date) => {
      const key = iso(date);
      const current = dailyTotals.get(key) || { date, hours: 0, manpower: 0 };
      current.hours += filtered.hours;
      current.manpower += filtered.manpower;
      dailyTotals.set(key, current);
    });
  });
  const buckets = new Map();
  dailyTotals.forEach((day) => {
    const key = bucketKey(day.date, granularity);
    const current = buckets.get(key) || { label: bucketLabel(day.date, granularity), hours: 0, manpower: 0, sort: key };
    current.hours += day.hours;
    current.manpower = Math.max(current.manpower, day.manpower);
    buckets.set(key, current);
  });
  return Array.from(buckets.values())
    .map((bucket) => ({
      label: bucket.label,
      sort: bucket.sort,
      value: valueMode === "hours" ? bucket.hours : bucket.manpower
    }))
    .sort((a, b) => a.sort.localeCompare(b.sort));
}

function summarizeProjects(projects, granularity, valueMode, range = {}) {
  const totals = new Map();
  projects.forEach((project) => aggregateProject(project, granularity, valueMode, range).forEach((point) => {
    totals.set(point.label, (totals.get(point.label) || 0) + point.value);
  }));
  let peak = 0;
  let peakLabel = "";
  totals.forEach((value, label) => {
    if (value > peak) {
      peak = value;
      peakLabel = label;
    }
  });
  return { peak, peakLabel };
}

function workforceAnalysis(projects, granularity, range = {}) {
  const capacity = capacityForProjects(projects);
  const periods = periodTotals(projects, granularity, "manpower", range);
  const overCapacity = periods.filter((period) => period.value > capacity);
  const peaks = periods
    .map((period) => ({
      ...period,
      rounded: Math.ceil(period.value),
      contributors: projectContributors(projects, granularity, "manpower", range, period.label)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const peakExact = peaks[0]?.value || 0;
  const riskLevel = overCapacity.length ? "Red" : peakExact > capacity * 0.85 ? "Yellow" : "Green";
  return {
    capacity,
    peakExact,
    peakLabel: peaks[0]?.label || "",
    overCapacityPeriods: overCapacity.length,
    riskLevel,
    peaks,
    insights: buildInsights(projects, capacity, overCapacity, peaks, granularity, range)
  };
}

function periodTotals(projects, granularity, valueMode, range = {}) {
  const totals = new Map();
  projects.forEach((project) => aggregateProject(project, granularity, valueMode, range).forEach((point) => {
    const current = totals.get(point.label) || { label: point.label, sort: point.sort, value: 0 };
    current.value += point.value;
    totals.set(point.label, current);
  }));
  return Array.from(totals.values()).sort((a, b) => a.sort.localeCompare(b.sort));
}

function projectContributors(projects, granularity, valueMode, range, label) {
  return projects
    .map((project) => {
      const point = aggregateProject(project, granularity, valueMode, range).find((item) => item.label === label);
      return { name: project.name, value: point?.value || 0 };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function capacityForProjects(projects) {
  if (state.role === "vp" && state.companyMaxCapacity) return Number(state.companyMaxCapacity);
  return projects.reduce((sum, project) => sum + Number(project.maxAvailableWorkers || 0), 0);
}

function buildInsights(projects, capacity, overCapacity, peaks, granularity, range) {
  const insights = [];
  const peak = peaks[0];
  if (peak) {
    const names = peak.contributors.slice(0, 2).map((item) => item.name).join(" + ");
    insights.push({
      tone: peak.value > capacity ? "danger" : "warning",
      title: "Peak Demand",
      text: `Peak on ${peak.label} needs ${formatNumber(peak.value, 2)} workers (${Math.ceil(peak.value)} rounded), driven by ${names || "selected work"}.`
    });
  }
  if (overCapacity.length) {
    insights.push({
      tone: "danger",
      title: "Capacity Risk",
      text: `${overCapacity.length} ${granularity} period${overCapacity.length === 1 ? "" : "s"} exceed available workforce. Review task timing before committing crew.`
    });
  }
  const overlapping = peaks.find((item) => item.contributors.length >= 3);
  if (overlapping) {
    insights.push({
      tone: "warning",
      title: "Project Overlap",
      text: `${overlapping.contributors.length} active projects overlap on ${overlapping.label}, creating a manpower spike.`
    });
  }
  const projectRisks = projects.map((project) => {
    const projectCapacity = Number(project.maxAvailableWorkers || 0);
    const count = aggregateProject(project, granularity, "manpower", range).filter((point) => point.value > projectCapacity).length;
    return { project, count };
  }).filter((item) => item.count > 0);
  if (projectRisks[0]) {
    insights.push({
      tone: "danger",
      title: "Project Capacity",
      text: `${projectRisks[0].project.name} exceeds its capacity for ${projectRisks[0].count} ${granularity} period${projectRisks[0].count === 1 ? "" : "s"}.`
    });
  }
  if (!insights.length) {
    insights.push({ tone: "good", title: "Capacity Healthy", text: "No capacity issues found in the current filter." });
  }
  return insights.slice(0, 4);
}

function topPeaks(projects, granularity, valueMode, range = {}) {
  const totals = new Map();
  projects.forEach((project) => aggregateProject(project, granularity, valueMode, range).forEach((point) => {
    totals.set(point.label, (totals.get(point.label) || 0) + point.value);
  }));
  return Array.from(totals.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
}

function nextThreeWeekPeaks(projects) {
  const start = new Date();
  return [0, 1, 2].map((weekIndex) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + weekIndex * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
      startLabel: weekStart.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      endLabel: weekEnd.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      peak: highestPeakForRange(projects, weekStart, weekEnd)
    };
  });
}

function highestPeakForRange(projects, start, end) {
  const effectiveRange = {
    startDate: iso(start),
    endDate: iso(end)
  };
  const totals = new Map();
  projects.forEach((project) => {
    aggregateProject(project, "day", "manpower", effectiveRange).forEach((point) => {
      const current = totals.get(point.sort) || { label: point.label, sort: point.sort, value: 0 };
      current.value += point.value;
      totals.set(point.sort, current);
    });
  });
  return Array.from(totals.values()).sort((a, b) => b.value - a.value)[0] || null;
}

function currentWeekManpower(projects) {
  const current = bucketLabel(new Date(), "week");
  return projects.reduce((sum, project) => {
    const point = aggregateProject(project, "week", "manpower").find((item) => item.label === current);
    return sum + (point?.value || 0);
  }, 0);
}

function projectTotalHours(project) {
  return project.tasks.reduce((sum, task) => sum + Number(task.totalLabourHours || 0), 0);
}

function labourHoursFromInputs(hoursInput, totalValue, avgHourlyRate) {
  const manual = Number(hoursInput || 0);
  if (manual > 0) return { hours: manual, source: "manual", missing: false };
  const value = Number(totalValue || 0);
  const rate = Math.max(1, Number(avgHourlyRate || 1));
  if (value > 0) return { hours: value / rate, source: "value", missing: false };
  return { hours: 0, source: "manual", missing: true };
}

function syncProjectDateRange(project) {
  const tasks = project.tasks || [];
  if (!tasks.length) return;
  project.startDate = minDate(tasks.map((task) => task.startDate));
  project.endDate = maxDate(tasks.map((task) => task.endDate));
}

function sortTasksByStartDate(tasks) {
  return [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate) || a.id.localeCompare(b.id));
}

function sortAndNumberProjectTasks(project) {
  project.tasks = sortTasksByStartDate(project.tasks || []);
  renumberTaskOrder(project);
}

function renumberTaskOrder(project) {
  project.tasks.forEach((task, index) => {
    task.sortOrder = index + 1;
  });
}

function taskOverlapsRange(task, range = {}) {
  const start = range.startDate ? parseDate(range.startDate).getTime() : -Infinity;
  const end = range.endDate ? parseDate(range.endDate).getTime() : Infinity;
  return parseDate(task.endDate).getTime() >= start && parseDate(task.startDate).getTime() <= end;
}

function taskAverageManpower(task, dailyHoursPerWorker) {
  const days = taskDurationDates(task).length;
  return (Number(task.totalLabourHours || 0) / Math.max(1, days)) / Math.max(1, dailyHoursPerWorker);
}

function requiredCrewForTask(project, task) {
  const exact = taskAverageManpower(task, project.dailyHoursPerWorker);
  return task.crewRequirementMode === "exact" ? exact : Math.ceil(exact);
}

function filteredCrewDemand(task, dailyHours, dailyManpower) {
  if (isAllCrewTypesSelected()) {
    return { hours: dailyHours, manpower: dailyManpower };
  }
  const required = Math.max(1, task.crewRequirementMode === "exact" ? dailyManpower : Math.ceil(dailyManpower));
  const selected = selectedCrewTypeIds().reduce((sum, id) => sum + Number(task.crewAllocation?.[id] || 0), 0);
  const ratio = selected / required;
  return {
    hours: dailyHours * ratio,
    manpower: selected
  };
}

function taskSeverity(project, task) {
  const exact = taskAverageManpower(task, project.dailyHoursPerWorker);
  const rounded = Math.ceil(exact);
  if (rounded > Number(project.maxAvailableWorkers || 0)) return "danger";
  if (rounded > Number(project.maxAvailableWorkers || 0) * 0.55 || exact >= 8) return "warning";
  return "normal";
}

function severityLabel(severity) {
  return severity === "danger" ? "Over Capacity" : severity === "warning" ? "High Manpower" : "Normal Load";
}

function crewAllocationSummary(project, task) {
  const required = requiredCrewForTask(project, task);
  const mode = task.crewRequirementMode || "rounded";
  const allocation = { ...(task.crewAllocation || {}) };
  state.crewTypes.forEach((type) => {
    allocation[type.id] = Number(allocation[type.id] || 0);
  });
  const allocated = state.crewTypes.reduce((sum, type) => sum + Number(allocation[type.id] || 0), 0);
  const remaining = required - allocated;
  if (allocated > required) {
    return {
      required,
      mode,
      allocation,
      allocated,
      remaining,
      status: "Over Allocated",
      statusClass: "at-risk",
      statusTone: "is-danger",
      warning: "Allocated crew exceeds required crew for this task."
    };
  }
  if (allocated < required) {
    return {
      required,
      mode,
      allocation,
      allocated,
      remaining,
      status: "Under Allocated",
      statusClass: "planning",
      statusTone: "is-warning",
      warning: `${remaining} crew still need allocation.`
    };
  }
  return {
    required,
    mode,
    allocation,
    allocated,
    remaining: 0,
    status: "Balanced",
    statusClass: "active",
    statusTone: "is-balanced",
    warning: ""
  };
}

function scheduleTimeline(project, granularity, tasks = project.tasks) {
  const startValue = tasks.length ? minDate(tasks.map((task) => task.startDate)) : project.startDate;
  const endValue = tasks.length ? maxDate(tasks.map((task) => task.endDate)) : project.endDate;
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  const periods = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    periods.push({
      key: schedulePeriodKey(cursor, granularity),
      label: schedulePeriodLabel(cursor, granularity),
      start: schedulePeriodStart(cursor, granularity),
      end: schedulePeriodEnd(cursor, granularity)
    });
    advanceScheduleCursor(cursor, granularity);
  }
  return {
    periods,
    columnWidth: granularity === "day" ? 58 : granularity === "week" ? 78 : 110,
    granularity
  };
}

function taskPlacement(task, timeline) {
  const start = parseDate(task.startDate);
  const end = parseDate(task.endDate);
  const startIndex = Math.max(0, timeline.periods.findIndex((period) => end >= period.start && start <= period.end));
  let endIndex = timeline.periods.findIndex((period) => end >= period.start && end <= period.end);
  if (endIndex < 0) endIndex = timeline.periods.length - 1;
  return {
    left: startIndex * timeline.columnWidth + 6,
    width: Math.max(32, ((endIndex - startIndex + 1) * timeline.columnWidth) - 12)
  };
}

function schedulePeriodStart(date, granularity) {
  const next = new Date(date);
  if (granularity === "day") return next;
  if (granularity === "week") {
    next.setDate(next.getDate() - next.getDay() + 1);
    return next;
  }
  return new Date(next.getFullYear(), next.getMonth(), 1);
}

function schedulePeriodEnd(date, granularity) {
  const start = schedulePeriodStart(date, granularity);
  if (granularity === "day") return start;
  if (granularity === "week") {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }
  return new Date(start.getFullYear(), start.getMonth() + 1, 0);
}

function schedulePeriodKey(date, granularity) {
  return `${granularity}-${bucketKey(date, granularity === "month" ? "month" : granularity === "week" ? "week" : "day")}`;
}

function schedulePeriodLabel(date, granularity) {
  if (granularity === "day") return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  if (granularity === "week") return `Wk ${schedulePeriodStart(date, "week").toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
  return date.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
}

function advanceScheduleCursor(cursor, granularity) {
  if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
  else if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
  else cursor.setMonth(cursor.getMonth() + 1, 1);
}

function taskDurationDates(task) {
  const workingDates = dateRange(task.startDate, task.endDate).filter((date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  });
  return workingDates.length ? workingDates : dateRange(task.startDate, task.endDate);
}

function dateRange(start, end) {
  const dates = [];
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  for (let time = startDate.getTime(); time <= endDate.getTime(); time += DAY_MS) dates.push(new Date(time));
  return dates.length ? dates : [startDate];
}

function filterDatesByRange(dates, range = {}) {
  const start = range.startDate ? parseDate(range.startDate).getTime() : -Infinity;
  const end = range.endDate ? parseDate(range.endDate).getTime() : Infinity;
  return dates.filter((date) => date.getTime() >= start && date.getTime() <= end);
}

function parseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function bucketKey(date, granularity) {
  const year = date.getFullYear();
  if (granularity === "day") return iso(date);
  if (granularity === "month") return `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (granularity === "year") return String(year);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay() + 1);
  return iso(weekStart);
}

function bucketLabel(date, granularity) {
  if (granularity === "day") return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  if (granularity === "month") return date.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
  if (granularity === "year") return String(date.getFullYear());
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay() + 1);
  return `Wk ${weekStart.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
}

function minDate(dates) {
  return dates.sort()[0];
}

function maxDate(dates) {
  return dates.sort()[dates.length - 1];
}

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function today(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return iso(date);
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-CA", { maximumFractionDigits: digits, minimumFractionDigits: digits && value % 1 ? 1 : 0 });
}

function currency(value) {
  return Number(value || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char]));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `project-${Date.now()}`;
}

function icon(name) {
  const icons = {
    grid: `<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>`,
    folder: `<svg viewBox="0 0 24 24"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8A3.5 3.5 0 0 1 17.5 20h-11A3.5 3.5 0 0 1 3 16.5z"/></svg>`,
    chart: `<svg viewBox="0 0 24 24"><path d="M4 19h16v2H4zM6 10h3v7H6zM11 4h3v13h-3zM16 7h3v10h-3z"/></svg>`,
    plus: `<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>`,
    panel: `<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zm5 2H6v10h3zm2 0v10h7V7z"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24"><path d="M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.3L13 11h8V3z"/></svg>`,
    edit: `<svg viewBox="0 0 24 24"><path d="M4 17.5V20h2.5L17.1 9.4l-2.5-2.5zM18 8.5 15.5 6l1.2-1.2a1.7 1.7 0 0 1 2.4 0l.1.1a1.7 1.7 0 0 1 0 2.4z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24"><path d="M7 21a2 2 0 0 1-2-2V8h14v11a2 2 0 0 1-2 2zM9 4h6l1 2h4v2H4V6h4z"/></svg>`,
    upload: `<svg viewBox="0 0 24 24"><path d="M11 4h2v8l3.2-3.2 1.4 1.4L12 15.8l-5.6-5.6 1.4-1.4L11 12zM5 18h14v2H5z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4zm12.6 1.4L6.4 19 5 17.6 17.6 5z"/></svg>`,
    drag: `<svg viewBox="0 0 24 24"><path d="M8 5h2v2H8zm6 0h2v2h-2zM8 11h2v2H8zm6 0h2v2h-2zM8 17h2v2H8zm6 0h2v2h-2z"/></svg>`
  };
  return icons[name] || "";
}

window.addEventListener("resize", () => drawCharts());
render();
