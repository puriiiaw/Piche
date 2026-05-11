"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, ChevronDown, FileDown, UsersRound, X } from "lucide-react";
import { exportDashboardPDF } from "@/lib/export/dashboard-pdf";
import { projectAreas } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { capacityForProjects, dashboardRange, taskAverageCrew } from "@/lib/labour";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";

type DashboardPayload = {
  chartData: Record<string, string | number>[];
  analysis: {
    peakExact: number;
    overCapacityPeriods: number;
    riskLevel: string;
    peaks: { label: string; crew: number; rounded: number; contributors: { id: string; name: string; value: number }[] }[];
  };
  totalHours: number;
  thisWeekPeak: number;
  capacity: number;
  projectMix: { id: string; name: string; totalHours: number }[];
  nextThreeWeeks: { startLabel: string; endLabel: string; startIso: string; endIso: string; peakCrew: number }[];
};

type SelectedWeek = {
  index: number;
  startLabel: string;
  endLabel: string;
  startIso: string;
  endIso: string;
  peakCrew: number;
};

export function DashboardView() {
  const state = useAppStore();
  const [selectedWeek, setSelectedWeek] = useState<SelectedWeek | null>(null);
  const [exporting, setExporting] = useState(false);

  const visibleProjects = useMemo(() => {
    if (state.role === "vp" || state.role === "admin") return state.projects;
    const assigned = new Set(state.currentUserAssignedProjectIds);
    return state.projects.filter((p) => assigned.has(p.id));
  }, [state.projects, state.role, state.currentUserAssignedProjectIds]);

  const selectedProjects = useMemo(
    () => visibleProjects.filter((p) => state.selectedProjectIds.includes(p.id) && (state.dashboardArea === "all" || p.area === state.dashboardArea)),
    [visibleProjects, state.selectedProjectIds, state.dashboardArea]
  );

  const capacity = useMemo(
    () => capacityForProjects(selectedProjects, state.companyMaxCapacity, state.role === "vp" || state.role === "admin"),
    [selectedProjects, state.companyMaxCapacity, state.role]
  );

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      projectIds: selectedProjects.map((p) => p.id).join(","),
      granularity: state.granularity,
      valueMode: state.valueMode,
      window: state.dashboardWindow,
      startDate: state.dashboardStartDate || "",
      endDate: state.dashboardEndDate || "",
      crewTypeIds: state.selectedCrewTypeIds.join(","),
      capacity: String(capacity),
      taskFilter: state.dashboardTaskFilter
    });
    return `/api/company/labour-curve?${params}`;
  }, [selectedProjects, state.granularity, state.valueMode, state.dashboardWindow, state.dashboardStartDate, state.dashboardEndDate, state.selectedCrewTypeIds, capacity, state.dashboardTaskFilter]);

  // Completion stats computed client-side from store (no extra API call needed)
  const completedHours = useMemo(() =>
    selectedProjects.reduce((sum, p) => sum + p.tasks.filter((t) => t.isCompleted).reduce((s, t) => s + t.totalLabourHours, 0), 0),
    [selectedProjects]
  );
  const totalHoursAll = useMemo(() =>
    selectedProjects.reduce((sum, p) => sum + p.tasks.reduce((s, t) => s + t.totalLabourHours, 0), 0),
    [selectedProjects]
  );
  const remainingHours = totalHoursAll - completedHours;
  const completionPct = totalHoursAll > 0 ? (completedHours / totalHoursAll) * 100 : 0;

  const { data, loading } = useDashboardData(apiUrl);

  const analysis = data?.analysis;
  const Icon = analysis?.overCapacityPeriods ? AlertTriangle : CheckCircle2;

  const handleExportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportDashboardPDF(
        {
          chartData: data.chartData,
          analysis: data.analysis,
          totalHours: data.totalHours,
          thisWeekPeak: data.thisWeekPeak,
          projectMix: data.projectMix
        },
        selectedProjects,
        capacity
      );
    } finally {
      setExporting(false);
    }
  };

  // Find matching chart x-axis range for the selected week
  const weekHighlight = useMemo(() => {
    if (!selectedWeek || !data?.chartData?.length) return null;
    const inRange = data.chartData.filter((row) => {
      const sort = String(row.sort ?? "");
      return sort >= selectedWeek.startIso && sort <= selectedWeek.endIso;
    });
    if (!inRange.length) return null;
    return { x1: inRange[0].period as string, x2: inRange[inRange.length - 1].period as string };
  }, [selectedWeek, data]);

  return (
    <>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <Kpi title="Active Projects" value={selectedProjects.filter((p) => p.status !== "Planning").length} detail="Currently carrying labour" />
        {/* Labour hours with progress bar */}
        <article className="card p-5">
          <span className="text-sm font-black text-slate-500">Total Labour Hours</span>
          <strong className="mt-3 block text-3xl font-black text-piche-navy">{formatNumber(totalHoursAll)}</strong>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-piche-gold transition-all duration-500" style={{ width: `${completionPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-piche-muted">
            <span className="font-semibold text-emerald-700">{formatNumber(completedHours)} completed</span>
            {" · "}
            <span>{formatNumber(remainingHours)} remaining</span>
          </p>
        </article>
        <Kpi title="Peak Crew Needed" value={`${formatNumber(analysis?.peakExact ?? 0, 2)} / ${Math.ceil(analysis?.peakExact ?? 0)}`} detail="Exact / rounded workers" />
        <Kpi title="Crew This Week" value={`${formatNumber(data?.thisWeekPeak ?? 0, 2)} / ${Math.ceil(data?.thisWeekPeak ?? 0)}`} detail="Exact / rounded this week" />
        <Kpi title="Over-Capacity Periods" value={analysis?.overCapacityPeriods ?? 0} detail="Periods above capacity" tone={analysis?.overCapacityPeriods ? "danger" : "good"} />
        <Kpi title="Maximum Required Crew" value={Math.ceil(analysis?.peakExact ?? 0)} detail="Rounded crew required" />
        <Kpi title="Risk Level" value={analysis?.riskLevel ?? "—"} detail={`Capacity ${formatNumber(capacity)} workers`} tone={(analysis?.riskLevel ?? "").toLowerCase()} />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 max-xl:grid-cols-1">
        <div className="card p-6">
          <div className="mb-5 grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-piche-ink">Company Crew Demand</h2>
                <p className="text-piche-muted">Filter projects, crew type, area, and schedule window. Capacity periods are flagged automatically.</p>
              </div>
              <button
                className="btn-secondary shrink-0"
                onClick={handleExportPDF}
                disabled={exporting || !data}
                title="Export this dashboard as a PDF"
              >
                <FileDown size={15} />
                {exporting ? "Generating…" : "Export PDF"}
              </button>
            </div>
            <DashboardControls visibleProjects={visibleProjects} />
            {/* Task filter toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-500">Show:</span>
              <div className="inline-flex rounded-app bg-slate-100 p-1">
                {(["all", "remaining", "completed"] as const).map((f) => (
                  <button
                    key={f}
                    className={`min-h-9 rounded-md px-3 text-sm font-black capitalize ${state.dashboardTaskFilter === f ? "bg-white text-piche-goldDark shadow" : "text-slate-600"}`}
                    onClick={() => state.setField("dashboardTaskFilter", f)}
                  >
                    {f === "all" ? "All" : f === "remaining" ? "Remaining" : "Completed"}
                  </button>
                ))}
              </div>
              {state.dashboardTaskFilter !== "all" && (
                <span className="text-xs text-piche-muted">Peak Watch always uses all tasks</span>
              )}
            </div>
          </div>

          <div className="h-[380px]">
            {loading && !data ? (
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-piche-gold" />
                  <p className="text-sm font-semibold text-piche-muted">Computing labour curve…</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.chartData || []}>
                  <CartesianGrid stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedProjects.map((project, index) => (
                    <Line key={project.id} type="linear" dataKey={project.name} stroke={chartColors[index % chartColors.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
                  ))}
                  {selectedProjects.length > 1 ? (
                    <Line key="__total__" type="linear" dataKey="Total Demand" stroke="#0f172a" strokeWidth={3} dot={false} strokeDasharray="4 2" isAnimationActive={false} />
                  ) : null}
                  {state.valueMode === "crew" && capacity > 0 ? (
                    <ReferenceLine y={capacity} stroke="#dc2626" strokeDasharray="6 6" strokeWidth={2} label={{ value: `Cap: ${capacity}`, position: "insideTopRight", fill: "#dc2626", fontSize: 12, fontWeight: "bold" }} />
                  ) : null}
                  {weekHighlight ? (
                    <ReferenceArea x1={weekHighlight.x1} x2={weekHighlight.x2} fill="#c7b157" fillOpacity={0.18} stroke="#c7b157" strokeOpacity={0.4} />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {loading && data ? <p className="mt-2 text-xs font-semibold text-piche-muted">Refreshing…</p> : null}
        </div>

        <aside className="card grid content-start gap-4 p-6">
          <div>
            <h2 className="text-2xl font-black text-piche-ink">Action Required</h2>
            <p className="text-sm text-piche-muted">Click a week card to drill into details.</p>
          </div>
          <article className={`rounded-app border p-4 ${analysis?.overCapacityPeriods ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-center gap-2 font-black">
              <Icon size={18} />
              {analysis?.overCapacityPeriods ? "Capacity risk" : "Capacity healthy"}
            </div>
            <p className="mt-2 text-sm text-piche-muted">
              {analysis?.overCapacityPeriods
                ? `${analysis.overCapacityPeriods} ${state.granularity} period(s) exceed available workforce.`
                : "No over-capacity periods found in this view."}
            </p>
          </article>
          {(data?.nextThreeWeeks || []).map((week, index) => {
            const isSelected = selectedWeek?.index === index;
            return (
              <button
                key={index}
                className={`rounded-app border p-4 text-left transition hover:shadow-md ${
                  isSelected
                    ? "border-piche-gold bg-piche-gold/20 ring-2 ring-piche-gold/40"
                    : "border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100"
                }`}
                onClick={() => setSelectedWeek(isSelected ? null : { index, ...week })}
              >
                <p className="text-xs font-black uppercase text-amber-800">Week {index + 1}</p>
                <strong className="mt-1 block text-2xl text-amber-900">{formatNumber(week.peakCrew, 1)} workers</strong>
                <p className="mt-1 text-sm text-amber-900">{week.startLabel} to {week.endLabel}</p>
                <p className="mt-1 text-xs font-semibold text-amber-700">{isSelected ? "Click to dismiss" : "Click for details →"}</p>
              </button>
            );
          })}
        </aside>
      </section>

      <section className="grid grid-cols-2 gap-6 max-xl:grid-cols-1">
        <div className="card p-6">
          <h2 className="text-xl font-black text-piche-ink">Peak Watch</h2>
          <div className="mt-4 overflow-auto rounded-app border border-piche-line">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="p-3">Period</th><th className="p-3">Exact</th><th className="p-3">Rounded</th><th className="p-3">Contributors</th></tr>
              </thead>
              <tbody>
                {(analysis?.peaks || []).map((peak) => (
                  <tr key={peak.label} className="border-t border-piche-line">
                    <td className="p-3 font-bold">{peak.label}</td>
                    <td className="p-3">{formatNumber(peak.crew, 2)}</td>
                    <td className="p-3">{peak.rounded}</td>
                    <td className="p-3 text-sm text-piche-muted">{peak.contributors.slice(0, 3).map((c) => `${c.name} (${formatNumber(c.value, 1)})`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black text-piche-ink">Project Mix</h2>
          <div className="mt-4 grid gap-3">
            {selectedProjects.map((project, index) => {
              const mix = data?.projectMix?.find((m) => m.id === project.id);
              return (
                <button key={project.id} className="grid min-h-14 grid-cols-[14px_1fr_auto] items-center gap-3 rounded-app border border-piche-line bg-slate-50 px-4 text-left" onClick={() => state.setProject(project.id)}>
                  <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <span className="font-bold">{project.name}</span>
                  <strong>{mix ? `${formatNumber(mix.totalHours)} hrs` : "—"}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Week detail drawer */}
      {selectedWeek ? (
        <WeekDrawer
          week={selectedWeek}
          projects={selectedProjects}
          crewTypes={state.crewTypes}
          onClose={() => setSelectedWeek(null)}
        />
      ) : null}
    </>
  );
}

function WeekDrawer({
  week,
  projects,
  crewTypes,
  onClose
}: {
  week: SelectedWeek;
  projects: Project[];
  crewTypes: { id: string; label: string }[];
  onClose: () => void;
}) {
  // Task contributors: tasks overlapping this week sorted by crew desc
  const taskContributors = useMemo(() => {
    const result: { projectName: string; taskId: string; taskName: string; crew: number }[] = [];
    for (const project of projects) {
      for (const task of project.tasks) {
        if (task.endDate >= week.startIso && task.startDate <= week.endIso) {
          const crew = taskAverageCrew(task, project);
          if (crew > 0) {
            result.push({ projectName: project.name, taskId: task.id, taskName: task.name, crew });
          }
        }
      }
    }
    return result.sort((a, b) => b.crew - a.crew).slice(0, 25);
  }, [week.startIso, week.endIso, projects]);

  // Crew type breakdown: sum crew × allocation proportion across overlapping tasks
  const crewByType = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const project of projects) {
      for (const task of project.tasks) {
        if (task.endDate >= week.startIso && task.startDate <= week.endIso) {
          const crewForTask = taskAverageCrew(task, project);
          const totalAlloc = Object.values(task.crewAllocation).reduce((sum, v) => sum + v, 0);
          if (crewForTask > 0 && totalAlloc > 0) {
            for (const [typeId, units] of Object.entries(task.crewAllocation)) {
              totals[typeId] = (totals[typeId] || 0) + crewForTask * (units / totalAlloc);
            }
          }
        }
      }
    }
    return crewTypes
      .map((type) => ({ id: type.id, label: type.label, crew: totals[type.id] || 0 }))
      .filter((t) => t.crew > 0.01)
      .sort((a, b) => b.crew - a.crew);
  }, [week.startIso, week.endIso, projects, crewTypes]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      {/* Slide-in drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl max-[640px]:max-w-full">
        <div className="flex items-start justify-between border-b border-piche-line p-6">
          <div>
            <p className="eyebrow">Week {week.index + 1} Breakdown</p>
            <h2 className="text-xl font-black text-piche-ink">{week.startLabel} — {week.endLabel}</h2>
          </div>
          <button className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-app border border-piche-line hover:bg-slate-50" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Crew summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-app border border-piche-line bg-slate-50 p-4">
              <span className="text-xs font-black uppercase text-slate-500">Exact Crew</span>
              <strong className="mt-2 block text-2xl font-black text-piche-navy">{formatNumber(week.peakCrew, 2)}</strong>
              <p className="mt-1 text-xs text-piche-muted">workers at peak</p>
            </article>
            <article className="rounded-app border border-piche-line bg-slate-50 p-4">
              <span className="text-xs font-black uppercase text-slate-500">Rounded Crew</span>
              <strong className="mt-2 block text-2xl font-black text-piche-navy">{Math.ceil(week.peakCrew)}</strong>
              <p className="mt-1 text-xs text-piche-muted">workers to assign</p>
            </article>
          </div>

          {/* Crew type breakdown */}
          {crewByType.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-black text-piche-ink">By Crew Type</h3>
              <div className="grid gap-2">
                {crewByType.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-app border border-piche-line bg-white p-3">
                    <span className="font-semibold text-piche-ink">{t.label}</span>
                    <strong className="text-piche-navy">{formatNumber(t.crew, 1)} workers</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task contributors */}
          {taskContributors.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-black text-piche-ink">Task Contributors</h3>
              <div className="grid gap-2">
                {taskContributors.map((c, i) => (
                  <div key={`${c.taskId}-${i}`} className="flex items-center justify-between rounded-app border border-piche-line bg-white p-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-piche-ink">{c.taskId}</strong>
                      <p className="truncate text-xs text-piche-muted">{c.taskName}</p>
                      {projects.length > 1 && <p className="text-xs font-semibold text-piche-goldDark">{c.projectName}</p>}
                    </div>
                    <strong className="ml-3 shrink-0 text-piche-navy">{formatNumber(c.crew, 2)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {taskContributors.length === 0 && crewByType.length === 0 && (
            <p className="mt-6 text-sm text-piche-muted">No active tasks found for this week. Tasks may be outside the displayed window.</p>
          )}
        </div>
      </div>
    </>
  );
}

function useDashboardData(url: string) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(async (r) => {
        const payload = await r.json();
        if (!r.ok) throw new Error(payload.error || "Failed to load");
        return payload as DashboardPayload;
      })
      .then((payload) => { if (!cancelled) { setData(payload); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading };
}

function DashboardControls({ visibleProjects }: { visibleProjects: Project[] }) {
  const state = useAppStore();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Segment label="Value" value={state.valueMode} options={[["crew", "Crew Needed"], ["hours", "Labour Hours"]]} onChange={(value) => state.setField("valueMode", value as never)} />
        <Segment label="Granularity" value={state.granularity} options={[["day", "Day"], ["week", "Week"], ["month", "Month"]]} onChange={(value) => state.setField("granularity", value as never)} />
        <label className="field">
          <span>Area</span>
          <select value={state.dashboardArea} onChange={(event) => state.setField("dashboardArea", event.target.value)}>
            {["all", ...projectAreas].map((area) => <option key={area} value={area}>{area === "all" ? "All areas" : area}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Window</span>
          <select value={state.dashboardWindow} onChange={(event) => state.setField("dashboardWindow", event.target.value as never)}>
            <option value="week">This Week</option>
            <option value="two">Next 2 Weeks</option>
            <option value="six">Next 6 Weeks</option>
            <option value="month">This Month</option>
            <option value="full">Full Project</option>
            <option value="custom">Custom Dates</option>
          </select>
        </label>
        <MultiSelectDropdown
          label="Projects"
          count={`${state.selectedProjectIds.filter((id) => visibleProjects.some((p) => p.id === id)).length} of ${visibleProjects.length}`}
          buttonText={selectedProjectText(visibleProjects, state.selectedProjectIds)}
          options={visibleProjects.map((p) => ({ id: p.id, label: p.name }))}
          selectedIds={state.selectedProjectIds}
          onToggle={state.toggleProjectFilter}
        />
        <MultiSelectDropdown
          label="Crew Types"
          icon={<UsersRound size={15} />}
          count={`${state.selectedCrewTypeIds.length} of ${state.crewTypes.length}`}
          buttonText={selectedCrewText(state.crewTypes, state.selectedCrewTypeIds)}
          options={state.crewTypes.map((type) => ({ id: type.id, label: type.label }))}
          selectedIds={state.selectedCrewTypeIds}
          onToggle={state.toggleCrewFilter}
        />
        {(state.role === "vp" || state.role === "admin") ? (
          <label className="field">
            <span>Company Max</span>
            <input type="number" value={state.companyMaxCapacity} onChange={(event) => state.setField("companyMaxCapacity", Number(event.target.value || 0))} />
          </label>
        ) : null}
      </div>

      {state.dashboardWindow === "custom" ? (
        <div className="flex flex-wrap gap-3">
          <label className="field"><span>From</span><input type="date" value={state.dashboardStartDate} onChange={(event) => state.setField("dashboardStartDate", event.target.value)} /></label>
          <label className="field"><span>To</span><input type="date" value={state.dashboardEndDate} onChange={(event) => state.setField("dashboardEndDate", event.target.value)} /></label>
        </div>
      ) : null}
    </div>
  );
}

function MultiSelectDropdown({
  label,
  count,
  buttonText,
  options,
  selectedIds,
  onToggle,
  icon
}: {
  label: string;
  count: string;
  buttonText: string;
  options: { id: string; label: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="field relative w-56 max-w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">{icon}{label}</span>
        <span className="text-xs font-black text-piche-goldDark">{count}</span>
      </div>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-app border border-piche-line bg-white px-3 text-left font-bold text-piche-ink"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">{buttonText}</span>
        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-auto rounded-app border border-piche-line bg-white p-2 shadow-soft">
          {options.map((option) => (
            <label key={option.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                onChange={() => onToggle(option.id)}
                className="h-4 w-4 accent-piche-goldDark"
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function selectedProjectText(projects: Project[], selectedIds: string[]) {
  const selected = projects.filter((p) => selectedIds.includes(p.id));
  if (!selected.length) return "No projects selected";
  if (selected.length === projects.length) return "All projects selected";
  if (selected.length === 1) return selected[0].name;
  return `${selected.length} projects selected`;
}

function selectedCrewText(crewTypes: { id: string; label: string }[], selectedIds: string[]) {
  const selected = crewTypes.filter((type) => selectedIds.includes(type.id));
  if (!selected.length) return "No crew types selected";
  if (selected.length === crewTypes.length) return "All crew types selected";
  if (selected.length === 1) return selected[0].label;
  return `${selected.length} crew types selected`;
}

function Segment({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="inline-flex rounded-app bg-slate-100 p-1">
        {options.map(([id, text]) => (
          <button key={id} className={`min-h-9 rounded-md px-3 text-sm font-black ${value === id ? "bg-white text-piche-goldDark shadow" : "text-slate-600"}`} onClick={() => onChange(id)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Kpi({ title, value, detail, tone }: { title: string; value: string | number; detail: string; tone?: string }) {
  const color = tone === "danger" || tone === "red" ? "text-red-700" : tone === "good" || tone === "green" ? "text-emerald-700" : tone === "yellow" ? "text-amber-700" : "text-piche-navy";
  return (
    <article className="card p-5">
      <span className="text-sm font-black text-slate-500">{title}</span>
      <strong className={`mt-3 block text-3xl font-black ${color}`}>{value}</strong>
      <p className="mt-3 text-sm text-piche-muted">{detail}</p>
    </article>
  );
}

const chartColors = ["#c7b157", "#1f6f78", "#345995", "#d97706", "#667085", "#0f766e", "#7c3aed"];
