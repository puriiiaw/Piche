"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type CSSProperties } from "react";
import { toast } from "sonner";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, ChevronDown, ChevronUp, Download, Edit, FileUp, Plus, Square, Trash2, Upload, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { projectAreas } from "@/lib/constants";
import { visibleProjectsForState } from "@/lib/access";
import { formatDate } from "@/lib/dates";
import { formatCurrency, formatNumber } from "@/lib/format";
import { dashboardRange, ganttPeriods, projectTotalHours, taskAverageCrew, taskPlacement, taskRoundedCrew, taskSeverity, taskWorkingDays } from "@/lib/labour";
import { useAppStore } from "@/lib/store";
import type { Project, Task } from "@/lib/types";
import { autoGranularity, estimatePageCount, exportSchedulePDF, type ScheduleGranularity, type ScheduleOrientation } from "@/lib/export/schedule-pdf";
import { ProjectDialog } from "@/components/project-dialog";
import { TaskDialog } from "@/components/task-dialog";
import { ImportWizard } from "@/components/views/project/import-wizard";
import { StatusBadge } from "@/components/ui/status-badge";

type LabourCurvePayload = {
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
  nextThreeWeeks: { startLabel: string; endLabel: string; peakCrew: number }[];
};

type LabourCurveHook = { data: LabourCurvePayload | null; loading: boolean; error: string };

type ActualHoursRecord = {
  id: string;
  month: string;
  totalHours: number;
  uploadedAt: string;
  uploadedBy: string;
  originalFilename: string;
  rowCount: number;
};

type ActualsApiResponse = {
  actuals: ActualHoursRecord[];
  planned: { month: string; totalHours: number }[];
};

export function ProjectsView() {
  const state = useAppStore();
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const visibleProjects = visibleProjectsForState(state);
  const filtered = visibleProjects.filter((project) => {
    const matchesSearch = `${project.name} ${project.area} ${project.cityName} ${state.managers.find((manager) => manager.id === project.managerId)?.name}`.toLowerCase().includes(state.query.toLowerCase());
    const matchesStatus = state.statusFilter === "all" || project.status === state.statusFilter;
    const matchesArea = state.areaFilter === "all" || project.area === state.areaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });
  const activeProject = visibleProjects.find((project) => project.id === state.activeProjectId) || filtered[0] || visibleProjects[0];

  return (
    <>
      <section className="card p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-piche-ink">Projects</h2>
            <p className="text-piche-muted">{state.role === "admin" ? "Admin can see and manage all projects" : state.role === "vp" ? "All company projects" : "Projects assigned to this PM"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input className="input" placeholder="Search project, manager, area, city" value={state.query} onChange={(event) => state.setField("query", event.target.value)} />
            <select className="input" value={state.statusFilter} onChange={(event) => state.setField("statusFilter", event.target.value as never)}>
              <option value="all">All status</option>
              <option value="Active">Active</option>
              <option value="At Risk">At Risk</option>
              <option value="Planning">Planning</option>
            </select>
            <select className="input" value={state.areaFilter} onChange={(event) => state.setField("areaFilter", event.target.value)}>
              {["all", ...projectAreas].map((area) => <option key={area} value={area}>{area === "all" ? "All areas" : area}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-auto rounded-app border border-piche-line">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="p-3">Project</th><th className="p-3">Manager</th><th className="p-3">Area</th><th className="p-3">Dates</th><th className="p-3">Hours</th><th className="p-3">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr
                  key={project.id}
                  className={`cursor-pointer border-t border-piche-line hover:bg-slate-50 ${activeProject?.id === project.id ? "bg-piche-gold/10" : ""}`}
                  onClick={() => state.setProject(project.id)}
                >
                  <td className="p-3"><strong className="text-piche-ink">{project.name}</strong><span className="block text-sm font-medium text-piche-muted">{project.tasks.length} tasks</span></td>
                  <td className="p-3">{state.managers.find((manager) => manager.id === project.managerId)?.name}</td>
                  <td className="p-3">{project.area}<span className="block text-sm text-piche-muted">{project.cityName}</span></td>
                  <td className="p-3">{formatDate(project.startDate)} - {formatDate(project.endDate)}</td>
                  <td className="p-3">{formatNumber(projectTotalHours(project))}</td>
                  <td className="p-3"><StatusBadge status={project.status} /></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className="grid h-9 w-9 place-items-center rounded-app border border-piche-line" onClick={(event) => { event.stopPropagation(); setEditingProject(project); }} title="Edit project"><Edit size={16} /></button>
                      <button className="grid h-9 w-9 place-items-center rounded-app border border-piche-line text-red-700" onClick={(event) => { event.stopPropagation(); setConfirmDeleteId(project.id); }} title="Delete project"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {activeProject ? <ProjectDetail project={activeProject} /> : null}
      <ProjectDialog open={Boolean(editingProject)} onOpenChange={(open) => !open && setEditingProject(undefined)} project={editingProject} />
      {confirmDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 max-[640px]:items-end">
          <div className="card w-full max-w-sm p-6 max-[640px]:rounded-b-none">
            <h2 className="text-xl font-black text-piche-ink">Delete project?</h2>
            <p className="mt-2 text-piche-muted">This will permanently remove the project and all its tasks. This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button
                className="btn-primary bg-red-700 hover:bg-red-800"
                onClick={async () => {
                  const id = confirmDeleteId;
                  setConfirmDeleteId(null);
                  await fetch(`/api/projects/${id}`, { method: "DELETE" });
                  state.deleteProject(id);
                }}
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

type TaskFilter = { search: string; startDate: string; endDate: string };

function applyTaskFilter(tasks: Task[], filter: TaskFilter): Task[] {
  return tasks.filter((task) => {
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!`${task.id} ${task.name}`.toLowerCase().includes(q)) return false;
    }
    if (filter.startDate && task.endDate < filter.startDate) return false;
    if (filter.endDate && task.startDate > filter.endDate) return false;
    return true;
  });
}

function ProjectDetail({ project }: { project: Project }) {
  const state = useAppStore();
  const updateProject = useAppStore((entry) => entry.updateProject);
  const labourHours = useMemo(() => projectTotalHours(project), [project]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({ search: "", startDate: "", endDate: "" });
  const filteredTasks = useMemo(() => applyTaskFilter(project.tasks, taskFilter), [project.tasks, taskFilter]);

  // Lift curve data so stat cards can show real values
  const range = useMemo(() => dashboardRange("full"), []);
  const curveUrl = useMemo(() => {
    const params = new URLSearchParams({
      granularity: state.granularity,
      valueMode: "crew",
      window: "full",
      startDate: range.startDate || "",
      endDate: range.endDate || "",
      crewTypeIds: state.selectedCrewTypeIds.join(","),
      capacity: String(project.maxAvailableWorkers)
    });
    return `/api/projects/${project.id}/labour-curve?${params.toString()}`;
  }, [project.id, project.maxAvailableWorkers, range.startDate, range.endDate, state.granularity, state.selectedCrewTypeIds]);
  const curve = useLabourCurve(curveUrl);
  const analysis = curve.data?.analysis;

  // ── Planned vs Actual state ───────────────────────────────────────────────
  const [actualsData, setActualsData] = useState<ActualsApiResponse | null>(null);
  const refreshActuals = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/actual-hours`);
      if (res.ok) setActualsData(await res.json());
    } catch { /* silent */ }
  }, [project.id]);
  useEffect(() => { refreshActuals(); }, [refreshActuals]);

  return (
    <section className="card grid gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-piche-line pb-5">
        <div>
          <p className="eyebrow">Project Detail</p>
          <h2 className="text-3xl font-black text-piche-ink">{project.name}</h2>
          <p className="mt-1 text-piche-muted">{formatDate(project.startDate)} to {formatDate(project.endDate)} - {project.area}, {project.cityName}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
          <label className="field rounded-app border border-piche-line bg-slate-50 p-3">Hours / Worker<input type="number" value={project.dailyHoursPerWorker} onChange={(event) => updateProject(project.id, { dailyHoursPerWorker: Number(event.target.value) })} onBlur={(event) => fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dailyHoursPerWorker: Number(event.target.value) }) })} /></label>
          <label className="field rounded-app border border-piche-line bg-slate-50 p-3">Avg Rate<input type="number" value={project.avgHourlyRate} onChange={(event) => updateProject(project.id, { avgHourlyRate: Number(event.target.value) })} onBlur={(event) => fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avgHourlyRate: Number(event.target.value) }) })} /></label>
          <label className="field rounded-app border border-piche-line bg-slate-50 p-3">Max Workers<input type="number" value={project.maxAvailableWorkers} onChange={(event) => updateProject(project.id, { maxAvailableWorkers: Number(event.target.value) })} onBlur={(event) => fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxAvailableWorkers: Number(event.target.value) }) })} /></label>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-2">
        <MiniKpi label="Labour Hours" value={formatNumber(labourHours)} />
        <MiniKpi
          label="Peak Crew"
          value={analysis ? `${formatNumber(analysis.peakExact, 2)} / ${Math.ceil(analysis.peakExact)}` : "—"}
          loading={curve.loading && !curve.data}
        />
        <MiniKpi
          label="Over Capacity"
          value={analysis ? `${analysis.overCapacityPeriods} period(s)` : "—"}
          loading={curve.loading && !curve.data}
        />
        <MiniKpi label="Status" value={project.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["overview", "tasks", "schedule", "crew", "imports"] as const).map((tab) => (
          <button key={tab} className={`min-h-11 rounded-app border px-4 font-black capitalize ${state.activeProjectTab === tab ? "border-piche-navy bg-piche-navy text-white" : "border-piche-line bg-slate-50 text-slate-600"}`} onClick={() => state.setProjectTab(tab)}>
            {tab === "crew" ? "Crew Allocation" : tab}
          </button>
        ))}
        {/* Archive tab with count badge */}
        <button
          className={`relative min-h-11 rounded-app border px-4 font-black capitalize ${state.activeProjectTab === "archive" ? "border-piche-navy bg-piche-navy text-white" : "border-piche-line bg-slate-50 text-slate-600"}`}
          onClick={() => state.setProjectTab("archive")}
        >
          Archive
          {project.tasks.filter((t) => t.isCompleted).length > 0 && (
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-black ${state.activeProjectTab === "archive" ? "bg-white/20 text-white" : "bg-piche-gold/20 text-piche-goldDark"}`}>
              {project.tasks.filter((t) => t.isCompleted).length}
            </span>
          )}
        </button>
      </div>

      {state.activeProjectTab !== "overview" && state.activeProjectTab !== "imports" && state.activeProjectTab !== "archive" && (
        <div className="flex flex-wrap items-end gap-3 rounded-app border border-piche-line bg-slate-50 px-4 py-3">
          <label className="field min-w-[180px] flex-1">
            <span>Search tasks</span>
            <input className="input" placeholder="Task ID or name…" value={taskFilter.search} onChange={(e) => setTaskFilter((f) => ({ ...f, search: e.target.value }))} />
          </label>
          <label className="field">
            <span>From</span>
            <input type="date" className="input" value={taskFilter.startDate} onChange={(e) => setTaskFilter((f) => ({ ...f, startDate: e.target.value }))} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" className="input" value={taskFilter.endDate} onChange={(e) => setTaskFilter((f) => ({ ...f, endDate: e.target.value }))} />
          </label>
          {(taskFilter.search || taskFilter.startDate || taskFilter.endDate) && (
            <button className="btn-secondary self-end" onClick={() => setTaskFilter({ search: "", startDate: "", endDate: "" })}>Clear</button>
          )}
          <span className="self-end pb-2 text-sm font-semibold text-piche-muted">{filteredTasks.length} of {project.tasks.length} tasks</span>
        </div>
      )}

      {state.activeProjectTab === "overview" && <OverviewTab project={project} curve={curve} actualsData={actualsData} onUploadSuccess={refreshActuals} />}
      {state.activeProjectTab === "tasks" && <TasksTab project={project} tasks={filteredTasks} />}
      {state.activeProjectTab === "schedule" && <ScheduleTab project={project} tasks={filteredTasks} />}
      {state.activeProjectTab === "crew" && <CrewTab project={project} tasks={filteredTasks} />}
      {state.activeProjectTab === "imports" && <ImportsTab project={project} actualsData={actualsData} onUploadSuccess={refreshActuals} />}
      {state.activeProjectTab === "archive" && <ArchiveTab project={project} />}
    </section>
  );
}

function OverviewTab({ project, curve, actualsData, onUploadSuccess }: {
  project: Project;
  curve: LabourCurveHook;
  actualsData: ActualsApiResponse | null;
  onUploadSuccess: () => Promise<void>;
}) {
  const missing = project.tasks.filter((task) => task.labourHoursMissing).length;
  const analysis = curve.data?.analysis;

  return (
    <div className="grid gap-6">
    <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 max-xl:grid-cols-1">
      <div className="rounded-app border border-piche-line p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-xl font-black">Project Labour Curve</h3><p className="text-sm text-piche-muted">Single-project demand and capacity.</p></div>
        </div>
        <div className="relative h-[320px]">
          {curve.loading && !curve.data ? (
            <div className="grid h-full place-items-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-piche-gold" />
                <p className="text-sm font-semibold text-piche-muted">Computing labour curve…</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve.data?.chartData || []}>
                <CartesianGrid stroke="#e5e7eb" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Area dataKey="Total Demand" stroke="#c7b157" fill="#c7b157" fillOpacity={0.35} isAnimationActive={false} />
                <Line dataKey="Capacity" stroke="#dc2626" strokeDasharray="6 6" isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {curve.loading && curve.data ? <p className="absolute bottom-0 right-0 text-xs font-semibold text-piche-muted">Refreshing…</p> : null}
        </div>
        {curve.error ? <p className="mt-3 text-sm font-semibold text-red-700">{curve.error}</p> : null}
        {(curve.data?.chartData.length || 0) >= maxProjectChartPoints ? (
          <p className="mt-3 text-sm font-semibold text-amber-700">Large schedule: project curve is reduced to {maxProjectChartPoints} points so the browser stays responsive.</p>
        ) : null}
      </div>
      <aside className="grid content-start gap-4 rounded-app border border-piche-line p-5">
        <h3 className="text-xl font-black">Action Required</h3>
        {missing ? <Risk title="Missing labour hours" text={`${missing} task(s) need labour hours or total value.`} danger /> : <Risk title="Labour inputs complete" text="Every task has labour hours or a derived value." />}
        {analysis?.overCapacityPeriods ? <Risk title="Peak crew warning" text={`${analysis.overCapacityPeriods} period(s) exceed ${project.maxAvailableWorkers} workers.`} danger /> : <Risk title="Capacity healthy" text="No project periods exceed the available workforce." />}
      </aside>
    </div>
    <PlannedVsActualSection project={project} actualsData={actualsData} onUploadSuccess={onUploadSuccess} />
    </div>
  );
}

const maxProjectChartPoints = 90;
const largeTaskThreshold = 200;
const initialTaskRows = 120;
const taskRowsIncrement = 120;

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function useLabourCurve(url: string): LabourCurveHook {
  const [data, setData] = useState<LabourCurvePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(url)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load labour curve.");
        return payload as LabourCurvePayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : "Could not load labour curve.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

const pageSizeOptions = [50, 100, 200] as const;

type CompletionUndo = { taskId: string; taskName: string; startedAt: number };

function TasksTab({ project, tasks }: { project: Project; tasks: Task[] }) {
  const state = useAppStore();
  const [taskDialog, setTaskDialog] = useState<Task | null | "new">(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkHours, setBulkHours] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  // Completion undo state
  const [completionUndo, setCompletionUndo] = useState<CompletionUndo | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set()); // visible during undo window
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());   // CSS fade-out
  const [parentConfirm, setParentConfirm] = useState<Task | null>(null); // parent task confirm dialog
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to page 1 when tasks (filter) changes
  useEffect(() => { setCurrentPage(1); }, [tasks]);

  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageTasks = tasks.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isLargeProject = tasks.length > largeTaskThreshold;
  const missingTasks = tasks.filter((t) => t.labourHoursMissing);

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allPageSelected = pageTasks.length > 0 && pageTasks.every((t) => selectedIds.has(t.id));
  const toggleAll = () => setSelectedIds(allPageSelected ? new Set() : new Set(pageTasks.map((t) => t.id)));
  const selectAllMissing = () => setSelectedIds(new Set(missingTasks.map((t) => t.id)));

  const applyBulkHours = async () => {
    const hours = Number(bulkHours);
    if (!hours || hours <= 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((taskId) =>
          fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ totalLabourHours: hours })
          }).then(async (r) => {
            if (r.ok) {
              state.updateTask(project.id, taskId, {
                totalLabourHours: hours,
                labourHoursMissing: false,
                labourHoursSource: "manual"
              });
            }
          })
        )
      );
      setBulkOpen(false);
      setBulkHours("");
      setSelectedIds(new Set());
    } finally {
      setBulkSaving(false);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (event.over?.id && event.active.id !== event.over.id) state.reorderTask(project.id, String(event.active.id), String(event.over.id));
  };

  // ── Task completion ─────────────────────────────────────────────────────────
  const activeTasks = tasks.filter((t) => !t.isCompleted || pendingIds.has(t.id));

  const startCompletionTimer = (taskId: string, taskName: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setCompletionUndo({ taskId, taskName, startedAt: Date.now() });
    undoTimerRef.current = setTimeout(() => {
      // Begin CSS fade-out
      setFadingIds((prev) => new Set([...prev, taskId]));
      setTimeout(() => {
        setPendingIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
        setFadingIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
        setCompletionUndo(null);
      }, 300);
    }, 5000);
  };

  const handleComplete = async (task: Task) => {
    // Parent task: check for sub-tasks
    const subTasks = tasks.filter((t) => !t.isCompleted && t.id !== task.id && (t.id.startsWith(task.id + ".") || t.id.startsWith(task.id + "-")));
    const isParentTask = task.totalLabourHours === 0 && !task.labourHoursMissing;
    if (isParentTask && subTasks.length > 0) {
      setParentConfirm(task);
      return;
    }
    await doComplete(task.id, task.name);
  };

  const doComplete = async (taskId: string, taskName: string, extraIds: string[] = []) => {
    const ids = [taskId, ...extraIds];
    await Promise.all(ids.map((id) =>
      fetch(`/api/projects/${project.id}/tasks/${id}/complete`, { method: "PATCH" })
        .then((r) => {
          if (r.ok) state.completeTask(project.id, id, new Date().toISOString(), "");
        })
    ));
    setPendingIds((prev) => new Set([...prev, ...ids]));
    startCompletionTimer(taskId, taskName);
  };

  const handleUndoComplete = async () => {
    if (!completionUndo) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const { taskId } = completionUndo;
    setCompletionUndo(null);
    setPendingIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    await fetch(`/api/projects/${project.id}/tasks/${taskId}/restore`, { method: "PATCH" });
    state.restoreTask(project.id, taskId);
  };

  // Paginate over active (non-completed) tasks
  const activePageTasks = activeTasks.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {missingTasks.length > 0 && (
            <button className="btn-secondary" onClick={selectAllMissing}>
              <CheckSquare size={15} /> Select {missingTasks.length} missing
            </button>
          )}
          <button className="btn-primary" onClick={() => setTaskDialog("new")}><Plus size={16} /> Add Task</button>
        </div>
      </div>

      {isLargeProject && !selectedIds.size ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={activePageTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <TaskTable tasks={activePageTasks} project={project} onEdit={setTaskDialog} sortable={false} selectedIds={selectedIds} onToggle={toggleSelect} onToggleAll={toggleAll} allSelected={allPageSelected} isLargeProject={isLargeProject} onComplete={handleComplete} fadingIds={fadingIds} />
          </SortableContext>
        </DndContext>
      ) : isLargeProject ? (
        <TaskTable tasks={activePageTasks} project={project} onEdit={setTaskDialog} sortable={false} selectedIds={selectedIds} onToggle={toggleSelect} onToggleAll={toggleAll} allSelected={allPageSelected} isLargeProject={isLargeProject} onComplete={handleComplete} fadingIds={fadingIds} />
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={activePageTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <TaskTable tasks={activePageTasks} project={project} onEdit={setTaskDialog} sortable selectedIds={selectedIds} onToggle={toggleSelect} onToggleAll={toggleAll} allSelected={allPageSelected} isLargeProject={false} onComplete={handleComplete} fadingIds={fadingIds} />
          </SortableContext>
        </DndContext>
      )}

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-app border border-piche-line bg-slate-50 px-4 py-3">
        {/* Counter */}
        <span className="text-sm font-semibold text-piche-muted">
          Showing {activePageTasks.length > 0 ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, activeTasks.length)} of {activeTasks.length} active tasks
        </span>

        {/* Page buttons */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              className="grid h-8 w-8 place-items-center rounded-app border border-piche-line text-sm font-semibold disabled:opacity-40"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >‹</button>
            {pageNumbers(safePage, totalPages).map((page, i) =>
              page === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-piche-muted">…</span>
              ) : (
                <button
                  key={page}
                  className={`grid h-8 w-8 place-items-center rounded-app border text-sm font-black ${safePage === page ? "border-piche-navy bg-piche-navy text-white" : "border-piche-line hover:bg-slate-100"}`}
                  onClick={() => setCurrentPage(page as number)}
                >
                  {page}
                </button>
              )
            )}
            <button
              className="grid h-8 w-8 place-items-center rounded-app border border-piche-line text-sm font-semibold disabled:opacity-40"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >›</button>
          </div>
        )}

        {/* Page size selector */}
        <label className="flex items-center gap-2 text-sm font-semibold text-piche-muted">
          Show
          <select
            className="input py-1 text-sm"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
          >
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n} per page</option>)}
          </select>
        </label>
      </div>

      {/* Sticky action toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-app border border-piche-navy bg-piche-navy p-3 text-white shadow-soft">
          <span className="font-semibold">{selectedIds.size} task(s) selected</span>
          <button
            className="min-h-9 rounded-app bg-piche-gold px-4 text-sm font-black text-piche-ink hover:bg-piche-gold/90"
            onClick={() => setBulkOpen(true)}
          >
            Set Labour Hours
          </button>
          <button
            className="min-h-9 rounded-app border border-white/30 px-4 text-sm font-semibold hover:bg-white/10"
            onClick={() => setSelectedIds(new Set())}
          >
            Deselect All
          </button>
        </div>
      )}

      <TaskDialog open={Boolean(taskDialog)} onOpenChange={(open) => !open && setTaskDialog(null)} projectId={project.id} task={taskDialog === "new" ? undefined : taskDialog || undefined} />

      {/* ── Completion undo toast ── */}
      {completionUndo && (
        <div className="fixed bottom-6 right-6 z-50 w-72 overflow-hidden rounded-app bg-piche-navy text-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
            <span className="text-sm font-semibold">✓ Task marked as done</span>
            <button
              className="rounded-md border border-white/20 px-3 py-1 text-xs font-black"
              onClick={handleUndoComplete}
            >
              Undo
            </button>
          </div>
          <p className="px-4 pb-2 text-xs text-white/60 truncate">{completionUndo.taskName}</p>
          {/* 5-second countdown bar */}
          <div className="h-1 w-full bg-white/10">
            <div
              key={completionUndo.startedAt}
              className="h-full bg-piche-gold"
              style={{ animation: "countdown-bar 5s linear forwards" }}
            />
          </div>
        </div>
      )}

      {/* ── Parent task confirm dialog ── */}
      {parentConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-xl font-black text-piche-ink">Archive sub-tasks too?</h2>
            <p className="mt-2 text-piche-muted">
              This will also archive{" "}
              <strong>{tasks.filter((t) => !t.isCompleted && t.id !== parentConfirm.id && (t.id.startsWith(parentConfirm.id + ".") || t.id.startsWith(parentConfirm.id + "-"))).length} sub-task(s)</strong>.
              Continue?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setParentConfirm(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  const subIds = tasks
                    .filter((t) => !t.isCompleted && t.id !== parentConfirm.id && (t.id.startsWith(parentConfirm.id + ".") || t.id.startsWith(parentConfirm.id + "-")))
                    .map((t) => t.id);
                  setParentConfirm(null);
                  await doComplete(parentConfirm.id, parentConfirm.name, subIds);
                }}
              >
                Archive All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk hours modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 max-[640px]:items-end">
          <div className="card w-full max-w-sm p-6 max-[640px]:rounded-b-none">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-piche-ink">Set Labour Hours</h2>
                <p className="mt-1 text-sm text-piche-muted">Apply the same hours to {selectedIds.size} selected task(s).</p>
              </div>
              <button className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-app border border-piche-line" onClick={() => setBulkOpen(false)}><X size={15} /></button>
            </div>
            <label className="field">
              <span>Labour Hours per Task</span>
              <input
                type="number"
                className="input"
                placeholder="e.g. 500"
                min={1}
                value={bulkHours}
                onChange={(e) => setBulkHours(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && applyBulkHours()}
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>Cancel</button>
              <button
                className="btn-primary"
                onClick={applyBulkHours}
                disabled={bulkSaving || !Number(bulkHours)}
              >
                {bulkSaving ? "Saving…" : `Apply to ${selectedIds.size} task(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskTable({
  tasks,
  project,
  onEdit,
  sortable,
  selectedIds,
  onToggle,
  onToggleAll,
  allSelected,
  onComplete,
  fadingIds
}: {
  tasks: Task[];
  project: Project;
  onEdit: (task: Task) => void;
  sortable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
  allSelected?: boolean;
  isLargeProject?: boolean;
  onComplete?: (task: Task) => void;
  fadingIds?: Set<string>;
}) {
  return (
    <div className="overflow-auto rounded-app border border-piche-line">
      <table className="w-full min-w-[1200px] text-left">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {onComplete && <th className="w-10 p-3" title="Mark complete" />}
            {selectedIds !== undefined && (
              <th className="w-10 p-3">
                <button onClick={onToggleAll} className="grid h-5 w-5 place-items-center text-slate-500 hover:text-piche-navy" title={allSelected ? "Deselect all" : "Select all"}>
                  {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
            )}
            <th className="p-3">Task ID</th>
            <th className="p-3">Name</th>
            <th className="p-3">Start</th>
            <th className="p-3">End</th>
            <th className="p-3">Hours</th>
            <th className="p-3">Total Value</th>
            <th className="p-3">Source</th>
            <th className="p-3">Last Imported</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => sortable
            ? <SortableTaskRow key={task.id} task={task} project={project} onEdit={() => onEdit(task)} selected={selectedIds?.has(task.id)} onToggle={onToggle ? () => onToggle(task.id) : undefined} onComplete={onComplete ? () => onComplete(task) : undefined} fading={fadingIds?.has(task.id)} />
            : <TaskRow key={task.id} task={task} project={project} onEdit={() => onEdit(task)} selected={selectedIds?.has(task.id)} onToggle={onToggle ? () => onToggle(task.id) : undefined} onComplete={onComplete ? () => onComplete(task) : undefined} fading={fadingIds?.has(task.id)} />
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortableTaskRow(props: { task: Task; project: Project; onEdit: () => void; selected?: boolean; onToggle?: () => void; dragDisabled?: boolean; onComplete?: () => void; fading?: boolean }) {
  const sortable = useSortable({ id: props.task.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition
  };
  return <TaskRow {...props} rowRef={sortable.setNodeRef} dragProps={{ ...sortable.attributes, ...sortable.listeners }} style={style} />;
}

function TaskRow({
  task,
  project,
  onEdit,
  rowRef,
  dragProps,
  style,
  selected,
  onToggle,
  onComplete,
  fading
}: {
  task: Task;
  project: Project;
  onEdit: () => void;
  rowRef?: (node: HTMLElement | null) => void;
  dragProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  style?: CSSProperties;
  selected?: boolean;
  onToggle?: () => void;
  onComplete?: () => void;
  fading?: boolean;
}) {
  const state = useAppStore();
  return (
    <tr ref={rowRef} style={style} className={`border-t border-piche-line transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"} ${selected ? "bg-piche-gold/10" : "bg-white"}`}>
      {/* Completion checkbox — only rendered when onComplete is provided (PM role) */}
      {onComplete !== undefined && (
        <td className="p-3">
          <button
            onClick={onComplete}
            title="Mark task as complete"
            className="group grid h-6 w-6 place-items-center rounded-full border-2 border-slate-300 text-transparent transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-500"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </td>
      )}
      {onToggle !== undefined && (
        <td className="p-3">
          <button onClick={onToggle} className="grid h-5 w-5 place-items-center text-slate-400 hover:text-piche-navy">
            {selected ? <CheckSquare size={16} className="text-piche-navy" /> : <Square size={16} />}
          </button>
        </td>
      )}
      <td className="p-3 font-black">{task.id}</td>
      <td className="p-3 font-bold">{task.name}{task.labourHoursMissing ? <span className="ml-2"><StatusBadge status="Missing" /></span> : null}</td>
      <td className="p-3">{formatDate(task.startDate)}</td>
      <td className="p-3">{formatDate(task.endDate)}</td>
      <td className="p-3">{formatNumber(task.totalLabourHours, 2)}<span className="block text-xs text-piche-muted">{task.labourHoursSource}</span></td>
      <td className="p-3">{task.totalValue ? formatCurrency(task.totalValue) : "-"}</td>
      <td className="p-3 capitalize">{task.source}</td>
      <td className="p-3">{task.lastImportedAt ? formatDate(task.lastImportedAt) : "-"}</td>
      <td className="p-3">
        <div className="flex justify-end gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-app border border-piche-line" onClick={onEdit}><Edit size={16} /></button>
          <button className="grid h-9 w-9 place-items-center rounded-app border border-piche-line text-red-700" onClick={async () => {
            const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, { method: "DELETE" });
            if (res.ok) {
              state.deleteTask(project.id, task.id);
            } else {
              const body = await res.json().catch(() => ({}));
              toast.error(body.error || "Could not delete task. Please try again.");
            }
          }}><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  );
}

// ─── Schedule export helpers ──────────────────────────────────────────────────

type ExportDuration = "2w" | "1m" | "3m" | "full" | "custom";

function getExportDates(duration: ExportDuration, project: Project, customStart: string, customEnd: string, tasks: Task[]): { startDate: string; endDate: string } {
  // Always start from the earliest task, never from today
  const earliestStart = tasks.length > 0
    ? tasks.reduce((min, t) => (t.startDate < min ? t.startDate : min), tasks[0].startDate)
    : project.startDate;

  if (duration === "2w") {
    const start = new Date(earliestStart + "T00:00:00");
    const end = new Date(start); end.setDate(end.getDate() + 13);
    return { startDate: earliestStart, endDate: end.toISOString().slice(0, 10) };
  }
  if (duration === "1m") {
    const start = new Date(earliestStart + "T00:00:00");
    const end = new Date(start); end.setDate(end.getDate() + 29);
    return { startDate: earliestStart, endDate: end.toISOString().slice(0, 10) };
  }
  if (duration === "3m") {
    const start = new Date(earliestStart + "T00:00:00");
    const end = new Date(start); end.setDate(end.getDate() + 89);
    return { startDate: earliestStart, endDate: end.toISOString().slice(0, 10) };
  }
  if (duration === "full") {
    return { startDate: project.startDate, endDate: project.endDate };
  }
  return { startDate: customStart || project.startDate, endDate: customEnd || project.endDate };
}

function ScheduleTab({ project, tasks }: { project: Project; tasks: Task[] }) {
  const state = useAppStore();
  const [visibleCount, setVisibleCount] = useState(initialTaskRows);
  const periods = useMemo(() => ganttPeriods(project, state.scheduleGranularity), [project, state.scheduleGranularity]);
  const visibleTasks = tasks.slice(0, visibleCount);
  const activeTask = project.tasks.find((task) => task.id === state.selectedScheduleTaskId) || project.tasks[0];

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDuration, setExportDuration] = useState<ExportDuration>("full");
  const [exportCustomStart, setExportCustomStart] = useState(project.startDate);
  const [exportCustomEnd, setExportCustomEnd] = useState(project.endDate);
  const [exportOrientation, setExportOrientation] = useState<ScheduleOrientation>("landscape");
  const [exporting, setExporting] = useState(false);

  const exportDates = useMemo(
    () => getExportDates(exportDuration, project, exportCustomStart, exportCustomEnd, tasks),
    [exportDuration, project, exportCustomStart, exportCustomEnd, tasks]
  );
  const exportGranularity: ScheduleGranularity = autoGranularity(exportDates.startDate, exportDates.endDate);
  const exportVisibleTaskCount = tasks.filter((t) => t.endDate >= exportDates.startDate && t.startDate <= exportDates.endDate).length;
  const pageCount = estimatePageCount(exportDates.startDate, exportDates.endDate, exportGranularity, exportOrientation, exportVisibleTaskCount);

  const handleExportSchedule = async () => {
    setExporting(true);
    try {
      await exportSchedulePDF({
        projectName: project.name,
        tasks,
        startDate: exportDates.startDate,
        endDate: exportDates.endDate,
        granularity: exportGranularity,
        orientation: exportOrientation
      });
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 max-xl:grid-cols-1">
        <div className="rounded-app border border-piche-line p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-xl font-black">Gantt Schedule</h3><p className="text-sm text-piche-muted">Click a task bar for details.</p></div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary"
                onClick={() => setExportOpen(true)}
                title="Export Gantt schedule as PDF"
              >
                <Download size={15} /> Export Schedule
              </button>
              <select className="input" value={state.scheduleGranularity} onChange={(event) => state.setField("scheduleGranularity", event.target.value as never)}>
                <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
              </select>
            </div>
          </div>
          <div className="mb-3 text-sm font-semibold text-piche-muted">Showing {visibleTasks.length} of {tasks.length} schedule tasks.</div>
          <div className="overflow-auto rounded-app border border-piche-line">
            <div className="grid min-w-max" style={{ gridTemplateColumns: `280px repeat(${periods.length}, 86px)` }}>
              <div className="sticky left-0 z-10 bg-slate-50 p-3 text-xs font-black uppercase text-slate-500">Task</div>
              {periods.map((period) => <div key={period.key} className="border-l border-piche-line bg-slate-50 p-3 text-center text-xs font-black text-slate-500">{period.label}</div>)}
              {visibleTasks.map((task) => {
                const placement = taskPlacement(task, periods);
                const severity = taskSeverity(task, project);
                const color = severity === "danger" ? "bg-red-600" : severity === "warning" ? "bg-amber-500" : "bg-piche-gold";
                return (
                  <div key={task.id} className="contents">
                    <div className="sticky left-0 z-10 border-t border-piche-line bg-white p-3"><strong>{task.id}</strong><span className="block max-w-[240px] truncate text-sm text-piche-muted">{task.name}</span></div>
                    <div className="relative border-t border-piche-line" style={{ gridColumn: `2 / span ${periods.length}` }}>
                      <button className={`absolute top-3 h-9 rounded-app px-3 text-sm font-black text-white ${color}`} style={{ left: `${placement.startIndex * 86 + 6}px`, width: `${placement.span * 86 - 12}px` }} onClick={() => state.setField("selectedScheduleTaskId", task.id)}>
                        {task.id}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {visibleCount < tasks.length ? (
            <button className="btn-secondary mt-4 justify-self-center" onClick={() => setVisibleCount((count) => Math.min(count + taskRowsIncrement, tasks.length))}>
              Show {Math.min(taskRowsIncrement, tasks.length - visibleCount)} more schedule tasks
            </button>
          ) : null}
        </div>
        {activeTask ? <TaskDetailPanel project={project} task={activeTask} /> : null}
      </div>

      {/* ── Export Schedule Modal ── */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 max-[640px]:items-end">
          <div className="card w-full max-w-md p-6 max-[640px]:rounded-b-none">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-piche-ink">Export Schedule PDF</h2>
                <p className="mt-1 text-sm text-piche-muted">{project.name}</p>
              </div>
              <button className="grid h-8 w-8 shrink-0 place-items-center rounded-app border border-piche-line" onClick={() => setExportOpen(false)}><X size={15} /></button>
            </div>

            {/* Duration presets */}
            <div className="field mb-4">
              <span className="text-sm font-black text-piche-ink">Duration</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  ["2w", "Next 2 weeks"],
                  ["1m", "Next month"],
                  ["3m", "Next 3 months"],
                  ["full", "Whole project"],
                  ["custom", "Custom dates"]
                ] as [ExportDuration, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-app border px-3 py-2 text-sm font-bold transition ${exportDuration === id ? "border-piche-navy bg-piche-navy text-white" : "border-piche-line bg-slate-50 text-slate-700 hover:bg-slate-100"} ${id === "custom" ? "col-span-2" : ""}`}
                    onClick={() => setExportDuration(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range */}
            {exportDuration === "custom" && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                <label className="field">
                  <span>From</span>
                  <input type="date" value={exportCustomStart} onChange={(e) => setExportCustomStart(e.target.value)} />
                </label>
                <label className="field">
                  <span>To</span>
                  <input type="date" value={exportCustomEnd} onChange={(e) => setExportCustomEnd(e.target.value)} />
                </label>
              </div>
            )}

            {/* Orientation */}
            <div className="field mb-4">
              <span className="text-sm font-black text-piche-ink">Page Orientation</span>
              <div className="mt-2 inline-flex rounded-app bg-slate-100 p-1">
                {(["landscape", "portrait"] as ScheduleOrientation[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`min-h-9 rounded-md px-4 text-sm font-black capitalize ${exportOrientation === o ? "bg-white text-piche-goldDark shadow" : "text-slate-600"}`}
                    onClick={() => setExportOrientation(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview hint */}
            <div className="mb-5 rounded-app border border-piche-line bg-slate-50 px-4 py-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-piche-muted">
                <span>Range:</span>
                <strong className="text-piche-ink">{exportDates.startDate} → {exportDates.endDate}</strong>
                <span>Granularity:</span>
                <strong className="text-piche-ink capitalize">{exportGranularity}</strong>
                <span>Format:</span>
                <strong className="text-piche-ink">A3 {exportOrientation}</strong>
                <span>Est. pages:</span>
                <strong className="text-piche-ink">~{pageCount} (incl. summary)</strong>
                <span>Tasks included:</span>
                <strong className="text-piche-ink">{exportVisibleTaskCount} of {tasks.length}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setExportOpen(false)} disabled={exporting}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleExportSchedule}
                disabled={exporting || !exportDates.startDate || !exportDates.endDate || exportDates.startDate > exportDates.endDate}
              >
                <Download size={15} />
                {exporting ? "Generating PDF…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CrewTab({ project, tasks }: { project: Project; tasks: Task[] }) {
  const state = useAppStore();
  const [visibleCount, setVisibleCount] = useState(initialTaskRows);
  const capacity = state.crewScenarioCapacity || project.maxAvailableWorkers;
  const visibleTasks = tasks.slice(0, visibleCount);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h3 className="text-xl font-black">Crew Allocation</h3><p className="text-sm text-piche-muted">Plan demand by crew type and test a different workforce ceiling.</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <select className="input" value={state.crewRequirementMode} onChange={(event) => state.setField("crewRequirementMode", event.target.value as never)}><option value="rounded">Rounded</option><option value="exact">Exact</option></select>
          <label className="field">What-if Capacity<input type="number" value={state.crewScenarioCapacity ?? ""} placeholder={String(project.maxAvailableWorkers)} onChange={(event) => state.setField("crewScenarioCapacity", event.target.value ? Number(event.target.value) : null)} /></label>
        </div>
      </div>
      <p className="text-sm font-semibold text-piche-muted">Showing {visibleTasks.length} of {tasks.length} allocation rows.</p>
      <div className="overflow-auto rounded-app border border-piche-line">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Task</th><th className="p-3">Required Crew</th>{state.crewTypes.map((type) => <th key={type.id} className="p-3">{type.label}</th>)}<th className="p-3">Capacity</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {visibleTasks.map((task, index) => {
              const exact = taskAverageCrew(task, project);
              const over = Math.ceil(exact) > capacity;
              return (
                <tr key={task.id} className="border-t border-piche-line">
                  <td className="p-3"><strong>{task.id}</strong><span className="block text-sm text-piche-muted">{task.name}</span></td>
                  <td className="p-3 font-black">{state.crewRequirementMode === "rounded" ? Math.ceil(exact) : formatNumber(exact, 2)}</td>
                  {state.crewTypes.map((type) => <td key={type.id} className="p-3"><input className="input w-24" type="number" min={0} step={0.25} value={task.crewAllocation[type.id] || 0} onChange={(event) => state.updateTask(project.id, task.id, { crewAllocation: { ...task.crewAllocation, [type.id]: Number(event.target.value) } })} /></td>)}
                  <td className="p-3"><StatusBadge status={over ? "Over Capacity" : "Healthy"} /></td>
                  <td className="p-3">{index ? <button className="btn-secondary" onClick={() => state.copyAllocationFromAbove(project.id, task.id)}>Copy from above</button> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visibleCount < tasks.length ? (
        <button className="btn-secondary justify-self-center" onClick={() => setVisibleCount((count) => Math.min(count + taskRowsIncrement, tasks.length))}>
          Show {Math.min(taskRowsIncrement, tasks.length - visibleCount)} more allocation rows
        </button>
      ) : null}
    </div>
  );
}

function ImportsTab({ project, actualsData, onUploadSuccess }: { project: Project; actualsData: ActualsApiResponse | null; onUploadSuccess: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  // Labels are stored in localStorage keyed by import batch ID
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("import-labels") || "{}");
    } catch {
      return {};
    }
  });

  const saveLabel = (importId: string, label: string) => {
    const next = { ...labels, [importId]: label };
    setLabels(next);
    try { localStorage.setItem("import-labels", JSON.stringify(next)); } catch {}
  };

  return (
    <>
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-xl font-black">Schedule Imports</h3><p className="text-sm text-piche-muted">Imports update names and dates only. Labour hours are never overwritten.</p></div>
          <button className="btn-primary" onClick={() => setOpen(true)}><FileUp size={16} /> Import Schedule</button>
        </div>
        <div className="overflow-auto rounded-app border border-piche-line">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">File</th>
                <th className="p-3">Label</th>
                <th className="p-3">Date</th>
                <th className="p-3">New</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Skipped</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {project.scheduleImports.map((item) => (
                <tr key={item.id} className="border-t border-piche-line">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <strong className="block font-bold text-piche-ink">{item.fileName}</strong>
                      </div>
                      <span
                        className="flex-shrink-0 cursor-help rounded-full border border-slate-200 bg-slate-100 px-1.5 text-xs font-black text-slate-500"
                        title={`Internal batch ID: ${item.id}`}
                      >
                        ⓘ
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <input
                      className="input min-w-[160px] text-sm"
                      placeholder="Add a label…"
                      defaultValue={labels[item.id] || ""}
                      onBlur={(e) => saveLabel(item.id, e.target.value.trim())}
                    />
                  </td>
                  <td className="p-3">{formatDate(item.importedAt)}</td>
                  <td className="p-3">{item.newTasks}</td>
                  <td className="p-3">{item.updatedTasks}</td>
                  <td className="p-3">{item.skipped}</td>
                  <td className="p-3"><StatusBadge status="Complete" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ImportWizard open={open} onOpenChange={setOpen} project={project} />
      </div>

      <TimesheetImports project={project} actualsData={actualsData} onUploadSuccess={onUploadSuccess} />
    </>
  );
}

function ArchiveTab({ project }: { project: Project }) {
  const state = useAppStore();
  const completedTasks = project.tasks.filter((t) => t.isCompleted);

  const handleRestore = async (task: Task) => {
    const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}/restore`, { method: "PATCH" });
    if (res.ok) {
      state.restoreTask(project.id, task.id);
      toast.success(`${task.name} restored to active tasks.`);
    } else {
      toast.error("Could not restore task.");
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xl font-black">Archived Tasks</h3>
        <p className="text-sm text-piche-muted">{completedTasks.length} completed task(s). Click Restore to move back to the active Tasks tab.</p>
      </div>
      {completedTasks.length === 0 ? (
        <div className="rounded-app border border-piche-line bg-slate-50 p-8 text-center text-piche-muted">
          No archived tasks yet. Mark tasks as complete from the Tasks tab.
        </div>
      ) : (
        <div className="overflow-auto rounded-app border border-piche-line">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Task ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Hours</th>
                <th className="p-3">Completed</th>
                <th className="p-3">Completed By</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {completedTasks.map((task) => (
                <tr key={task.id} className="border-t border-piche-line bg-emerald-50/30">
                  <td className="p-3 font-black text-slate-500">{task.id}</td>
                  <td className="p-3 font-bold line-through text-slate-400">{task.name}</td>
                  <td className="p-3 text-slate-400">{formatDate(task.startDate)}</td>
                  <td className="p-3 text-slate-400">{formatDate(task.endDate)}</td>
                  <td className="p-3 text-slate-400">{formatNumber(task.totalLabourHours, 2)}</td>
                  <td className="p-3 text-slate-500">
                    {task.completedAt
                      ? new Date(task.completedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="p-3 text-slate-500">{task.completedBy || "—"}</td>
                  <td className="p-3">
                    <button
                      className="rounded-app border border-piche-line bg-white px-3 py-1.5 text-sm font-black text-piche-ink hover:bg-slate-50"
                      onClick={() => handleRestore(task)}
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaskDetailPanel({ project, task }: { project: Project; task: Task }) {
  const severity = taskSeverity(task, project);
  return (
    <aside className="rounded-app border border-piche-line p-5">
      <StatusBadge status={severity === "danger" ? "Over Capacity" : "Healthy"} />
      <h3 className="mt-3 text-xl font-black">{task.name}</h3>
      <p className="text-piche-muted">{task.id}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniKpi label="Start" value={formatDate(task.startDate)} />
        <MiniKpi label="Finish" value={formatDate(task.endDate)} />
        <MiniKpi label="Duration" value={`${taskWorkingDays(task).length} days`} />
        <MiniKpi label="Exact Crew" value={formatNumber(taskAverageCrew(task, project), 2)} />
        <MiniKpi label="Rounded Crew" value={taskRoundedCrew(task, project)} />
        <MiniKpi label="Hours" value={formatNumber(task.totalLabourHours)} />
      </div>
      {task.notes ? <p className="mt-4 text-sm text-piche-muted">{task.notes}</p> : null}
    </aside>
  );
}

function MiniKpi({ label, value, loading }: { label: string; value: string | number; loading?: boolean }) {
  return (
    <article className="rounded-app border border-piche-line bg-slate-50 p-4">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      {loading ? (
        <div className="mt-2 h-7 w-28 animate-pulse rounded bg-slate-200" />
      ) : (
        <strong className="mt-2 block text-xl font-black text-piche-navy">{value}</strong>
      )}
    </article>
  );
}

function Risk({ title, text, danger }: { title: string; text: string; danger?: boolean }) {
  return <article className={`rounded-app border p-4 ${danger ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}><strong>{title}</strong><p className="mt-1 text-sm text-piche-muted">{text}</p></article>;
}

// ─── Shared timesheet upload hook ────────────────────────────────────────────
function useTimesheetUpload(projectId: string, onSuccess: () => Promise<void>) {
  const [uploading, setUploading] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    file: File; month: string; existingHours: number; newHours: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, replace = false) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/projects/${projectId}/actual-hours/upload${replace ? "?replace=true" : ""}`,
        { method: "POST", body: fd }
      );
      const data = await res.json();

      if (res.status === 409 && data.conflict) {
        setConfirmState({ file, month: data.month, existingHours: data.existingHours, newHours: data.newHours });
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Upload failed.");
        return;
      }
      const monthLabel = new Date(data.month + "-01T00:00:00")
        .toLocaleDateString("en-CA", { month: "long", year: "numeric" });
      toast.success(`${monthLabel} timesheet uploaded — ${Number(data.totalHours).toLocaleString()} hrs recorded`);
      await onSuccess();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await uploadFile(file);
  };

  const confirmReplace = async () => {
    if (!confirmState) return;
    const file = confirmState.file;
    setConfirmState(null);
    await uploadFile(file, true);
  };

  return { uploading, confirmState, setConfirmState, fileInputRef, handleFileChange, confirmReplace };
}

// ─── PlannedVsActualSection (Overview tab) ───────────────────────────────────
function PlannedVsActualSection({ project, actualsData, onUploadSuccess }: {
  project: Project;
  actualsData: ActualsApiResponse | null;
  onUploadSuccess: () => Promise<void>;
}) {
  const state = useAppStore();
  const { uploading, confirmState, setConfirmState, fileInputRef, handleFileChange, confirmReplace } =
    useTimesheetUpload(project.id, onUploadSuccess);
  const [expandHistory, setExpandHistory] = useState(false);

  const todayMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const chartData = useMemo(() => {
    if (!actualsData) return [];
    const monthSet = new Set([
      ...actualsData.planned.map(p => p.month),
      ...actualsData.actuals.map(a => a.month),
    ]);
    return Array.from(monthSet).sort().map(month => {
      const [yr, mo] = month.split("-");
      const label = new Date(Number(yr), Number(mo) - 1, 1)
        .toLocaleDateString("en-CA", { month: "short", year: "numeric" });
      const planned = actualsData.planned.find(p => p.month === month)?.totalHours ?? null;
      const actual  = actualsData.actuals.find(a => a.month === month)?.totalHours ?? null;
      return { month, label, planned, actual };
    });
  }, [actualsData]);

  const todayLabel = chartData.find(d => d.month === todayMonth)?.label ?? null;
  const hasActuals = (actualsData?.actuals.length ?? 0) > 0;

  return (
    <div className="rounded-app border border-piche-line p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black">Planned vs Actual Hours</h3>
          <p className="text-sm text-piche-muted">Monthly comparison — upload a timesheet each month to track progress</p>
        </div>
        <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={15} />
          {uploading ? "Reading file…" : "Upload Timesheet"}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Chart */}
      <div className="relative h-[280px]">
        {!hasActuals && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-app bg-slate-50/80">
            <p className="text-sm font-semibold text-piche-muted">No timesheet data uploaded yet</p>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: unknown, name: string) => [
              typeof value === "number" ? value.toLocaleString() + " hrs" : "—", name
            ]} />
            <Legend />
            <Line
              dataKey="planned"
              name="Planned"
              stroke="#c7b157"
              strokeDasharray="6 3"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              dataKey="actual"
              name="Actual"
              stroke="#3b82f6"
              strokeWidth={2}
              connectNulls
              isAnimationActive={false}
              dot={(dotProps) => {
                const { payload, cx, cy } = dotProps as {
                  payload: { actual: number | null; planned: number | null };
                  cx: number; cy: number;
                };
                if (payload.actual === null || cy === undefined) return <g key={`dot-${cx}`} />;
                const over = payload.planned !== null && payload.actual > payload.planned;
                return (
                  <circle
                    key={`dot-${cx}`}
                    cx={cx} cy={cy} r={4}
                    fill={over ? "#c7b157" : "#3b82f6"}
                    stroke="white" strokeWidth={1.5}
                  />
                );
              }}
            />
            {todayLabel && (
              <ReferenceLine
                x={todayLabel}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "#64748b" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Upload history (collapsible) */}
      {hasActuals && (
        <div className="mt-4">
          <button
            className="flex items-center gap-2 text-sm font-black text-piche-muted hover:text-piche-ink"
            onClick={() => setExpandHistory(h => !h)}
          >
            {expandHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Upload history ({actualsData!.actuals.length} file{actualsData!.actuals.length !== 1 ? "s" : ""})
          </button>
          {expandHistory && (
            <div className="mt-3 overflow-auto rounded-app border border-piche-line">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Total Hours</th>
                    <th className="p-3">Filename</th>
                    <th className="p-3">Uploaded By</th>
                    <th className="p-3">Date</th>
                    {(state.role === "admin" || state.role === "vp") && <th className="p-3" />}
                  </tr>
                </thead>
                <tbody>
                  {actualsData!.actuals.map(a => (
                    <tr key={a.id} className="border-t border-piche-line">
                      <td className="p-3 font-semibold">{a.month}</td>
                      <td className="p-3">{a.totalHours.toLocaleString()}</td>
                      <td className="p-3 text-piche-muted">{a.originalFilename}</td>
                      <td className="p-3">{a.uploadedBy}</td>
                      <td className="p-3">{new Date(a.uploadedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</td>
                      {(state.role === "admin" || state.role === "vp") && (
                        <td className="p-3">
                          <DeleteActualButton projectId={project.id} month={a.month} onDeleted={onUploadSuccess} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirm replace dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-xl font-black text-piche-ink">Replace existing timesheet?</h2>
            <p className="mt-2 text-piche-muted">
              A timesheet for <strong>{confirmState.month}</strong> already exists ({confirmState.existingHours.toLocaleString()} hrs).
              Replace it with the new file ({confirmState.newHours.toLocaleString()} hrs)?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setConfirmState(null)}>Cancel</button>
              <button className="btn-primary" onClick={confirmReplace}>Replace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TimesheetImports (Imports tab section) ───────────────────────────────────
function TimesheetImports({ project, actualsData, onUploadSuccess }: {
  project: Project;
  actualsData: ActualsApiResponse | null;
  onUploadSuccess: () => Promise<void>;
}) {
  const state = useAppStore();
  const { uploading, confirmState, setConfirmState, fileInputRef, handleFileChange, confirmReplace } =
    useTimesheetUpload(project.id, onUploadSuccess);

  return (
    <div className="mt-8 grid gap-4 border-t border-piche-line pt-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black">Timesheet Imports</h3>
          <p className="text-sm text-piche-muted">Upload monthly timesheet Excel files to track actual hours vs planned.</p>
        </div>
        <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={16} />
          {uploading ? "Reading file…" : "Upload Timesheet"}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
      </div>

      {(actualsData?.actuals.length ?? 0) === 0 ? (
        <div className="rounded-app border border-piche-line bg-slate-50 p-8 text-center text-piche-muted">
          No timesheet imports yet. Upload a timesheet to start tracking actuals.
        </div>
      ) : (
        <div className="overflow-auto rounded-app border border-piche-line">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">File</th>
                <th className="p-3">Month</th>
                <th className="p-3">Total Hours</th>
                <th className="p-3">Rows Processed</th>
                <th className="p-3">Uploaded By</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                {(state.role === "admin" || state.role === "vp") && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {actualsData!.actuals.map(a => (
                <tr key={a.id} className="border-t border-piche-line">
                  <td className="p-3"><strong className="block font-bold text-piche-ink">{a.originalFilename}</strong></td>
                  <td className="p-3 font-semibold">{a.month}</td>
                  <td className="p-3">{a.totalHours.toLocaleString()}</td>
                  <td className="p-3">{a.rowCount.toLocaleString()}</td>
                  <td className="p-3">{a.uploadedBy}</td>
                  <td className="p-3">{new Date(a.uploadedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</td>
                  <td className="p-3"><StatusBadge status="Complete" /></td>
                  {(state.role === "admin" || state.role === "vp") && (
                    <td className="p-3">
                      <DeleteActualButton projectId={project.id} month={a.month} onDeleted={onUploadSuccess} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm replace dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-xl font-black text-piche-ink">Replace existing timesheet?</h2>
            <p className="mt-2 text-piche-muted">
              A timesheet for <strong>{confirmState.month}</strong> already exists ({confirmState.existingHours.toLocaleString()} hrs).
              Replace it with the new file ({confirmState.newHours.toLocaleString()} hrs)?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setConfirmState(null)}>Cancel</button>
              <button className="btn-primary" onClick={confirmReplace}>Replace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Delete actual hours button (Admin/VP only) ───────────────────────────────
function DeleteActualButton({ projectId, month, onDeleted }: {
  projectId: string;
  month: string;
  onDeleted: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <button
        className="grid h-8 w-8 place-items-center rounded-app border border-piche-line text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
        title="Delete timesheet entry"
      >
        <Trash2 size={14} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-xl font-black text-piche-ink">Delete timesheet?</h2>
            <p className="mt-2 text-piche-muted">
              This will permanently remove the timesheet for <strong>{month}</strong>. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className="btn-primary bg-red-700 hover:bg-red-800"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const res = await fetch(`/api/projects/${projectId}/actual-hours/${month}`, { method: "DELETE" });
                    if (res.ok) {
                      setOpen(false);
                      toast.success(`Timesheet for ${month} deleted.`);
                      await onDeleted();
                    } else {
                      toast.error("Could not delete timesheet.");
                    }
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
