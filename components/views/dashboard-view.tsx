"use client";

import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Eye, UsersRound } from "lucide-react";
import { projectAreas } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { capacityForProjects, dashboardRange, nextThreeWeekPeaks, projectTotalHours, workforceAnalysis } from "@/lib/labour";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";

export function DashboardView() {
  const state = useAppStore();
  const visibleProjects = state.role === "vp" ? state.projects : state.projects.filter((project) => project.managerId === state.currentUserManagerId);
  const selectedProjects = visibleProjects.filter((project) => state.selectedProjectIds.includes(project.id) && (state.dashboardArea === "all" || project.area === state.dashboardArea));
  const range = dashboardRange(state.dashboardWindow, state.dashboardStartDate, state.dashboardEndDate);
  const capacity = capacityForProjects(selectedProjects, state.companyMaxCapacity, state.role === "vp");
  const analysis = workforceAnalysis(selectedProjects, state.granularity, state.valueMode, range, state.selectedCrewTypeIds, capacity);
  const chartData = buildChartData(selectedProjects, state, range);
  const totalHours = selectedProjects.reduce((sum, project) => sum + projectTotalHours(project), 0);
  const thisWeek = workforceAnalysis(selectedProjects, "week", "crew", dashboardRange("week"), state.selectedCrewTypeIds, capacity).peakExact;
  const Icon = analysis.overCapacityPeriods ? AlertTriangle : CheckCircle2;

  return (
    <>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <Kpi title="Active Projects" value={selectedProjects.filter((project) => project.status !== "Planning").length} detail="Currently carrying labour" />
        <Kpi title="Total Labour Hours" value={formatNumber(totalHours)} detail="Across selected projects" />
        <Kpi title="Peak Crew Needed" value={`${formatNumber(analysis.peakExact, 2)} / ${Math.ceil(analysis.peakExact)}`} detail="Exact / rounded workers" />
        <Kpi title="Crew This Week" value={`${formatNumber(thisWeek, 2)} / ${Math.ceil(thisWeek)}`} detail="Exact / rounded this week" />
        <Kpi title="Over-Capacity Periods" value={analysis.overCapacityPeriods} detail="Periods above capacity" tone={analysis.overCapacityPeriods ? "danger" : "good"} />
        <Kpi title="Maximum Required Crew" value={Math.ceil(analysis.peakExact)} detail="Rounded crew required" />
        <Kpi title="Risk Level" value={analysis.riskLevel} detail={`Capacity ${formatNumber(capacity)} workers`} tone={analysis.riskLevel.toLowerCase()} />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 max-xl:grid-cols-1">
        <div className="card p-6">
          <div className="mb-5 grid gap-5">
            <div>
              <h2 className="text-2xl font-black text-piche-ink">Company Crew Demand</h2>
              <p className="text-piche-muted">Filter projects, crew type, area, and schedule window. Capacity periods are flagged automatically.</p>
            </div>
            <DashboardControls visibleProjects={visibleProjects} />
          </div>

          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              {state.chartMode === "split" ? (
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedProjects.map((project, index) => <Line key={project.id} type="monotone" dataKey={project.name} stroke={chartColors[index % chartColors.length]} strokeWidth={3} dot={false} />)}
                </LineChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedProjects.map((project, index) => (
                    <Area key={project.id} type="monotone" dataKey={project.name} stackId={state.chartMode === "stacked" ? "1" : project.id} stroke={chartColors[index % chartColors.length]} fill={chartColors[index % chartColors.length]} fillOpacity={0.35} />
                  ))}
                  {state.valueMode === "crew" ? <Line type="monotone" dataKey="Capacity" stroke="#dc2626" strokeDasharray="6 6" strokeWidth={2} dot={false} /> : null}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <aside className="card grid content-start gap-4 p-6">
          <div>
            <h2 className="text-2xl font-black text-piche-ink">Action Required</h2>
            <p className="text-sm text-piche-muted">Immediate risk signals from the current filter.</p>
          </div>
          <article className={`rounded-app border p-4 ${analysis.overCapacityPeriods ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-center gap-2 font-black">
              <Icon size={18} />
              {analysis.overCapacityPeriods ? "Capacity risk" : "Capacity healthy"}
            </div>
            <p className="mt-2 text-sm text-piche-muted">
              {analysis.overCapacityPeriods ? `${analysis.overCapacityPeriods} ${state.granularity} period(s) exceed available workforce.` : "No over-capacity periods found in this view."}
            </p>
          </article>
          {nextThreeWeekPeaks(selectedProjects).map((week, index) => (
            <article key={index} className="rounded-app border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase text-amber-800">Week {index + 1}</p>
              <strong className="mt-1 block text-2xl text-amber-900">{formatNumber(week.peak?.crew ?? 0, 1)} workers</strong>
              <p className="mt-1 text-sm text-amber-900">{week.startLabel} to {week.endLabel}</p>
            </article>
          ))}
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
                {analysis.peaks.map((peak) => (
                  <tr key={peak.label} className="border-t border-piche-line">
                    <td className="p-3 font-bold">{peak.label}</td>
                    <td className="p-3">{formatNumber(peak.crew, 2)}</td>
                    <td className="p-3">{peak.rounded}</td>
                    <td className="p-3 text-sm text-piche-muted">{peak.contributors.slice(0, 3).map((item) => `${item.name} (${formatNumber(item.value, 1)})`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black text-piche-ink">Project Mix</h2>
          <div className="mt-4 grid gap-3">
            {selectedProjects.map((project, index) => (
              <button key={project.id} className="grid min-h-14 grid-cols-[14px_1fr_auto] items-center gap-3 rounded-app border border-piche-line bg-slate-50 px-4 text-left" onClick={() => state.setProject(project.id)}>
                <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="font-bold">{project.name}</span>
                <strong>{formatNumber(projectTotalHours(project))} hrs</strong>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function DashboardControls({ visibleProjects }: { visibleProjects: Project[] }) {
  const state = useAppStore();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Segment label="Chart" value={state.chartMode} options={[["combined", "Combined"], ["stacked", "Stacked"], ["split", "Split"]]} onChange={(value) => state.setField("chartMode", value as never)} />
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
        {state.role === "vp" ? (
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

      <div className="rounded-app border border-piche-line bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase text-slate-500">Projects</p>
          <span className="text-xs font-black text-piche-goldDark">{state.selectedProjectIds.length} of {visibleProjects.length}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleProjects.map((project) => (
            <button key={project.id} className={`rounded-full border px-3 py-2 text-sm font-bold ${state.selectedProjectIds.includes(project.id) ? "border-piche-gold bg-piche-gold/15 text-piche-navy" : "border-piche-line bg-white text-slate-600"}`} onClick={() => state.toggleProjectFilter(project.id)}>
              {project.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-app border border-piche-line bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500"><UsersRound size={15} /> Crew Types</div>
        <div className="flex flex-wrap gap-2">
          {state.crewTypes.map((type) => (
            <button key={type.id} className={`rounded-full border px-3 py-2 text-sm font-bold ${state.selectedCrewTypeIds.includes(type.id) ? "border-piche-gold bg-piche-gold/15 text-piche-navy" : "border-piche-line bg-white text-slate-600"}`} onClick={() => state.toggleCrewFilter(type.id)}>
              {type.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Segment({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="inline-flex rounded-app bg-slate-100 p-1">
        {options.map(([id, text]) => <button key={id} className={`min-h-9 rounded-md px-3 text-sm font-black ${value === id ? "bg-white text-piche-goldDark shadow" : "text-slate-600"}`} onClick={() => onChange(id)}>{text}</button>)}
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

function buildChartData(projects: Project[], state: ReturnType<typeof useAppStore.getState>, range: ReturnType<typeof dashboardRange>) {
  const labelMap = new Map<string, Record<string, string | number>>();
  projects.forEach((project) => {
    const points = workforceAnalysis([project], state.granularity, state.valueMode, range, state.selectedCrewTypeIds, project.maxAvailableWorkers).periods;
    points.forEach((point) => {
      const row = labelMap.get(point.label) || { label: point.label, sort: point.sort, Capacity: state.companyMaxCapacity };
      row[project.name] = point.value;
      labelMap.set(point.label, row);
    });
  });
  return Array.from(labelMap.values()).sort((a, b) => String(a.sort).localeCompare(String(b.sort)));
}

const chartColors = ["#c7b157", "#1f6f78", "#345995", "#d97706", "#667085", "#0f766e", "#7c3aed"];
