"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { crewTypes } from "@/lib/constants";
import { maxDate, minDate, today } from "@/lib/dates";
import { slug } from "@/lib/format";
import { initialState } from "@/lib/seed";
import type { AppState, CrewType, ImportReviewRow, Project, ProjectStatus, Task } from "@/lib/types";

type UndoState = null | { type: "project"; item: Project; message: string } | { type: "task"; projectId: string; item: Task; message: string };

type AppStore = AppState & {
  undo: UndoState;
  importRows: ImportReviewRow[];
  importStep: 1 | 2 | 3;
  importFileName: string;
  setRole: (role: AppState["role"]) => void;
  setView: (view: AppState["activeView"]) => void;
  setProject: (projectId: string) => void;
  setProjectTab: (tab: AppState["activeProjectTab"]) => void;
  setField: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  toggleProjectFilter: (projectId: string) => void;
  toggleCrewFilter: (crewTypeId: string) => void;
  createProject: (project: Omit<Project, "id" | "tasks" | "scheduleImports"> & { id?: string }) => void;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  createTask: (projectId: string, task: Partial<Task> & Pick<Task, "id" | "name" | "startDate" | "endDate">) => void;
  updateTask: (projectId: string, taskId: string, patch: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  reorderTask: (projectId: string, activeId: string, overId: string) => void;
  copyAllocationFromAbove: (projectId: string, taskId: string) => void;
  addCrewType: (label: string) => void;
  removeCrewType: (crewTypeId: string) => void;
  restoreUndo: () => void;
  resetDemo: () => void;
  setImportRows: (projectId: string, fileName: string, rows: ImportReviewRow[]) => void;
  setImportStep: (step: 1 | 2 | 3) => void;
  toggleImportRow: (rowId: string) => void;
  selectImportRows: (mode: "all" | "none" | "new") => void;
  applyImportRows: (projectId: string) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      undo: null,
      importRows: [],
      importStep: 1,
      importFileName: "",
      setRole: (role) => set((state) => ({
        role,
        activeView: role === "pm" && (state.activeView === "settings" || state.activeView === "access") ? "dashboard" : state.activeView
      })),
      setView: (activeView) => set({ activeView }),
      setProject: (activeProjectId) => set({ activeProjectId, activeView: "projects" }),
      setProjectTab: (activeProjectTab) => set({ activeProjectTab }),
      setField: (key, value) => set({ [key]: value } as Pick<AppStore, typeof key>),
      toggleProjectFilter: (projectId) => set((state) => {
        const selected = new Set(state.selectedProjectIds);
        selected.has(projectId) ? selected.delete(projectId) : selected.add(projectId);
        return { selectedProjectIds: Array.from(selected) };
      }),
      toggleCrewFilter: (crewTypeId) => set((state) => {
        const selected = new Set(state.selectedCrewTypeIds);
        selected.has(crewTypeId) ? selected.delete(crewTypeId) : selected.add(crewTypeId);
        return { selectedCrewTypeIds: Array.from(selected) };
      }),
      createProject: (project) => set((state) => {
        const id = project.id || slug(project.name);
        const next: Project = { ...project, id, tasks: [], scheduleImports: [] };
        return { projects: [...state.projects, next], activeProjectId: id, activeView: "projects" };
      }),
      updateProject: (projectId, patch) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? { ...project, ...patch } : project)
      })),
      deleteProject: (projectId) => set((state) => {
        const item = state.projects.find((project) => project.id === projectId);
        if (!item) return {};
        const projects = state.projects.filter((project) => project.id !== projectId);
        return {
          projects,
          activeProjectId: projects[0]?.id || "",
          undo: { type: "project", item, message: `Deleted ${item.name}` }
        };
      }),
      createTask: (projectId, task) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project;
          const nextTask = normalizeTaskForProject(project, {
            ...blankTask(project.tasks.length + 1),
            ...task,
            sortOrder: project.tasks.length + 1
          });
          const tasks = [...project.tasks, nextTask];
          return { ...project, tasks, startDate: minDate(tasks.map((item) => item.startDate)), endDate: maxDate(tasks.map((item) => item.endDate)) };
        })
      })),
      updateTask: (projectId, taskId, patch) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project;
          const tasks = project.tasks.map((task) => task.id === taskId ? normalizeTaskForProject(project, { ...task, ...patch }) : task);
          return { ...project, tasks, startDate: minDate(tasks.map((item) => item.startDate)), endDate: maxDate(tasks.map((item) => item.endDate)) };
        })
      })),
      deleteTask: (projectId, taskId) => set((state) => {
        const project = state.projects.find((item) => item.id === projectId);
        const item = project?.tasks.find((task) => task.id === taskId);
        if (!project || !item) return {};
        return {
          projects: state.projects.map((entry) => entry.id === projectId ? { ...entry, tasks: entry.tasks.filter((task) => task.id !== taskId) } : entry),
          undo: { type: "task", projectId, item, message: `Deleted ${item.name}` }
        };
      }),
      reorderTask: (projectId, activeId, overId) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project;
          const tasks = [...project.tasks].sort((a, b) => a.sortOrder - b.sortOrder);
          const from = tasks.findIndex((task) => task.id === activeId);
          const to = tasks.findIndex((task) => task.id === overId);
          if (from < 0 || to < 0) return project;
          const [moved] = tasks.splice(from, 1);
          tasks.splice(to, 0, moved);
          return { ...project, tasks: tasks.map((task, index) => ({ ...task, sortOrder: index + 1 })) };
        })
      })),
      copyAllocationFromAbove: (projectId, taskId) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project;
          const ordered = [...project.tasks].sort((a, b) => a.sortOrder - b.sortOrder);
          const index = ordered.findIndex((task) => task.id === taskId);
          if (index <= 0) return project;
          const previous = ordered[index - 1];
          return { ...project, tasks: project.tasks.map((task) => task.id === taskId ? { ...task, crewAllocation: { ...previous.crewAllocation } } : task) };
        })
      })),
      addCrewType: (label) => set((state) => {
        const id = slug(label);
        if (!label.trim() || state.crewTypes.some((type) => type.id === id)) return {};
        const type: CrewType = { id, label };
        return {
          crewTypes: [...state.crewTypes, type],
          selectedCrewTypeIds: [...state.selectedCrewTypeIds, id],
          projects: state.projects.map((project) => ({
            ...project,
            tasks: project.tasks.map((task) => ({ ...task, crewAllocation: { ...task.crewAllocation, [id]: 0 } }))
          }))
        };
      }),
      removeCrewType: (crewTypeId) => set((state) => ({
        crewTypes: state.crewTypes.filter((type) => type.id !== crewTypeId),
        selectedCrewTypeIds: state.selectedCrewTypeIds.filter((id) => id !== crewTypeId),
        projects: state.projects.map((project) => ({
          ...project,
          tasks: project.tasks.map((task) => {
            const crewAllocation = { ...task.crewAllocation };
            delete crewAllocation[crewTypeId];
            return { ...task, crewAllocation };
          })
        }))
      })),
      restoreUndo: () => set((state) => {
        const undo = state.undo;
        if (!undo) return {};
        if (undo.type === "project") return { projects: [...state.projects, undo.item], undo: null };
        return {
          projects: state.projects.map((project) => project.id === undo.projectId ? { ...project, tasks: [...project.tasks, undo.item] } : project),
          undo: null
        };
      }),
      resetDemo: () => set({ ...initialState, undo: null, importRows: [], importStep: 1, importFileName: "" }),
      setImportRows: (_projectId, fileName, rows) => set({ importFileName: fileName, importRows: rows, importStep: 2 }),
      setImportStep: (importStep) => set({ importStep }),
      toggleImportRow: (rowId) => set((state) => ({
        importRows: state.importRows.map((row) => row.id === rowId ? { ...row, selected: !row.selected } : row)
      })),
      selectImportRows: (mode) => set((state) => ({
        importRows: state.importRows.map((row) => ({ ...row, selected: mode === "all" || (mode === "new" && row.changeType === "new") }))
      })),
      applyImportRows: (projectId) => set((state) => {
        const selected = state.importRows.filter((row) => row.selected);
        const batchId = `import-${Date.now()}`;
        const newTasks = selected.filter((row) => row.changeType === "new").length;
        const updatedTasks = selected.filter((row) => row.changeType === "changed").length;
        return {
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project;
            let tasks = [...project.tasks];
            selected.forEach((row) => {
              const existingIndex = tasks.findIndex((task) => task.id === row.id);
              if (existingIndex >= 0) {
                tasks[existingIndex] = normalizeTaskForProject(project, {
                  ...tasks[existingIndex],
                  name: row.name,
                  startDate: row.startDate,
                  endDate: row.endDate,
                  source: "import",
                  lastImportedAt: today(),
                  scheduleImportBatchId: batchId
                });
              } else {
                tasks.push(normalizeTaskForProject(project, {
                  ...blankTask(tasks.length + 1),
                  id: row.id,
                  name: row.name,
                  startDate: row.startDate,
                  endDate: row.endDate,
                  totalValue: row.totalValue,
                  source: "import",
                  lastImportedAt: today(),
                  scheduleImportBatchId: batchId,
                  sortOrder: tasks.length + 1
                }));
              }
            });
            return {
              ...project,
              tasks,
              startDate: minDate(tasks.map((task) => task.startDate)),
              endDate: maxDate(tasks.map((task) => task.endDate)),
              scheduleImports: [{
                id: batchId,
                fileName: state.importFileName || "Schedule import",
                importedAt: today(),
                newTasks,
                updatedTasks,
                skipped: state.importRows.length - selected.length,
                status: "Complete"
              }, ...project.scheduleImports]
            };
          }),
          importStep: 1,
          importRows: [],
          importFileName: ""
        };
      })
    }),
    {
      name: "piche-build-app-state-v1",
      partialize: (state) => ({
        ...state,
        undo: null,
        importRows: [],
        importStep: 1,
        importFileName: ""
      })
    }
  )
);

function blankTask(sortOrder: number): Task {
  return {
    id: "",
    name: "",
    startDate: today(),
    endDate: today(14),
    totalLabourHours: 0,
    labourHoursMissing: true,
    labourHoursSource: "manual",
    totalValue: 0,
    source: "manual",
    crewRequirementMode: "rounded",
    crewAllocation: {},
    notes: "",
    assumptions: "",
    documentLink: "",
    sortOrder
  };
}

function normalizeTaskForProject(project: Project, task: Task): Task {
  const totalLabourHours = Number(task.totalLabourHours || 0);
  const totalValue = Number(task.totalValue || 0);
  const derivedHours = totalLabourHours ? totalLabourHours : totalValue / Math.max(1, project.avgHourlyRate);
  return {
    ...task,
    totalLabourHours: Number(derivedHours || 0),
    totalValue,
    labourHoursMissing: !totalLabourHours && !totalValue,
    labourHoursSource: totalLabourHours ? "manual" : "derived",
    crewAllocation: {
      ...Object.fromEntries(crewTypes.map((type) => [type.id, 0])),
      ...task.crewAllocation
    }
  };
}
