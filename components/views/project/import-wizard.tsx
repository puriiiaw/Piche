"use client";

import {
  CheckCircle2,
  EyeOff,
  FileSpreadsheet,
  PenLine,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import type {
  DiffResult,
  NewTaskDiff,
  UpdatedTaskDiff,
  RemovedTaskDiff,
} from "@/app/api/projects/[projectId]/imports/route";

// ─── Props ────────────────────────────────────────────────────────────────────

type ImportWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
};

// ─── Main component ───────────────────────────────────────────────────────────

export function ImportWizard({ open, onOpenChange, project }: ImportWizardProps) {
  const replaceProjectFromImport = useAppStore(s => s.replaceProjectFromImport);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file,   setFile]   = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "review" | "no-changes" | "applying" | "done" | "error"
  >("idle");
  const [error,  setError]  = useState("");
  const [diff,   setDiff]   = useState<DiffResult | null>(null);

  // Selection sets
  const [selNew,      setSelNew]      = useState<Set<string>>(new Set());
  const [selUpdates,  setSelUpdates]  = useState<Set<string>>(new Set());
  const [selRemovals, setSelRemovals] = useState<Set<string>>(new Set());

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFile(null);
      setStatus("idle");
      setError("");
      setDiff(null);
      setSelNew(new Set());
      setSelUpdates(new Set());
      setSelRemovals(new Set());
    }
  }, [open]);

  // ── Upload & compute diff ─────────────────────────────────────────────────
  const uploadFile = async (f: File) => {
    setFile(f);
    setStatus("uploading");
    setError("");
    setDiff(null);

    const fd = new FormData();
    fd.append("file", f);

    try {
      const res  = await fetch(`/api/projects/${project.id}/imports`, { method: "POST", body: fd });
      const data = await res.json() as DiffResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to parse schedule.");

      const hasChanges =
        data.new_tasks.length > 0 ||
        data.updated_tasks.length > 0 ||
        data.removed_tasks.length > 0;

      setDiff(data);

      if (!hasChanges) {
        setStatus("no-changes");
        return;
      }

      // Default selections: new=all checked, updates=all checked, removals=none checked
      setSelNew(new Set(data.new_tasks.map(t => t.task_id)));
      setSelUpdates(new Set(data.updated_tasks.map(t => t.task_id)));
      setSelRemovals(new Set());
      setStatus("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  };

  // ── Apply selections ──────────────────────────────────────────────────────
  const applyImport = async () => {
    if (!diff) return;
    setStatus("applying");
    setError("");

    const selected_new      = diff.new_tasks.filter(t => selNew.has(t.task_id));
    const selected_updates  = diff.updated_tasks
      .filter(t => selUpdates.has(t.task_id))
      .map(t => ({
        task_id:     t.task_id,
        name:        t.name.new,
        start:       t.start.new,
        end:         t.end.new,
        hours:       t.hours.new,
        total_value: t.total_value.new,
      }));
    const selected_removals = diff.removed_tasks
      .filter(t => selRemovals.has(t.task_id))
      .map(t => t.task_id);

    try {
      const res  = await fetch(`/api/projects/${project.id}/imports`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fileName:         diff.fileName,
          selected_new,
          selected_updates,
          selected_removals,
          total_new:       diff.new_tasks.length,
          total_updates:   diff.updated_tasks.length,
          total_removals:  diff.removed_tasks.length,
          total_unchanged: diff.total_unchanged_count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Apply failed.");
      if (data.project) replaceProjectFromImport(data.project);
      setStatus("done");
      // Auto-close after brief confirmation
      setTimeout(() => onOpenChange(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed.");
      setStatus("review");
    }
  };

  const canClose = status !== "uploading" && status !== "applying";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
      <div className="w-full max-w-[min(1400px,calc(100vw-2rem))] rounded-app bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 border-b border-piche-line p-6">
          <div>
            <h2 className="text-2xl font-black text-piche-ink">
              Review import — {project.name} schedule
            </h2>
            {diff && (
              <p className="mt-1 text-sm text-piche-muted">
                {diff.fileName} · Uploaded {new Date(diff.uploadedAt).toLocaleDateString("en-CA", {
                  month: "short", day: "numeric", year: "numeric",
                })} · {
                  diff.new_tasks.length + diff.updated_tasks.length +
                  diff.removed_tasks.length + diff.total_unchanged_count
                } rows processed
              </p>
            )}
            {!diff && <p className="mt-1 text-sm text-piche-muted">Upload a CSV, XLSX, or XLS schedule file to review changes.</p>}
          </div>
          <button
            className="mt-1 grid h-9 w-9 flex-shrink-0 place-items-center rounded-app bg-slate-100 text-slate-600 hover:bg-slate-200"
            onClick={() => canClose && onOpenChange(false)}
            disabled={!canClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6">

          {/* ── File drop zone (idle / error) ── */}
          {(status === "idle" || status === "error") && (
            <label className="grid min-h-48 cursor-pointer place-items-center rounded-app border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-piche-gold hover:bg-piche-gold/5">
              <input
                ref={fileRef}
                className="hidden"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                  e.target.value = "";
                }}
              />
              <FileSpreadsheet className="mb-3 text-piche-goldDark" size={36} />
              <strong className="text-xl text-piche-ink">Choose schedule file</strong>
              <span className="mt-2 text-sm text-piche-muted">CSV, XLSX, or XLS — we'll show you what changed before applying anything.</span>
              {error && (
                <span className="mt-4 rounded-app border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                  {error}
                </span>
              )}
            </label>
          )}

          {/* ── Uploading spinner ── */}
          {status === "uploading" && (
            <div className="flex min-h-48 items-center justify-center gap-3 text-piche-muted">
              <svg className="h-5 w-5 animate-spin text-piche-goldDark" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="font-semibold">Parsing {file?.name}…</span>
            </div>
          )}

          {/* ── No changes ── */}
          {status === "no-changes" && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <CheckCircle2 size={44} className="text-emerald-500" />
              <p className="text-xl font-black text-piche-ink">No changes detected</p>
              <p className="text-sm text-piche-muted">
                Every task in <strong>{diff?.fileName}</strong> matches what's already in the schedule.
              </p>
              <button className="btn-primary mt-4" onClick={() => onOpenChange(false)}>OK</button>
            </div>
          )}

          {/* ── Done ── */}
          {status === "done" && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <CheckCircle2 size={44} className="text-emerald-500" />
              <p className="text-xl font-black text-piche-ink">Import applied</p>
              <p className="text-sm text-piche-muted">Closing…</p>
            </div>
          )}

          {/* ── Review ── */}
          {(status === "review" || status === "applying") && diff && (
            <ReviewBody
              diff={diff}
              selNew={selNew}
              selUpdates={selUpdates}
              selRemovals={selRemovals}
              setSelNew={setSelNew}
              setSelUpdates={setSelUpdates}
              setSelRemovals={setSelRemovals}
            />
          )}
        </div>

        {/* ── Footer ── */}
        {(status === "review" || status === "applying") && diff && (
          <ReviewFooter
            diff={diff}
            selNew={selNew}
            selUpdates={selUpdates}
            selRemovals={selRemovals}
            applying={status === "applying"}
            error={error}
            onCancel={() => onOpenChange(false)}
            onApply={applyImport}
          />
        )}
      </div>
    </div>
  );
}

// ─── Review body ──────────────────────────────────────────────────────────────

function ReviewBody({
  diff, selNew, selUpdates, selRemovals, setSelNew, setSelUpdates, setSelRemovals,
}: {
  diff: DiffResult;
  selNew:        Set<string>; setSelNew:        (s: Set<string>) => void;
  selUpdates:    Set<string>; setSelUpdates:    (s: Set<string>) => void;
  selRemovals:   Set<string>; setSelRemovals:   (s: Set<string>) => void;
}) {
  // ── Summary strip ──────────────────────────────────────────────────────────
  return (
    <div className="grid gap-8">

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCell count={diff.new_tasks.length}          label="New tasks"           color="text-emerald-600" bg="bg-emerald-50  border-emerald-200" />
        <SummaryCell count={diff.updated_tasks.length}      label="Updated tasks"        color="text-amber-600"   bg="bg-amber-50   border-amber-200"   />
        <SummaryCell count={diff.removed_tasks.length}      label="Removed from file"    color="text-red-600"     bg="bg-red-50     border-red-200"     />
        <SummaryCell count={diff.total_unchanged_count}     label="Unchanged"            color="text-slate-500"   bg="bg-slate-50   border-slate-200"   />
      </div>

      {/* Section 1 — New tasks */}
      {diff.new_tasks.length > 0 && (
        <Section
          icon={<Plus size={16} className="text-emerald-600" />}
          title="New tasks"
          count={diff.new_tasks.length}
          badgeColor="bg-emerald-100 text-emerald-800"
          selected={selNew}
          allIds={diff.new_tasks.map(t => t.task_id)}
          onSelectAll={() => setSelNew(new Set(diff.new_tasks.map(t => t.task_id)))}
          onClear={() => setSelNew(new Set())}
        >
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3 w-10" />
                <th className="p-3">Task ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Hours</th>
                <th className="p-3">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {diff.new_tasks.map(t => (
                <tr key={t.task_id} className="border-t border-piche-line hover:bg-emerald-50/40">
                  <td className="p-3">
                    <Checkbox
                      checked={selNew.has(t.task_id)}
                      onChange={() => toggleSet(selNew, setSelNew, t.task_id)}
                    />
                  </td>
                  <td className="p-3 font-black text-piche-ink">{t.task_id}</td>
                  <td className="p-3 font-semibold text-piche-ink">{t.name}</td>
                  <td className="p-3">{t.start}</td>
                  <td className="p-3">{t.end}</td>
                  <td className="p-3">{t.hours > 0 ? t.hours.toLocaleString() : "—"}</td>
                  <td className="p-3">{t.total_value > 0 ? `$${t.total_value.toLocaleString()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Section 2 — Updated tasks */}
      {diff.updated_tasks.length > 0 && (
        <Section
          icon={<PenLine size={16} className="text-amber-600" />}
          title="Updated tasks"
          count={diff.updated_tasks.length}
          badgeColor="bg-amber-100 text-amber-800"
          selected={selUpdates}
          allIds={diff.updated_tasks.map(t => t.task_id)}
          onSelectAll={() => setSelUpdates(new Set(diff.updated_tasks.map(t => t.task_id)))}
          onClear={() => setSelUpdates(new Set())}
        >
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3 w-10" />
                <th className="p-3">Task ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Hours</th>
                <th className="p-3">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {diff.updated_tasks.map(t => (
                <tr key={t.task_id} className="border-t border-piche-line hover:bg-amber-50/40">
                  <td className="p-3">
                    <Checkbox
                      checked={selUpdates.has(t.task_id)}
                      onChange={() => toggleSet(selUpdates, setSelUpdates, t.task_id)}
                    />
                  </td>
                  <td className="p-3 font-black text-piche-ink">{t.task_id}</td>
                  <td className="p-3"><DiffCell field={t.name} format={v => v} /></td>
                  <td className="p-3"><DiffCell field={t.start} format={v => v} /></td>
                  <td className="p-3"><DiffCell field={t.end} format={v => v} /></td>
                  <td className="p-3"><DiffCell field={t.hours} format={v => v > 0 ? v.toLocaleString() : "—"} /></td>
                  <td className="p-3"><DiffCell field={t.total_value} format={v => v > 0 ? `$${v.toLocaleString()}` : "—"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Section 3 — Removed from file */}
      {diff.removed_tasks.length > 0 && (
        <>
          <div className="rounded-app border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong>Heads up:</strong> These tasks exist in your schedule but were not found in the new file.
            Selecting them will hide them from your schedule — they can be restored from the{" "}
            <strong>Archive</strong> tab at any time.
          </div>
          <Section
            icon={<EyeOff size={16} className="text-red-600" />}
            title="Removed from file"
            count={diff.removed_tasks.length}
            badgeColor="bg-red-100 text-red-800"
            selected={selRemovals}
            allIds={diff.removed_tasks.map(t => t.task_id)}
            onSelectAll={() => setSelRemovals(new Set(diff.removed_tasks.map(t => t.task_id)))}
            onClear={() => setSelRemovals(new Set())}
          >
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3 w-10" />
                  <th className="p-3">Task ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {diff.removed_tasks.map(t => (
                  <tr key={t.task_id} className="border-t border-piche-line hover:bg-red-50/60">
                    <td className="p-3">
                      <Checkbox
                        checked={selRemovals.has(t.task_id)}
                        onChange={() => toggleSet(selRemovals, setSelRemovals, t.task_id)}
                      />
                    </td>
                    <td className="p-3 font-black text-piche-ink">{t.task_id}</td>
                    <td className="p-3 font-semibold text-piche-ink">{t.name}</td>
                    <td className="p-3">{t.start}</td>
                    <td className="p-3">{t.end}</td>
                    <td className="p-3">{t.hours > 0 ? t.hours.toLocaleString() : "—"}</td>
                    <td className="p-3 text-xs font-semibold text-red-600">Hide from schedule</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      )}

      {/* Section 4 — Unchanged */}
      {diff.total_unchanged_count > 0 && (
        <div className="rounded-app border border-piche-line">
          <div className="flex items-center justify-between gap-3 border-b border-piche-line px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-slate-400" />
              <span className="font-black text-piche-ink">Unchanged</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">
                {diff.total_unchanged_count}
              </span>
            </div>
            <span className="text-xs text-piche-muted">No action needed</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Task ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Hours</th>
                </tr>
              </thead>
              <tbody>
                {diff.unchanged_tasks.map(t => (
                  <tr key={t.task_id} className="border-t border-piche-line text-piche-muted">
                    <td className="p-3">{t.task_id}</td>
                    <td className="p-3">{t.name}</td>
                    <td className="p-3">{t.start}</td>
                    <td className="p-3">{t.end}</td>
                    <td className="p-3">{t.hours > 0 ? t.hours.toLocaleString() : "—"}</td>
                  </tr>
                ))}
                {diff.total_unchanged_count > diff.unchanged_tasks.length && (
                  <tr className="border-t border-piche-line">
                    <td colSpan={5} className="p-3 text-center text-xs text-piche-muted">
                      + {diff.total_unchanged_count - diff.unchanged_tasks.length} more unchanged tasks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Review footer ─────────────────────────────────────────────────────────────

function ReviewFooter({
  diff, selNew, selUpdates, selRemovals, applying, error, onCancel, onApply,
}: {
  diff:        DiffResult;
  selNew:      Set<string>;
  selUpdates:  Set<string>;
  selRemovals: Set<string>;
  applying:    boolean;
  error:       string;
  onCancel:    () => void;
  onApply:     () => void;
}) {
  const nNew      = selNew.size;
  const nUpd      = selUpdates.size;
  const nRem      = selRemovals.size;
  const nSkipped  =
    (diff.new_tasks.length      - nNew) +
    (diff.updated_tasks.length  - nUpd) +
    (diff.removed_tasks.length  - nRem);
  const hasAny = nNew > 0 || nUpd > 0 || nRem > 0;

  return (
    <div className="sticky bottom-0 rounded-b-app border-t border-piche-line bg-white px-6 py-4">
      {error && (
        <p className="mb-3 rounded-app border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Live summary */}
        <p className="text-sm text-piche-muted">
          <span className="font-semibold text-emerald-700">{nNew} new</span>
          {" · "}
          <span className="font-semibold text-amber-700">{nUpd} update{nUpd !== 1 ? "s" : ""}</span>
          {" · "}
          <span className="font-semibold text-red-700">{nRem} removal{nRem !== 1 ? "s" : ""}</span>
          {" selected · "}
          <span>{nSkipped} item{nSkipped !== 1 ? "s" : ""} skipped</span>
        </p>
        {/* Action buttons */}
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={onCancel} disabled={applying}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!hasAny || applying}
            onClick={onApply}
          >
            {applying ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Applying…
              </span>
            ) : "Apply selected changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCell({
  count, label, color, bg,
}: { count: number; label: string; color: string; bg: string }) {
  return (
    <div className={`rounded-app border p-4 text-center ${bg}`}>
      <p className={`text-3xl font-black ${color}`}>{count}</p>
      <p className="mt-1 text-xs font-semibold text-slate-600">{label}</p>
    </div>
  );
}

function Section({
  icon, title, count, badgeColor, selected, allIds,
  onSelectAll, onClear, children,
}: {
  icon:        React.ReactNode;
  title:       string;
  count:       number;
  badgeColor:  string;
  selected:    Set<string>;
  allIds:      string[];
  onSelectAll: () => void;
  onClear:     () => void;
  children:    React.ReactNode;
}) {
  return (
    <div className="rounded-app border border-piche-line">
      <div className="flex items-center justify-between gap-3 border-b border-piche-line px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-black text-piche-ink">{title}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-black ${badgeColor}`}>{count}</span>
          {selected.size > 0 && (
            <span className="text-xs text-piche-muted">({selected.size} selected)</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="text-xs font-semibold text-piche-goldDark hover:underline"
            onClick={onSelectAll}
          >
            Select all
          </button>
          <span className="text-piche-muted">·</span>
          <button
            className="text-xs font-semibold text-piche-muted hover:text-piche-ink hover:underline"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="overflow-auto">{children}</div>
    </div>
  );
}

function DiffCell<T>({
  field, format,
}: {
  field:  { old: T; new: T; changed: boolean };
  format: (v: T) => string;
}) {
  if (!field.changed) {
    return <span className="text-piche-muted">{format(field.new)}</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400 line-through">{format(field.old)}</span>
      <span className="font-medium text-emerald-700">{format(field.new)}</span>
    </div>
  );
}

function Checkbox({
  checked, onChange,
}: { checked: boolean; onChange: () => void }) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 accent-piche-goldDark"
      checked={checked}
      onChange={onChange}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleSet(
  set:    Set<string>,
  setter: (s: Set<string>) => void,
  id:     string
) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else               next.add(id);
  setter(next);
}
