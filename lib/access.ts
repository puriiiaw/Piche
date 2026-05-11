import type { AppState, Project } from "@/lib/types";

export function currentAppUser(state: Pick<AppState, "users" | "currentUserId" | "role">) {
  return state.users.find((user) => user.id === state.currentUserId && user.role === state.role)
    || state.users.find((user) => user.role === state.role)
    || state.users[0];
}

export function visibleProjectsForState(state: Pick<AppState, "projects" | "role" | "users" | "currentUserId">): Project[] {
  if (state.role === "admin" || state.role === "vp") return state.projects;
  const user = currentAppUser(state);
  const assigned = new Set(user?.assignedProjectIds || []);
  return state.projects.filter((project) => assigned.has(project.id));
}
