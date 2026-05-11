"use client";

import { BriefcaseBusiness, ChevronLeft, LayoutDashboard, LogOut, Plus, Settings, ShieldCheck } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProjectDialog } from "@/components/project-dialog";
import { AccessView } from "@/components/views/access-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { ProjectsView } from "@/components/views/projects-view";
import { SettingsView } from "@/components/views/settings-view";
import { useAppStore } from "@/lib/store";

type SessionUser = {
  id: string;
  name?: string | null;
  role: "ADMIN" | "PM" | "VP";
  username: string;
};

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  ADMIN: "Admin",
  PM: "Project Manager",
  VP: "VP / Executive"
};

const STORE_ROLE: Record<SessionUser["role"], "admin" | "pm" | "vp"> = {
  ADMIN: "admin",
  PM: "pm",
  VP: "vp"
};

export function LabourCurveApp({ user }: { user: SessionUser }) {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeView = useAppStore((state) => state.activeView);
  const undo = useAppStore((state) => state.undo);
  const setView = useAppStore((state) => state.setView);
  const setRole = useAppStore((state) => state.setRole);
  const restoreUndo = useAppStore((state) => state.restoreUndo);

  useEffect(() => {
    setRole(STORE_ROLE[user.role]);
  }, [setRole, user.role]);

  const isAdmin = user.role === "ADMIN";
  const canAddProject = isAdmin;

  type View = "dashboard" | "projects" | "access" | "settings";

  const navItems: { id: View; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: BriefcaseBusiness },
    ...(isAdmin ? [{ id: "access" as View, label: "Access", icon: ShieldCheck }] : []),
    ...(isAdmin ? [{ id: "settings" as View, label: "Settings", icon: Settings }] : [])
  ];

  const viewTitle: Record<View, string> = {
    dashboard: "Dashboard",
    projects: "Projects",
    access: "User Access",
    settings: "Settings"
  };

  const initials = (user.name || user.username || "?")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`grid min-h-screen ${sidebarCollapsed ? "grid-cols-[72px_minmax(0,1fr)]" : "grid-cols-[264px_minmax(0,1fr)]"} max-[840px]:grid-cols-1 transition-all`}>
      <aside className="sticky top-0 flex h-screen flex-col bg-[#111d26] text-white max-[840px]:static max-[840px]:h-auto max-[840px]:overflow-x-auto">
        <div className={`flex h-[112px] items-center justify-center border-b border-white/5 px-6 ${sidebarCollapsed ? "px-2" : ""}`}>
          {!sidebarCollapsed ? (
            <Image src="/Logo.png" alt="Groupe Piche" width={160} height={80} priority className="h-20 w-40 object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-piche-gold/20 text-sm font-black text-piche-gold">P</div>
          )}
        </div>

        <nav className="grid max-[840px]:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={`relative flex min-h-14 items-center gap-3 px-6 text-left text-sm font-semibold transition ${
                  sidebarCollapsed ? "justify-center px-0" : ""
                } ${isActive ? "bg-white/10 text-piche-gold" : "text-slate-300 hover:bg-white/5 hover:text-piche-gold"}`}
                onClick={() => setView(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-piche-gold" />}
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mx-4 mb-4 mt-auto border-t border-white/10 pt-4">
          {!sidebarCollapsed && (
            <div className="mb-2 flex items-center gap-3 rounded-app px-2 py-1.5">
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-piche-gold/20 text-xs font-black text-piche-gold">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{user.name || user.username}</div>
                <div className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</div>
              </div>
            </div>
          )}
          <button
            className={`flex w-full items-center gap-3 rounded-app px-2 py-2 text-sm text-slate-400 hover:bg-white/10 hover:text-white ${sidebarCollapsed ? "justify-center" : ""}`}
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>

        <button
          className="mx-4 mb-4 flex min-h-10 items-center gap-3 rounded-app px-4 text-slate-300 hover:bg-white/10 max-[840px]:hidden"
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          <ChevronLeft size={18} className={`transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
          {!sidebarCollapsed && "Collapse"}
        </button>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex min-h-22 items-center justify-between gap-4 border-b border-piche-line bg-white/90 px-8 py-5 backdrop-blur max-[840px]:static max-[840px]:flex-col max-[840px]:items-stretch">
          <div>
            <p className="eyebrow">{ROLE_LABEL[user.role]} access</p>
            <h1 className="text-3xl font-black text-piche-ink">{viewTitle[activeView as View] || "Dashboard"}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canAddProject && activeView !== "access" ? (
              <button className="btn-primary" onClick={() => setProjectDialogOpen(true)}>
                <Plus size={16} />
                Add Project
              </button>
            ) : null}
            <div className="grid h-11 w-11 place-items-center rounded-full bg-piche-navy text-sm font-black text-white" title={user.name || user.username}>
              {initials}
            </div>
          </div>
        </header>

        <section className="grid gap-6 p-8 max-[840px]:p-4">
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "projects" && <ProjectsView />}
          {activeView === "access" && isAdmin && <AccessView currentUserId={user.id} />}
          {activeView === "settings" && isAdmin && <SettingsView />}
        </section>
      </main>

      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />

      {undo ? (
        <div className="fixed bottom-6 right-6 z-50 flex min-h-12 items-center gap-4 rounded-app bg-piche-navy px-4 text-white shadow-soft">
          <span className="font-semibold">{undo.message}</span>
          <button
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-black"
            onClick={() => {
              restoreUndo();
              toast.success("Restored");
            }}
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
