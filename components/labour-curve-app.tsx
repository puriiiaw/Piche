"use client";

import Image from "next/image";
import { BarChart3, BriefcaseBusiness, ChevronLeft, LayoutDashboard, Plus, RefreshCcw, Settings, UserRound } from "lucide-react";
import { DashboardView } from "@/components/views/dashboard-view";
import { ProjectsView } from "@/components/views/projects-view";
import { SettingsView } from "@/components/views/settings-view";
import { ProjectDialog } from "@/components/project-dialog";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";

export function LabourCurveApp() {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const activeView = useAppStore((state) => state.activeView);
  const role = useAppStore((state) => state.role);
  const undo = useAppStore((state) => state.undo);
  const setView = useAppStore((state) => state.setView);
  const setRole = useAppStore((state) => state.setRole);
  const resetDemo = useAppStore((state) => state.resetDemo);
  const restoreUndo = useAppStore((state) => state.restoreUndo);

  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "projects" as const, label: "Projects", icon: BriefcaseBusiness },
    { id: "settings" as const, label: "Settings", icon: Settings }
  ];

  const title = activeView === "dashboard" ? "Dashboard" : activeView === "projects" ? "Projects" : "Settings";

  return (
    <div className="grid min-h-screen grid-cols-[264px_minmax(0,1fr)] max-[840px]:grid-cols-1">
      <aside className="sticky top-0 flex h-screen flex-col gap-8 bg-piche-navy px-4 py-7 text-white max-[840px]:static max-[840px]:h-auto max-[840px]:flex-row max-[840px]:items-center max-[840px]:overflow-x-auto">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-9 w-14 shrink-0 rounded-md bg-white p-1.5">
            <Image src="/Logo.png" alt="Groupe Piche" fill className="object-contain p-1" priority />
          </div>
          <div className="min-w-0 leading-tight">
            <strong className="block truncate">Labour Curve</strong>
            <span className="text-sm text-slate-300">Management</span>
          </div>
        </div>

        <nav className="grid gap-2 max-[840px]:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`flex min-h-11 items-center gap-3 rounded-app px-4 text-left font-semibold transition ${
                  activeView === item.id ? "bg-white text-piche-navy" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="mt-auto flex min-h-10 items-center gap-3 rounded-app px-4 text-slate-300 hover:bg-white/10 max-[840px]:hidden">
          <ChevronLeft size={18} />
          Collapse
        </button>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex min-h-22 items-center justify-between gap-4 border-b border-piche-line bg-white/90 px-8 py-5 backdrop-blur max-[840px]:static max-[840px]:flex-col max-[840px]:items-stretch">
          <div>
            <p className="eyebrow">{role === "vp" ? "Executive view" : "Project manager view"}</p>
            <h1 className="text-3xl font-black text-piche-ink">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-app bg-slate-100 p-1">
              {(["pm", "vp"] as const).map((nextRole) => (
                <button
                  key={nextRole}
                  className={`min-h-9 rounded-md px-4 font-black uppercase ${role === nextRole ? "bg-white text-piche-goldDark shadow" : "text-slate-600"}`}
                  onClick={() => setRole(nextRole)}
                >
                  {nextRole}
                </button>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => { resetDemo(); toast.success("Demo data reset"); }}>
              <RefreshCcw size={16} />
              Reset demo
            </button>
            <button className="btn-primary" onClick={() => setProjectDialogOpen(true)}>
              <Plus size={16} />
              Add Project
            </button>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-piche-navy text-sm font-black text-white">
              {role === "vp" ? "VP" : <UserRound size={18} />}
            </div>
          </div>
        </header>

        <section className="grid gap-6 p-8 max-[840px]:p-4">
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "projects" && <ProjectsView />}
          {activeView === "settings" && <SettingsView />}
        </section>
      </main>

      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />

      {undo && (
        <div className="fixed bottom-6 right-6 z-50 flex min-h-12 items-center gap-4 rounded-app bg-piche-navy px-4 text-white shadow-soft">
          <span className="font-semibold">{undo.message}</span>
          <button className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-black" onClick={() => { restoreUndo(); toast.success("Restored"); }}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
