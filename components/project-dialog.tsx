"use client";

import { useEffect, useState } from "react";
import { projectAreas } from "@/lib/constants";
import { today } from "@/lib/dates";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";

type ProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
};

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const managers = useAppStore((state) => state.managers);
  const role = useAppStore((state) => state.role);
  const currentUserManagerId = useAppStore((state) => state.currentUserManagerId);
  const createProject = useAppStore((state) => state.createProject);
  const updateProject = useAppStore((state) => state.updateProject);
  const [form, setForm] = useState({
    name: "",
    managerId: currentUserManagerId,
    area: "Calgary",
    cityName: "",
    status: "Planning",
    startDate: today(),
    endDate: today(30),
    dailyHoursPerWorker: 10,
    avgHourlyRate: 80,
    maxAvailableWorkers: 20
  });

  useEffect(() => {
    if (!project) return;
    setForm({
      name: project.name,
      managerId: project.managerId,
      area: project.area,
      cityName: project.cityName,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      dailyHoursPerWorker: project.dailyHoursPerWorker,
      avgHourlyRate: project.avgHourlyRate,
      maxAvailableWorkers: project.maxAvailableWorkers
    });
  }, [project]);

  const managerOptions = role === "vp" ? managers : managers.filter((manager) => manager.id === currentUserManagerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={project ? "Edit Project" : "Create Project"} description="Set core project planning values once. Task labour curves use these values automatically.">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (project) updateProject(project.id, form as Project);
          else createProject(form as never);
          onOpenChange(false);
        }}
      >
        <label className="field">Project Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="field">Manager<select value={form.managerId} onChange={(event) => setForm({ ...form, managerId: event.target.value })}>{managerOptions.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>
          <label className="field">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Active</option><option>At Risk</option><option>Planning</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="field">Area<select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>{projectAreas.map((area) => <option key={area}>{area}</option>)}</select></label>
          <label className="field">City<input value={form.cityName} onChange={(event) => setForm({ ...form, cityName: event.target.value })} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="field">Start Date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
          <label className="field">End Date<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
        </div>
        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          <label className="field">Hours / Worker<input type="number" min={1} value={form.dailyHoursPerWorker} onChange={(event) => setForm({ ...form, dailyHoursPerWorker: Number(event.target.value) })} /></label>
          <label className="field">Avg Rate CAD<input type="number" min={1} value={form.avgHourlyRate} onChange={(event) => setForm({ ...form, avgHourlyRate: Number(event.target.value) })} /></label>
          <label className="field">Max Workers<input type="number" min={1} value={form.maxAvailableWorkers} onChange={(event) => setForm({ ...form, maxAvailableWorkers: Number(event.target.value) })} /></label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button>
          <button className="btn-primary">{project ? "Save Project" : "Create Project"}</button>
        </div>
      </form>
    </Dialog>
  );
}
