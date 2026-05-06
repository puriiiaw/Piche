"use client";

import { useMemo, useState } from "react";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownUp, Edit, FileUp, Plus, Trash2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { projectAreas } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatCurrency, formatNumber } from "@/lib/format";
import { aggregateProject, dashboardRange, ganttPeriods, projectTotalHours, taskAverageCrew, taskPlacement, taskRoundedCrew, taskSeverity, taskWorkingDays, workforceAnalysis } from "@/lib/labour";
import { useAppStore } from "@/lib/store";
import type { Project, Task } from "@/lib/types";
import { ProjectDialog } from "@/components/project-dialog";
import { TaskDialog } from "@/components/task-dialog";
import { ImportWizard } from "@/components/views/project/import-wizard";
import { StatusBadge } from "@/components/ui/status-badge";

export function ProjectsView() {
  const state = useAppStore();
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const visibleProjects = state.role === "vp" ? state.projects : state.projects.filter((project) => project.managerId === state.currentUserManagerId);
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
            <p className="text-piche-muted">{state.role === "vp" ? "All company projects" : "Projects assigned to the current PM"}</p>
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
                      <button className="grid h-9 w-9 place-items-center rounded-app border border-piche-line text-red-700" onClick={(event) => { event.stopPropagation(); state.deleteProject(project.id); }} title="Delete project"><Trash2 size={16} /></button>
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
    </>
  );
}

function ProjectDetail({ project }: { project: Project }) {
  const state = useAppStore();
  const updateProject = useAppStore((entry) => entry.updateProject);
  const analysis = workforceAnalysis([project], state.granularity, "crew", {}, state.selectedCrewTypeIds, project.maxAvailableWorkers);

  return (
    <section className="card grid gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-piche-line pb-5">
        <div>
          <p className="eyebrow">Project Detail</p>
          <h2 className="text-3xl font-black text-piche-ink">{project.name}</h2>
          <p className="mt-1 text-piche-muted">{formatDate(project.startDate)} to {formatDate(project.endDate)} - {project.area}, {project.cityName}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
          <label className="field rounded-app border border-piche-line bg-slate-50 p-3">Hours / Worker<input type="number" value={project.dailyHoursPerWorker} onChange={(event) => updateProject(project.id, { dailyHoursPerWorker: Number(event.target.value) })} /></label>
          <label className="field rounded-app border border-piche-line bg-slate-50 p-3">Avg Rate<input type="number" value={project.avgHourlyRate} onChange={(event) => updateProject(project.id, { avgHourlyRate: Number(event.target.value) })} /></label>
          <label className="field rounded-app border border-piche-line bg-slate-50 p-3">Max Workers<input type="number" value={project.maxAvailableWorkers} onChange={(event) => updateProject(project.id, { maxAvailableWorkers: Number(event.target.value) })} /></label>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <MiniKpi label="Labour Hours" value={formatNumber(projectTotalHours(project))} />
        <MiniKpi label="Peak Crew" value={`${formatNumber(analysis.peakExact, 2)} / ${Math.ceil(analysis.peakExact)}`} />
        <MiniKpi label="Over Capacity" value={analysis.overCapacityPeriods} />
        <MiniKpi label="Status" value={project.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["overview", "tasks", "schedule", "crew", "imports"] as const).map((tab) => (
          <button key={tab} className={`min-h-10 rounded-app border px-4 font-black capitalize ${state.activeProjectTab === tab ? "border-piche-navy bg-piche-navy text-white" : "border-piche-line bg-slate-50 text-slate-600"}`} onClick={() => state.setProjectTab(tab)}>
            {tab === "crew" ? "Crew Allocation" : tab}
          </button>
        ))}
      </div>

      {state.activeProjectTab === "overview" && <OverviewTab project={project} />}
      {state.activeProjectTab === "tasks" && <TasksTab project={project} />}
      {state.activeProjectTab === "schedule" && <ScheduleTab project={project} />}
      {state.activeProjectTab === "crew" && <CrewTab project={project} />}
      {state.activeProjectTab === "imports" && <ImportsTab project={project} />}
    </section>
  );
}

function OverviewTab({ project }: { project: Project }) {
  const state = useAppStore();
  const points = aggregateProject(project, state.granularity, "crew");
  const missing = project.tasks.filter((task) => task.labourHoursMissing).length;
  const analysis = workforceAnalysis([project], state.granularity, "crew", {}, state.selectedCrewTypeIds, project.maxAvailableWorkers);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 max-xl:grid-cols-1">
      <div className="rounded-app border border-piche-line p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-xl font-black">Project Labour Curve</h3><p className="text-sm text-piche-muted">Single-project demand and capacity.</p></div>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points.map((point) => ({ label: point.label, Crew: point.crew, Capacity: project.maxAvailableWorkers }))}>
              <CartesianGrid stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Area dataKey="Crew" stroke="#c7b157" fill="#c7b157" fillOpacity={0.35} />
              <Line dataKey="Capacity" stroke="#dc2626" strokeDasharray="6 6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <aside className="grid content-start gap-4 rounded-app border border-piche-line p-5">
        <h3 className="text-xl font-black">Action Required</h3>
        {missing ? <Risk title="Missing labour hours" text={`${missing} task(s) need labour hours or total value.`} danger /> : <Risk title="Labour inputs complete" text="Every task has labour hours or a derived value." />}
        {analysis.overCapacityPeriods ? <Risk title="Peak crew warning" text={`${analysis.overCapacityPeriods} period(s) exceed ${project.maxAvailableWorkers} workers.`} danger /> : <Risk title="Capacity healthy" text="No project periods exceed the available workforce." />}
      </aside>
    </div>
  );
}

function TasksTab({ project }: { project: Project }) {
  const state = useAppStore();
  const [taskDialog, setTaskDialog] = useState<Task | null | "new">(null);
  const tasks = useMemo(() => [...project.tasks].sort((a, b) => a.sortOrder - b.sortOrder), [project.tasks]);

  const onDragEnd = (event: DragEndEvent) => {
    if (event.over?.id && event.active.id !== event.over.id) state.reorderTask(project.id, String(event.active.id), String(event.over.id));
  };

  return (
    <div className="grid gap-4">
      <div className="flex justify-end"><button className="btn-primary" onClick={() => setTaskDialog("new")}><Plus size={16} /> Add Task</button></div>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-auto rounded-app border border-piche-line">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="p-3"><ArrowDownUp size={15} /></th><th className="p-3">Task ID</th><th className="p-3">Name</th><th className="p-3">Start</th><th className="p-3">End</th><th className="p-3">Hours</th><th className="p-3">Total Value</th><th className="p-3">Source</th><th className="p-3">Last Imported</th><th className="p-3" /></tr>
              </thead>
              <tbody>
                {tasks.map((task) => <TaskRow key={task.id} task={task} project={project} onEdit={() => setTaskDialog(task)} />)}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>
      <TaskDialog open={Boolean(taskDialog)} onOpenChange={(open) => !open && setTaskDialog(null)} projectId={project.id} task={taskDialog === "new" ? undefined : taskDialog || undefined} />
    </div>
  );
}

function TaskRow({ task, project, onEdit }: { task: Task; project: Project; onEdit: () => void }) {
  const state = useAppStore();
  const sortable = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition
  };
  return (
    <tr ref={sortable.setNodeRef} style={style} className="border-t border-piche-line bg-white">
      <td className="p-3 text-slate-400"><button {...sortable.attributes} {...sortable.listeners} className="grid h-8 w-8 place-items-center rounded-app border border-piche-line" title="Drag to reorder"><ArrowDownUp size={15} /></button></td>
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
          <button className="grid h-9 w-9 place-items-center rounded-app border border-piche-line text-red-700" onClick={() => state.deleteTask(project.id, task.id)}><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  );
}

function ScheduleTab({ project }: { project: Project }) {
  const state = useAppStore();
  const periods = ganttPeriods(project, state.scheduleGranularity);
  const activeTask = project.tasks.find((task) => task.id === state.selectedScheduleTaskId) || project.tasks[0];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 max-xl:grid-cols-1">
      <div className="rounded-app border border-piche-line p-5">
        <div className="mb-4 flex justify-between gap-3">
          <div><h3 className="text-xl font-black">Gantt Schedule</h3><p className="text-sm text-piche-muted">Click a task bar for details.</p></div>
          <select className="input" value={state.scheduleGranularity} onChange={(event) => state.setField("scheduleGranularity", event.target.value as never)}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select>
        </div>
        <div className="overflow-auto rounded-app border border-piche-line">
          <div className="grid min-w-max" style={{ gridTemplateColumns: `280px repeat(${periods.length}, 86px)` }}>
            <div className="sticky left-0 z-10 bg-slate-50 p-3 text-xs font-black uppercase text-slate-500">Task</div>
            {periods.map((period) => <div key={period.key} className="border-l border-piche-line bg-slate-50 p-3 text-center text-xs font-black text-slate-500">{period.label}</div>)}
            {[...project.tasks].sort((a, b) => a.sortOrder - b.sortOrder).map((task) => {
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
      </div>
      {activeTask ? <TaskDetailPanel project={project} task={activeTask} /> : null}
    </div>
  );
}

function CrewTab({ project }: { project: Project }) {
  const state = useAppStore();
  const capacity = state.crewScenarioCapacity || project.maxAvailableWorkers;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h3 className="text-xl font-black">Crew Allocation</h3><p className="text-sm text-piche-muted">Plan demand by crew type and test a different workforce ceiling.</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <select className="input" value={state.crewDisplayMode} onChange={(event) => state.setField("crewDisplayMode", event.target.value as never)}><option value="compact">Compact</option><option value="detailed">Detailed</option></select>
          <select className="input" value={state.crewRequirementMode} onChange={(event) => state.setField("crewRequirementMode", event.target.value as never)}><option value="rounded">Rounded</option><option value="exact">Exact</option></select>
          <label className="field">What-if Capacity<input type="number" value={state.crewScenarioCapacity ?? ""} placeholder={String(project.maxAvailableWorkers)} onChange={(event) => state.setField("crewScenarioCapacity", event.target.value ? Number(event.target.value) : null)} /></label>
        </div>
      </div>
      <div className="overflow-auto rounded-app border border-piche-line">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Task</th><th className="p-3">Required Crew</th>{state.crewTypes.map((type) => <th key={type.id} className="p-3">{type.label}</th>)}<th className="p-3">Capacity</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {[...project.tasks].sort((a, b) => a.sortOrder - b.sortOrder).map((task, index) => {
              const exact = taskAverageCrew(task, project);
              const over = Math.ceil(exact) > capacity;
              return (
                <tr key={task.id} className="border-t border-piche-line">
                  <td className="p-3"><strong>{task.id}</strong><span className="block text-sm text-piche-muted">{task.name}</span></td>
                  <td className="p-3 font-black">{state.crewRequirementMode === "rounded" ? Math.ceil(exact) : formatNumber(exact, 2)}</td>
                  {state.crewTypes.map((type) => <td key={type.id} className="p-3">{state.crewDisplayMode === "detailed" ? <input className="input w-24" type="number" min={0} step={0.25} value={task.crewAllocation[type.id] || 0} onChange={(event) => state.updateTask(project.id, task.id, { crewAllocation: { ...task.crewAllocation, [type.id]: Number(event.target.value) } })} /> : formatNumber(task.crewAllocation[type.id] || 0, 1)}</td>)}
                  <td className="p-3"><StatusBadge status={over ? "Over Capacity" : "Healthy"} /></td>
                  <td className="p-3">{index ? <button className="btn-secondary" onClick={() => state.copyAllocationFromAbove(project.id, task.id)}>Copy from above</button> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportsTab({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="text-xl font-black">Schedule Imports</h3><p className="text-sm text-piche-muted">Imports update names and dates only. Labour hours are never overwritten.</p></div>
        <button className="btn-primary" onClick={() => setOpen(true)}><FileUp size={16} /> Import Schedule</button>
      </div>
      <div className="overflow-auto rounded-app border border-piche-line">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">File</th><th className="p-3">Date</th><th className="p-3">New</th><th className="p-3">Updated</th><th className="p-3">Skipped</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {project.scheduleImports.map((item) => <tr key={item.id} className="border-t border-piche-line"><td className="p-3 font-bold">{item.fileName}</td><td className="p-3">{formatDate(item.importedAt)}</td><td className="p-3">{item.newTasks}</td><td className="p-3">{item.updatedTasks}</td><td className="p-3">{item.skipped}</td><td className="p-3"><StatusBadge status="Complete" /></td></tr>)}
          </tbody>
        </table>
      </div>
      <ImportWizard open={open} onOpenChange={setOpen} project={project} />
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

function MiniKpi({ label, value }: { label: string; value: string | number }) {
  return <article className="rounded-app border border-piche-line bg-slate-50 p-4"><span className="text-xs font-black uppercase text-slate-500">{label}</span><strong className="mt-2 block text-xl font-black text-piche-navy">{value}</strong></article>;
}

function Risk({ title, text, danger }: { title: string; text: string; danger?: boolean }) {
  return <article className={`rounded-app border p-4 ${danger ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}><strong>{title}</strong><p className="mt-1 text-sm text-piche-muted">{text}</p></article>;
}
