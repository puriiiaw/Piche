import type { ProjectStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ProjectStatus | "Over Capacity" | "Healthy" | "Missing" | "Complete" | "New" | "Changed" | "Unchanged" }) {
  const tone = {
    Active: "bg-emerald-100 text-emerald-800",
    Healthy: "bg-emerald-100 text-emerald-800",
    Complete: "bg-emerald-100 text-emerald-800",
    Planning: "bg-sky-100 text-sky-800",
    New: "bg-sky-100 text-sky-800",
    "At Risk": "bg-amber-100 text-amber-800",
    Changed: "bg-amber-100 text-amber-800",
    "Over Capacity": "bg-red-100 text-red-800",
    Missing: "bg-red-100 text-red-800",
    Unchanged: "bg-slate-100 text-slate-700"
  }[status];

  return <span className={`status-pill ${tone}`}>{status}</span>;
}
