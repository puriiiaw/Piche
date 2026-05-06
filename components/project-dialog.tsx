"use client";

import { useEffect, useState } from "react";
import { projectAreas } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import type { ReactNode } from "react";

type ProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
};

const emptyProjectForm = {
  name: "",
  managerId: "",
  area: "",
  cityName: "",
  status: "",
  startDate: "",
  endDate: "",
  dailyHoursPerWorker: "",
  avgHourlyRate: "",
  maxAvailableWorkers: ""
};

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const managers = useAppStore((state) => state.managers);
  const role = useAppStore((state) => state.role);
  const currentUserManagerId = useAppStore((state) => state.currentUserManagerId);
  const createProject = useAppStore((state) => state.createProject);
  const updateProject = useAppStore((state) => state.updateProject);
  const [form, setForm] = useState({
    ...emptyProjectForm
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (!project) {
      setForm({ ...emptyProjectForm });
      return;
    }
    setForm({
      name: project.name,
      managerId: project.managerId,
      area: project.area,
      cityName: project.cityName,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      dailyHoursPerWorker: String(project.dailyHoursPerWorker),
      avgHourlyRate: String(project.avgHourlyRate),
      maxAvailableWorkers: String(project.maxAvailableWorkers)
    });
  }, [open, project]);

  const managerOptions = role === "vp" ? managers : managers.filter((manager) => manager.id === currentUserManagerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={project ? "Edit Project" : "Create Project"} description="Set core project planning values once. Task labour curves use these values automatically.">
      <form
        className="grid gap-4 overflow-hidden"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const nextErrors = validateProjectForm(form);
          setErrors(nextErrors);
          if (Object.keys(nextErrors).length) return;
          const payload = {
            ...form,
            status: form.status as Project["status"],
            dailyHoursPerWorker: Number(form.dailyHoursPerWorker),
            avgHourlyRate: Number(form.avgHourlyRate),
            maxAvailableWorkers: Number(form.maxAvailableWorkers)
          };
          if (project) updateProject(project.id, payload as Project);
          else createProject(payload as never);
          onOpenChange(false);
        }}
      >
        {Object.keys(errors).length ? (
          <div className="rounded-app border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="block">A few details are missing.</strong>
            Please complete the highlighted fields before creating the project.
          </div>
        ) : null}
        <FieldError label="Project Name" error={errors.name}>
          <input value={form.name} placeholder="Enter project name" onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </FieldError>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <FieldError label="Manager" error={errors.managerId}>
            <select value={form.managerId} onChange={(event) => setForm({ ...form, managerId: event.target.value })}>
              <option value="">Choose manager</option>
              {managerOptions.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
            </select>
          </FieldError>
          <FieldError label="Status" error={errors.status}>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="">Choose status</option>
              <option>Active</option>
              <option>At Risk</option>
              <option>Planning</option>
            </select>
          </FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <FieldError label="Area" error={errors.area}>
            <select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>
              <option value="">Choose area</option>
              {projectAreas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </FieldError>
          <FieldError label="City" error={errors.cityName}>
            <input value={form.cityName} placeholder="Enter city" onChange={(event) => setForm({ ...form, cityName: event.target.value })} />
          </FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <FieldError label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          </FieldError>
          <FieldError label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          </FieldError>
        </div>
        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          <FieldError label="Hours / Worker" error={errors.dailyHoursPerWorker}>
            <input type="number" min={1} value={form.dailyHoursPerWorker} placeholder="e.g. 10" onChange={(event) => setForm({ ...form, dailyHoursPerWorker: event.target.value })} />
          </FieldError>
          <FieldError label="Avg Rate CAD" error={errors.avgHourlyRate}>
            <input type="number" min={1} value={form.avgHourlyRate} placeholder="e.g. 80" onChange={(event) => setForm({ ...form, avgHourlyRate: event.target.value })} />
          </FieldError>
          <FieldError label="Max Workers" error={errors.maxAvailableWorkers}>
            <input type="number" min={1} value={form.maxAvailableWorkers} placeholder="e.g. 20" onChange={(event) => setForm({ ...form, maxAvailableWorkers: event.target.value })} />
          </FieldError>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button>
          <button className="btn-primary">{project ? "Save Project" : "Create Project"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function FieldError({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="flex items-center justify-between gap-2">
        {label}
        {error ? <small className="text-xs font-bold text-red-700">{error}</small> : null}
      </span>
      <div className={`[&>*]:w-full ${error ? "[&>*]:border-red-400 [&>*]:bg-red-50 [&>*]:focus:border-red-500 [&>*]:focus:ring-red-100" : ""}`}>
        {children}
      </div>
    </label>
  );
}

function validateProjectForm(form: {
  name: string;
  managerId: string;
  area: string;
  cityName: string;
  status: string;
  startDate: string;
  endDate: string;
  dailyHoursPerWorker: string;
  avgHourlyRate: string;
  maxAvailableWorkers: string;
}) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Required";
  if (!form.managerId) errors.managerId = "Required";
  if (!form.status) errors.status = "Required";
  if (!form.area) errors.area = "Required";
  if (!form.cityName.trim()) errors.cityName = "Required";
  if (!form.startDate) errors.startDate = "Required";
  if (!form.endDate) errors.endDate = "Required";
  if (form.startDate && form.endDate && form.startDate > form.endDate) errors.endDate = "After start";
  if (!form.dailyHoursPerWorker || Number(form.dailyHoursPerWorker) <= 0) errors.dailyHoursPerWorker = "Required";
  if (!form.avgHourlyRate || Number(form.avgHourlyRate) <= 0) errors.avgHourlyRate = "Required";
  if (!form.maxAvailableWorkers || Number(form.maxAvailableWorkers) <= 0) errors.maxAvailableWorkers = "Required";
  return errors;
}
