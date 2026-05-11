"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";

type ImportWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
};

type ImportResult = {
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
  const [status, setStatus] = useState<"idle" | "uploading" | "complete" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const applyImport = async () => {
    if (!file) return;
    setStatus("uploading");
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/projects/${project.id}/imports`, {
        method: "POST",
        body: formData
      });
      const payload = await response.json() as ImportResult | { error?: string };
      if (!response.ok) throw new Error("error" in payload && payload.error ? payload.error : "Import failed.");
      const nextResult = payload as ImportResult;
      if (nextResult.project) replaceProjectFromImport(nextResult.project);
      setResult(nextResult);
      setStatus("complete");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.");
      setStatus("error");
    }
  };

  const close = () => {
    if (status === "uploading") return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close} title="Import Schedule" description="Upload the GC schedule. The backend parses, matches, applies, and saves tasks in PostgreSQL." wide>
      <div className="grid gap-5">
        <label className="grid min-h-52 place-items-center rounded-app border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <input
            className="hidden"
            type="file"
            accept=".csv,.xlsx,.xls"
            disabled={status === "uploading"}
            onChange={(event) => {
              setFile(event.currentTarget.files?.[0] || null);
              setStatus("idle");
              setError("");
              setResult(null);
            }}
          />
          <FileSpreadsheet className="mb-3 text-piche-goldDark" size={36} />
          <strong className="text-xl text-piche-ink">{file ? file.name : "Choose schedule file"}</strong>
          <span className="mt-2 max-w-xl text-piche-muted">CSV, XLSX, or XLS. The browser only uploads the file; parsing and applying happen on the server.</span>
          {status === "uploading" ? <span className="mt-3 rounded-full bg-piche-gold/20 px-4 py-2 text-sm font-bold text-piche-goldDark">Uploading and applying import...</span> : null}
          {error ? <span className="mt-3 rounded-app border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</span> : null}
        </label>

        {result ? (
          <div className="rounded-app border border-piche-line bg-slate-50 p-6">
            <strong className="text-2xl text-piche-ink">{result.totalRows} rows processed</strong>
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
        <button className="btn-secondary" onClick={close} disabled={status === "uploading"}>{status === "complete" ? "Close" : "Cancel"}</button>
        <button className="btn-primary" disabled={!file || status === "uploading"} onClick={applyImport}>
          {status === "uploading" ? "Applying..." : "Upload & Apply"}
        </button>
      </div>
    </Dialog>
  );
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
