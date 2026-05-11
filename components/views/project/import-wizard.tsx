"use client";

import { Download, FileSpreadsheet, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";

type ImportWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
};

type PreviewRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  action: "new" | "update" | "unchanged";
  selected: boolean;
};

type PreviewResult = {
  mode: "preview";
  fileName: string;
  totalRows: number;
  newRows: number;
  updateRows: number;
  unchangedRows: number;
  rows: PreviewRow[];
};

type ImportResult = {
  mode: "complete";
  batchId: string;
  fileName: string;
  importedAt: string;
  newTasks: number;
  updatedTasks: number;
  skipped: number;
  totalRows: number;
  project: Project | null;
};

export function ImportWizard({ open, onOpenChange, project }: ImportWizardProps) {
  const replaceProjectFromImport = useAppStore((state) => state.replaceProjectFromImport);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "previewing" | "review" | "applying" | "complete" | "error">("idle");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setFile(null);
      setStatus("idle");
      setError("");
      setPreview(null);
      setResult(null);
      setQuery("");
    }
  }, [open]);

  const filteredRows = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!preview) return [];
    if (!text) return preview.rows;
    return preview.rows.filter((row) => `${row.id} ${row.name} ${row.action}`.toLowerCase().includes(text));
  }, [preview, query]);

  const selectedCount = preview?.rows.filter((row) => row.selected).length || 0;

  const previewImport = async () => {
    if (!file) return;
    setStatus("previewing");
    setError("");
    setResult(null);
    setPreview(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const payload = await requestJson<PreviewResult>(`/api/projects/${project.id}/imports`, {
        method: "POST",
        body: formData
      });
      setPreview(payload);
      setStatus("review");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import preview failed.");
      setStatus("error");
    }
  };

  const applySelected = async () => {
    if (!preview || !selectedCount) return;
    setStatus("applying");
    setError("");

    try {
      const nextResult = await requestJson<ImportResult>(`/api/projects/${project.id}/imports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: preview.fileName, rows: preview.rows })
      });
      if (nextResult.project) replaceProjectFromImport(nextResult.project);
      setResult(nextResult);
      setStatus("complete");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.");
      setStatus("review");
    }
  };

  const updateRows = (updater: (row: PreviewRow) => PreviewRow) => {
    setPreview((current) => current ? { ...current, rows: current.rows.map(updater) } : current);
  };

  const close = () => {
    if (status === "previewing" || status === "applying") return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close} title="Import Schedule" description="Upload the GC schedule, review the tasks, then choose only the rows to add or update." wide>
      <div className="grid gap-5">
        <label className="grid min-h-40 place-items-center rounded-app border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <input
            className="hidden"
            type="file"
            accept=".csv,.xlsx,.xls"
            disabled={status === "previewing" || status === "applying"}
            onChange={(event) => {
              setFile(event.currentTarget.files?.[0] || null);
              setStatus("idle");
              setError("");
              setPreview(null);
              setResult(null);
              setQuery("");
            }}
          />
          <FileSpreadsheet className="mb-3 text-piche-goldDark" size={32} />
          <strong className="text-xl text-piche-ink">{file ? file.name : "Choose schedule file"}</strong>
          <span className="mt-2 max-w-xl text-piche-muted">CSV, XLSX, or XLS. The server parses the file first so you can choose which tasks to import.</span>
          {status === "previewing" ? <span className="mt-3 rounded-full bg-piche-gold/20 px-4 py-2 text-sm font-bold text-piche-goldDark">Parsing schedule...</span> : null}
          {status === "applying" ? <span className="mt-3 rounded-full bg-piche-gold/20 px-4 py-2 text-sm font-bold text-piche-goldDark">Applying selected tasks...</span> : null}
          {error ? <span className="mt-3 rounded-app border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</span> : null}
        </label>

        {preview && status !== "complete" ? (
          <div className="rounded-app border border-piche-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-piche-line p-4">
              <div>
                <strong className="text-xl text-piche-ink">{selectedCount} of {preview.totalRows} rows selected</strong>
                <p className="text-sm text-piche-muted">{preview.newRows} new, {preview.updateRows} changed, {preview.unchangedRows} unchanged.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => updateRows((row) => ({ ...row, selected: row.action !== "unchanged" }))}>Select new/changed</button>
                <button className="btn-secondary" onClick={() => updateRows((row) => ({ ...row, selected: true }))}>Select all</button>
                <button className="btn-secondary" onClick={() => updateRows((row) => ({ ...row, selected: false }))}>Clear</button>
              </div>
            </div>
            <div className="flex items-center gap-2 border-b border-piche-line p-4">
              <Search size={16} className="text-piche-muted" />
              <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search task ID, name, or status" />
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="p-3">Import</th><th className="p-3">Status</th><th className="p-3">Task ID</th><th className="p-3">Name</th><th className="p-3">Start</th><th className="p-3">End</th><th className="p-3">Value</th></tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-piche-line">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-piche-goldDark"
                          checked={row.selected}
                          onChange={() => updateRows((item) => item.id === row.id ? { ...item, selected: !item.selected } : item)}
                        />
                      </td>
                      <td className="p-3"><ActionBadge action={row.action} /></td>
                      <td className="p-3 font-black">{row.id}</td>
                      <td className="p-3 font-semibold text-piche-ink">{row.name}</td>
                      <td className="p-3">{row.startDate}</td>
                      <td className="p-3">{row.endDate}</td>
                      <td className="p-3">{row.totalValue ? row.totalValue.toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="rounded-app border border-piche-line bg-slate-50 p-6">
            <strong className="text-2xl text-piche-ink">{result.totalRows} rows reviewed</strong>
            <p className="mt-2 text-piche-muted">
              {result.newTasks} new tasks, {result.updatedTasks} updates, {result.skipped} skipped.
            </p>
            <p className="mt-1 text-sm font-semibold text-piche-muted">Batch {result.batchId}</p>
            <button className="btn-secondary mt-4" onClick={() => exportResult(result)}>
              <Download size={16} />
              Export import result
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={close} disabled={status === "previewing" || status === "applying"}>{status === "complete" ? "Close" : "Cancel"}</button>
        {!preview ? (
          <button className="btn-primary" disabled={!file || status === "previewing"} onClick={previewImport}>
            {status === "previewing" ? "Parsing..." : "Preview Tasks"}
          </button>
        ) : status === "complete" ? null : (
          <button className="btn-primary" disabled={!selectedCount || status === "applying"} onClick={applySelected}>
            {status === "applying" ? "Applying..." : `Apply Selected (${selectedCount})`}
          </button>
        )}
      </div>
    </Dialog>
  );
}

function ActionBadge({ action }: { action: PreviewRow["action"] }) {
  const styles = action === "new" ? "bg-emerald-100 text-emerald-800" : action === "update" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600";
  const label = action === "new" ? "New" : action === "update" ? "Changed" : "Unchanged";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${styles}`}>{label}</span>;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload as T;
}

function exportResult(result: ImportResult) {
  const csv = [
    "Batch,File,Rows,New,Updated,Skipped",
    [result.batchId, result.fileName, result.totalRows, result.newTasks, result.updatedTasks, result.skipped].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "schedule-import-result.csv";
  link.click();
  URL.revokeObjectURL(url);
}
