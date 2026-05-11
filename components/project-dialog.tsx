"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
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

type ManagerOption = { id: string; name: string };

// Field-level help text shown below numeric inputs
const fieldHelp: Record<string, string> = {
  dailyHoursPerWorker: "Average hours one worker contributes to this project per day.",
  avgHourlyRate: "Average hourly cost per worker in CAD, used for budget estimates.",
  maxAvailableWorkers: "Maximum number of workers allowed on site at any one time."
};

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const role = useAppStore((state) => state.role);
  const currentUserManagerId = useAppStore((state) => state.currentUserManagerId);
  const createProject = useAppStore((state) => state.createProject);
  const updateProject = useAppStore((state) => state.updateProject);
  const [form, setForm] = useState({ ...emptyProjectForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [managers, setManagers] = useState<ManagerOption[]>([]);

  // Fetch fresh managers from the DB every time the dialog opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/managers")
      .then((r) => r.json())
      .then((payload) => { if (payload.managers) setManagers(payload.managers); })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setTouched({});
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

  const managerOptions = (role === "vp" || role === "admin") ? managers : managers.filter((manager) => manager.id === currentUserManagerId);

  // Validate a single field on blur
  const validateField = (name: string, value: string) => {
    const fieldErrors = validateProjectForm({ ...form, [name]: value });
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors[name]) next[name] = fieldErrors[name];
      else delete next[name];
      return next;
    });
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleBlur = (name: string) => validateField(name, form[name as keyof typeof form]);

  // Required fields for the submit button guard
  const requiredFields = ["name", "managerId", "area", "cityName", "status", "startDate", "endDate", "dailyHoursPerWorker", "avgHourlyRate", "maxAvailableWorkers"] as const;
  const allFilled = requiredFields.every((key) => {
    const v = form[key];
    if (!v || !String(v).trim()) return false;
    if (["dailyHoursPerWorker", "avgHourlyRate", "maxAvailableWorkers"].includes(key)) return Number(v) > 0;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={project ? "Edit Project" : "Create Project"} description="Set core project planning values once. Task labour curves use these values automatically.">
      <form
        className="grid gap-4 overflow-hidden"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          const nextErrors = validateProjectForm(form);
          setErrors(nextErrors);
          setTouched(Object.fromEntries(requiredFields.map((k) => [k, true])));
          if (Object.keys(nextErrors).length) return;
          const payload = {
            ...form,
            status: form.status as Project["status"],
            dailyHoursPerWorker: Number(form.dailyHoursPerWorker),
            avgHourlyRate: Number(form.avgHourlyRate),
            maxAvailableWorkers: Number(form.maxAvailableWorkers)
          };
          setSaving(true);
          try {
            if (project) {
              const response = await fetch(`/api/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error || "Could not update project.");
              updateProject(project.id, result.project as Project);
            } else {
              const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error || "Could not create project.");
              createProject(result.project);
            }
            onOpenChange(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save project.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <FieldError label="Project Name" error={touched.name ? errors.name : undefined} required>
          <input
            value={form.name}
            placeholder="Enter project name"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            onBlur={() => handleBlur("name")}
          />
        </FieldError>

        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <FieldError label="Manager" error={touched.managerId ? errors.managerId : undefined} required>
            <select value={form.managerId} onChange={(event) => setForm({ ...form, managerId: event.target.value })} onBlur={() => handleBlur("managerId")}>
              <option value="">Choose manager</option>
              {managerOptions.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
            </select>
          </FieldError>
          <FieldError label="Status" error={touched.status ? errors.status : undefined} required>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} onBlur={() => handleBlur("status")}>
              <option value="">Choose status</option>
              <option>Active</option>
              <option>At Risk</option>
              <option>Planning</option>
            </select>
          </FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <FieldError label="Area" error={touched.area ? errors.area : undefined} required>
            <select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} onBlur={() => handleBlur("area")}>
              <option value="">Choose area</option>
              {projectAreas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </FieldError>
          <FieldError label="City" error={touched.cityName ? errors.cityName : undefined} required>
            <input value={form.cityName} placeholder="Enter city" onChange={(event) => setForm({ ...form, cityName: event.target.value })} onBlur={() => handleBlur("cityName")} />
          </FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <FieldError label="Start Date" error={touched.startDate ? errors.startDate : undefined} required>
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} onBlur={() => handleBlur("startDate")} />
          </FieldError>
          <FieldError label="End Date" error={touched.endDate ? errors.endDate : undefined} required>
            <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} onBlur={() => handleBlur("endDate")} />
          </FieldError>
        </div>

        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          <FieldError label="Hours / Worker" error={touched.dailyHoursPerWorker ? errors.dailyHoursPerWorker : undefined} required hint={fieldHelp.dailyHoursPerWorker}>
            <input type="number" min={1} value={form.dailyHoursPerWorker} placeholder="e.g. 10" onChange={(event) => setForm({ ...form, dailyHoursPerWorker: event.target.value })} onBlur={() => handleBlur("dailyHoursPerWorker")} />
          </FieldError>
          <FieldError label="Avg Rate CAD" error={touched.avgHourlyRate ? errors.avgHourlyRate : undefined} required hint={fieldHelp.avgHourlyRate}>
            <input type="number" min={1} value={form.avgHourlyRate} placeholder="e.g. 80" onChange={(event) => setForm({ ...form, avgHourlyRate: event.target.value })} onBlur={() => handleBlur("avgHourlyRate")} />
          </FieldError>
          <FieldError label="Max Workers" error={touched.maxAvailableWorkers ? errors.maxAvailableWorkers : undefined} required hint={fieldHelp.maxAvailableWorkers}>
            <input type="number" min={1} value={form.maxAvailableWorkers} placeholder="e.g. 20" onChange={(event) => setForm({ ...form, maxAvailableWorkers: event.target.value })} onBlur={() => handleBlur("maxAvailableWorkers")} />
          </FieldError>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</button>
          <button
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || !allFilled}
            title={!allFilled ? "Fill in all required fields to continue" : undefined}
          >
            {saving ? "Saving..." : project ? "Save Project" : "Create Project"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function FieldError({
  label,
  error,
  required,
  hint,
  children
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <label className="field">
      <span className="flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-600 font-black">*</span>}
        {hint && (
          <span className="relative inline-flex">
            <button
              type="button"
              className="grid h-4 w-4 place-items-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600 hover:bg-slate-300"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              tabIndex={-1}
            >
              <Info size={10} />
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-app border border-piche-line bg-white p-3 text-xs font-medium text-piche-muted shadow-soft">
                {hint}
              </div>
            )}
          </span>
        )}
        {error && <small className="ml-auto text-xs font-bold text-red-700">{error}</small>}
      </span>
      <div className={`[&>*]:w-full ${error ? "[&>*]:border-red-400 [&>*]:bg-red-50 [&>*]:focus:border-red-500 [&>*]:focus:ring-red-100" : ""}`}>
        {children}
      </div>
      {hint && !error && (
        <p className="mt-1 text-xs text-piche-muted">{hint}</p>
      )}
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
  if (!form.name.trim()) errors.name = "This field is required";
  if (!form.managerId) errors.managerId = "This field is required";
  if (!form.status) errors.status = "This field is required";
  if (!form.area) errors.area = "This field is required";
  if (!form.cityName.trim()) errors.cityName = "This field is required";
  if (!form.startDate) errors.startDate = "This field is required";
  if (!form.endDate) errors.endDate = "This field is required";
  if (form.startDate && form.endDate && form.startDate > form.endDate) errors.endDate = "Must be after start date";
  if (!form.dailyHoursPerWorker || Number(form.dailyHoursPerWorker) <= 0) errors.dailyHoursPerWorker = "Must be a number greater than 0";
  if (!form.avgHourlyRate || Number(form.avgHourlyRate) <= 0) errors.avgHourlyRate = "Must be a number greater than 0";
  if (!form.maxAvailableWorkers || Number(form.maxAvailableWorkers) <= 0) errors.maxAvailableWorkers = "Must be a number greater than 0";
  return errors;
}
