"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { crewTypes } from "@/lib/constants";
import { maxDate, minDate, today } from "@/lib/dates";
import { slug } from "@/lib/format";
import { initialState } from "@/lib/seed";
import type { AppState, AppUser, CrewType, Project, ProjectStatus, Task } from "@/lib/types";

type UndoState = null | { type: "project"; item: Project; message: string } | { type: "task"; projectId: string; item: Task; message: string };

type AppStore = AppState & {
  undo: UndoState;
  setRole: (role: AppState["role"]) => void;
  setCurrentUser: (userId: string) => void;
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
  createUser: (user: Omit<AppUser, "id" | "assignedProjectIds"> & { assignedProjectIds?: string[] }) => void;
  updateUserAccess: (userId: string, assignedProjectIds: string[]) => void;
  deleteUser: (userId: string) => void;
  restoreUndo: () => void;
  dismissUndo: () => void;
  resetDemo: () => void;
  setCurrentUserAssignedProjectIds: (ids: string[]) => void;
  replaceProjects: (projects: Project[]) => void;
  replaceManagers: (managers: AppState["managers"]) => void;
  replaceProjectFromImport: (project: Project) => void;
};

const storageKey = "piche-build-app-state-v1";

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      undo: null,
      setRole: (role) => set((state) => ({
        role,
        currentUserId: state.users.find((user) => user.role === role)?.id || state.currentUserId,
        activeView: role !== "admin" && state.activeView === "access" ? "dashboard" : state.activeView
      })),
      setCurrentUser: (currentUserId) => set((state) => {
        const user = state.users.find((item) => item.id === currentUserId);
        return user ? { currentUserId, role: user.role } : {};
      }),
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
        return {
          projects: [...state.projects, next],
          users: state.users.map((user) => user.role === "admin" || user.role === "vp" ? { ...user, assignedProjectIds: [...new Set([...user.assignedProjectIds, id])] } : user),
          selectedProjectIds: [...new Set([...state.selectedProjectIds, id])],
          activeProjectId: id,
          activeView: "projects"
        };
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
          const tasks = [...project.tasks, nextTask].sort((a, b) => a.startDate.localeCompare(b.startDate));
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
      createUser: (user) => set((state) => {
        const id = slug(user.username || user.name);
        const assignedProjectIds = user.role === "vp" || user.role === "admin"
          ? state.projects.map((project) => project.id)
          : user.assignedProjectIds || [];
        const nextManagers = user.role === "pm"
          ? [...state.managers, { id, name: user.name, email: user.username || "" }]
          : state.managers;
        return {
          users: [...state.users, { ...user, id, assignedProjectIds }],
          managers: nextManagers
        };
      }),
      updateUserAccess: (userId, assignedProjectIds) => set((state) => ({
        users: state.users.map((user) => {
          if (user.id !== userId) return user;
          return {
            ...user,
            assignedProjectIds: user.role === "vp" || user.role === "admin" ? state.projects.map((project) => project.id) : assignedProjectIds
          };
        })
      })),
      deleteUser: (userId) => set((state) => ({
        users: state.users.filter((user) => user.id !== userId),
        currentUserId: state.currentUserId === userId ? state.users.find((user) => user.id !== userId)?.id || "" : state.currentUserId
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
      dismissUndo: () => set({ undo: null }),
      resetDemo: () => set({ ...initialState, undo: null }),
      setCurrentUserAssignedProjectIds: (ids) => set({ currentUserAssignedProjectIds: ids }),
      replaceProjects: (projects) => set((state) => ({
        projects: projects.map((p) => ({ ...p, tasks: [...p.tasks].sort((a, b) => a.startDate.localeCompare(b.startDate)) })),
        selectedProjectIds: projects.map((project) => project.id),
        activeProjectId: projects.some((project) => project.id === state.activeProjectId) ? state.activeProjectId : projects[0]?.id || ""
      })),
      replaceManagers: (managers) => set({ managers }),
      replaceProjectFromImport: (project) => set((state) => ({
        projects: state.projects.map((item) => item.id === project.id
          ? { ...project, tasks: [...project.tasks].sort((a, b) => a.startDate.localeCompare(b.startDate)) }
          : item),
        selectedProjectIds: [...new Set([...state.selectedProjectIds, project.id])],
        activeProjectId: project.id
      }))
    }),
    {
      name: storageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: sanitizeStateForPersistence,
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeHydratedState(persisted)
      })
    }
  )
);

function sanitizeStateForPersistence(state: AppStore) {
  return {
    activeView: state.activeView,
    activeProjectId: state.activeProjectId,
    activeProjectTab: state.activeProjectTab,
    dashboardWindow: state.dashboardWindow,
    dashboardArea: state.dashboardArea,
    granularity: state.granularity,
    valueMode: state.valueMode,
    scheduleGranularity: state.scheduleGranularity,
    crewDisplayMode: state.crewDisplayMode,
    crewRequirementMode: state.crewRequirementMode
  };
}

function sanitizeHydratedState(persisted: unknown): Partial<AppStore> {
  if (!persisted || typeof persisted !== "object") return {};
  const next = persisted as Partial<AppStore> & {
    importRows?: unknown;
    importStep?: unknown;
    importFileName?: unknown;
    projects?: unknown;
    tasks?: unknown;
    crewTypes?: unknown;
    users?: unknown;
    managers?: unknown;
    scheduleImports?: unknown;
    undo?: unknown;
  };
  const {
    importRows: _importRows,
    importStep: _importStep,
    importFileName: _importFileName,
    projects: _projects,
    tasks: _tasks,
    crewTypes: _crewTypes,
    users: _users,
    managers: _managers,
    scheduleImports: _scheduleImports,
    undo: _undo,
    ...safeNext
  } = next;
  return {
    ...safeNext,
    crewDisplayMode: "detailed"
  };
}

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
