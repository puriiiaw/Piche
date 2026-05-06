"use client";

import * as XLSX from "xlsx";
import { Download, FileSpreadsheet } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/dates";
import { useAppStore } from "@/lib/store";
import type { ImportReviewRow, Project } from "@/lib/types";

type ImportWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
};

export function ImportWizard({ open, onOpenChange, project }: ImportWizardProps) {
  const state = useAppStore();
  const selectedRows = state.importRows.filter((row) => row.selected);
  const skippedRows = state.importRows.filter((row) => !row.selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Import Schedule" description="Three-step review flow for GC schedules. Labour hours are preserved." wide>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((step) => <div key={step} className={`rounded-app px-4 py-3 text-center text-sm font-black ${state.importStep === step ? "bg-piche-gold text-piche-navy" : "bg-slate-100 text-slate-600"}`}>Step {step}</div>)}
      </div>

      {state.importStep === 1 ? (
        <label className="grid min-h-52 place-items-center rounded-app border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <input className="hidden" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => handleFile(event.currentTarget.files?.[0], project, state.setImportRows)} />
          <FileSpreadsheet className="mb-3 text-piche-goldDark" size={36} />
          <strong className="text-xl text-piche-ink">Choose schedule file</strong>
          <span className="mt-2 max-w-xl text-piche-muted">Upload CSV, XLSX, or XLS. Columns are auto-mapped for Task ID, Task Name, Start Date, End Date, and Total Value.</span>
        </label>
      ) : null}

      {state.importStep === 2 ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => state.selectImportRows("all")}>Select all</button>
            <button className="btn-secondary" onClick={() => state.selectImportRows("none")}>Clear selection</button>
            <button className="btn-secondary" onClick={() => state.selectImportRows("new")}>Skip updates</button>
          </div>
          <div className="max-h-[440px] overflow-auto rounded-app border border-piche-line">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3" /><th className="p-3">Type</th><th className="p-3">Task ID</th><th className="p-3">Existing</th><th className="p-3">Uploaded</th></tr></thead>
              <tbody>
                {state.importRows.map((row) => (
                  <tr key={row.id} className="border-t border-piche-line">
                    <td className="p-3"><input type="checkbox" checked={row.selected} onChange={() => state.toggleImportRow(row.id)} /></td>
                    <td className="p-3"><StatusBadge status={row.changeType === "new" ? "New" : row.changeType === "changed" ? "Changed" : "Unchanged"} /></td>
                    <td className="p-3 font-black">{row.id}</td>
                    <td className="p-3">{row.existing ? <>{row.existing.name}<span className="block text-sm text-piche-muted">{formatDate(row.existing.startDate)} - {formatDate(row.existing.endDate)}</span></> : "-"}</td>
                    <td className="p-3">{row.name}<span className="block text-sm text-piche-muted">{formatDate(row.startDate)} - {formatDate(row.endDate)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {state.importStep === 3 ? (
        <div className="rounded-app border border-piche-line bg-slate-50 p-6">
          <strong className="text-2xl text-piche-ink">{selectedRows.length} selected rows</strong>
          <p className="mt-2 text-piche-muted">
            {selectedRows.filter((row) => row.changeType === "new").length} new tasks, {selectedRows.filter((row) => row.changeType === "changed").length} updates, {skippedRows.length} skipped.
          </p>
          <button className="btn-secondary mt-4" onClick={() => exportSkipped(skippedRows)}>
            <Download size={16} />
            Export skipped CSV
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button>
        {state.importStep > 1 ? <button className="btn-secondary" onClick={() => state.setImportStep((state.importStep - 1) as 1 | 2 | 3)}>Back</button> : null}
        {state.importStep < 3 ? (
          <button className="btn-primary" disabled={state.importStep === 1 && !state.importRows.length} onClick={() => state.setImportStep((state.importStep + 1) as 1 | 2 | 3)}>Next</button>
        ) : (
          <button className="btn-primary" onClick={() => { state.applyImportRows(project.id); onOpenChange(false); }}>Apply Import</button>
        )}
      </div>
    </Dialog>
  );
}

async function handleFile(file: File | undefined, project: Project, setRows: (projectId: string, fileName: string, rows: ImportReviewRow[]) => void) {
  if (!file) return;
  const rows = file.name.toLowerCase().endsWith(".csv")
    ? parseCsv(await file.text())
    : parseWorkbook(await file.arrayBuffer());
  setRows(project.id, file.name, mapRows(rows, project));
}

function parseWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean).map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
  const headers = lines.shift() || [];
  return lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, line[index] || ""])));
}

function mapRows(rows: Record<string, unknown>[], project: Project): ImportReviewRow[] {
  return rows.map((row, index) => {
    const get = (...names: string[]) => {
      const key = Object.keys(row).find((item) => names.some((name) => item.toLowerCase().includes(name)));
      return key ? String(row[key] || "") : "";
    };
    const id = get("task id", "activity id", "id") || `IMPORT-${index + 1}`;
    const existing = project.tasks.find((task) => task.id === id);
    const next = {
      id,
      name: get("task name", "activity name", "name") || id,
      startDate: normalizeDate(get("start")),
      endDate: normalizeDate(get("end", "finish")),
      totalValue: Number(get("total value", "value").replace(/[$,]/g, "") || 0),
      existing
    };
    const changeType = !existing ? "new" : existing.name !== next.name || existing.startDate !== next.startDate || existing.endDate !== next.endDate ? "changed" : "unchanged";
    return { ...next, changeType, selected: changeType !== "unchanged" };
  }).filter((row) => row.startDate && row.endDate) as ImportReviewRow[];
}

function normalizeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function exportSkipped(rows: ImportReviewRow[]) {
  const csv = ["Task ID,Task Name,Start Date,End Date", ...rows.map((row) => [row.id, row.name, row.startDate, row.endDate].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "skipped-import-rows.csv";
  link.click();
  URL.revokeObjectURL(url);
}
