"use client";

export type ScheduleGranularity = "day" | "week" | "month";
export type ScheduleOrientation = "landscape" | "portrait";

type MinimalTask = {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalLabourHours: number;
  labourHoursMissing: boolean;
};

type ScheduleExportOptions = {
  projectName: string;
  tasks: MinimalTask[];
  startDate: string;
  endDate: string;
  granularity: ScheduleGranularity;
  orientation: ScheduleOrientation;
};

const GOLD: [number, number, number] = [199, 177, 87];
const NAVY: [number, number, number] = [15, 25, 38];
const MUTED: [number, number, number] = [100, 116, 139];

// ─── Date helpers ────────────────────────────────────────────────────────────

function parseIso(s: string): Date {
  return new Date(s + "T00:00:00");
}

function addDaysLocal(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Period builder ──────────────────────────────────────────────────────────

type Period = { key: string; label: string; start: string; end: string };

function buildPeriods(startDate: string, endDate: string, granularity: ScheduleGranularity): Period[] {
  const periods: Period[] = [];
  let cursor = parseIso(startDate);
  const end = parseIso(endDate);

  // Align cursor to period boundary
  if (granularity === "week") {
    const dow = cursor.getDay(); // 0=Sun
    const diff = dow === 0 ? -6 : 1 - dow; // back-align to Monday
    cursor = addDaysLocal(cursor, diff);
  } else if (granularity === "month") {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  }

  let guard = 0;
  while (cursor <= end && guard < 600) {
    let periodEnd: Date;
    let label: string;

    if (granularity === "day") {
      periodEnd = new Date(cursor);
      label = cursor.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    } else if (granularity === "week") {
      periodEnd = addDaysLocal(cursor, 6);
      label = cursor.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    } else {
      periodEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      label = cursor.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
    }

    periods.push({ key: toIso(cursor), label, start: toIso(cursor), end: toIso(periodEnd) });

    // Advance
    if (granularity === "day") {
      cursor = addDaysLocal(cursor, 1);
    } else if (granularity === "week") {
      cursor = addDaysLocal(cursor, 7);
    } else {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    guard++;
  }

  return periods;
}

// ─── Public helpers ──────────────────────────────────────────────────────────

export function autoGranularity(startDate: string, endDate: string): ScheduleGranularity {
  const days = (parseIso(endDate).getTime() - parseIso(startDate).getTime()) / 86_400_000;
  if (days <= 28) return "day";
  if (days <= 120) return "week";
  return "month";
}

export function estimatePageCount(
  startDate: string,
  endDate: string,
  granularity: ScheduleGranularity,
  orientation: ScheduleOrientation
): number {
  const periods = buildPeriods(startDate, endDate, granularity);
  const pw = orientation === "landscape" ? 297 : 210;
  const taskColW = 70;
  const periodColW = granularity === "day" ? 16 : granularity === "week" ? 20 : 26;
  const periodsPerPage = Math.max(1, Math.floor((pw - 24 - taskColW) / periodColW));
  return Math.max(1, Math.ceil(periods.length / periodsPerPage));
}

// ─── Main export function ────────────────────────────────────────────────────

export async function exportSchedulePDF(options: ScheduleExportOptions) {
  const { jsPDF } = await import("jspdf");
  const { projectName, tasks, startDate, endDate, granularity, orientation } = options;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 12;
  const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  const TASK_COL_W = 70;
  const PERIOD_COL_W = granularity === "day" ? 16 : granularity === "week" ? 20 : 26;
  const ROW_H = 10;
  const HEADER_H = 12;

  const periods = buildPeriods(startDate, endDate, granularity);
  const periodsPerPage = Math.max(1, Math.floor((PW - 2 * M - TASK_COL_W) / PERIOD_COL_W));
  const visibleTasks = tasks.filter((t) => t.endDate >= startDate && t.startDate <= endDate);

  const totalPeriodPages = Math.max(1, Math.ceil(periods.length / periodsPerPage));

  // ── Helper: draw a mini header strip ────────────────────────────────────
  function drawPageHeader(doc: any, title: string, subtitle: string, page: number, total: number) {
    doc.setFillColor(...GOLD);
    doc.rect(0, 0, PW, 11, "F");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("GROUPE PICHÉ", M, 7.5);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(title, M + 52, 7.5);
    doc.setFontSize(7.5);
    doc.text(`Exported: ${dateStr}  ·  Page ${page} of ${total}`, PW - M, 7.5, { align: "right" });

    if (subtitle) {
      let sy = 14;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(subtitle, M, sy);
    }
  }

  // ── Helper: draw gantt header row ────────────────────────────────────────
  function drawGanttHeader(doc: any, pagePeriods: Period[], y: number) {
    doc.setFillColor(235, 238, 242);
    doc.setDrawColor(200, 208, 216);
    doc.setLineWidth(0.2);
    doc.rect(M, y, TASK_COL_W, HEADER_H, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("TASK", M + 3, y + HEADER_H - 3.5);

    pagePeriods.forEach((period, colIdx) => {
      const cx = M + TASK_COL_W + colIdx * PERIOD_COL_W;
      doc.setFillColor(235, 238, 242);
      doc.setDrawColor(200, 208, 216);
      doc.setLineWidth(0.2);
      doc.rect(cx, y, PERIOD_COL_W, HEADER_H, "FD");
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text(period.label, cx + PERIOD_COL_W / 2, y + HEADER_H - 3.5, {
        align: "center",
        maxWidth: PERIOD_COL_W - 1
      });
    });
  }

  // ── Gantt pages ──────────────────────────────────────────────────────────
  for (let periodPage = 0; periodPage < totalPeriodPages; periodPage++) {
    if (periodPage > 0) doc.addPage();

    const pagePeriods = periods.slice(periodPage * periodsPerPage, (periodPage + 1) * periodsPerPage);
    const firstPeriodLabel = pagePeriods[0]?.label ?? "";
    const lastPeriodLabel = pagePeriods[pagePeriods.length - 1]?.label ?? "";
    const subtitle = `${startDate} → ${endDate}  ·  ${granularity} view  ·  ${firstPeriodLabel} – ${lastPeriodLabel}  ·  ${visibleTasks.length} tasks`;

    drawPageHeader(doc, `${projectName} — Schedule`, subtitle, periodPage + 1, totalPeriodPages + 1);

    let y = 18;

    // First gantt header
    drawGanttHeader(doc, pagePeriods, y);
    y += HEADER_H;

    // Task rows
    visibleTasks.forEach((task, rowIdx) => {
      // Overflow onto new page
      if (y + ROW_H > PH - 14) {
        doc.addPage();
        drawPageHeader(doc, `${projectName} (cont.)`, subtitle, periodPage + 1, totalPeriodPages + 1);
        y = 18;
        drawGanttHeader(doc, pagePeriods, y);
        y += HEADER_H;
      }

      const alt = rowIdx % 2 === 0;

      // Task name cell
      doc.setFillColor(alt ? 248 : 255, alt ? 249 : 255, alt ? 250 : 255);
      doc.setDrawColor(215, 220, 228);
      doc.setLineWidth(0.15);
      doc.rect(M, y, TASK_COL_W, ROW_H, "FD");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(task.id, M + 2, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(...MUTED);
      const nameClip = task.name.length > 32 ? task.name.slice(0, 30) + "…" : task.name;
      doc.text(nameClip, M + 2, y + 8);

      // Period cells
      pagePeriods.forEach((period, colIdx) => {
        const cx = M + TASK_COL_W + colIdx * PERIOD_COL_W;

        doc.setFillColor(alt ? 248 : 255, alt ? 249 : 255, alt ? 250 : 255);
        doc.setDrawColor(215, 220, 228);
        doc.setLineWidth(0.15);
        doc.rect(cx, y, PERIOD_COL_W, ROW_H, "FD");

        // Task bar if this period overlaps
        if (task.startDate <= period.end && task.endDate >= period.start) {
          // Partial overlap: compute bar sub-width for day granularity
          const barColor: [number, number, number] = task.labourHoursMissing ? [217, 119, 6] : GOLD;
          doc.setFillColor(...barColor);
          doc.roundedRect(cx + 1.5, y + 2.5, PERIOD_COL_W - 3, ROW_H - 5, 1, 1, "F");
        }
      });

      y += ROW_H;
    });
  }

  // ── Summary table page ───────────────────────────────────────────────────
  doc.addPage();
  const summaryPageNum = totalPeriodPages + 1;
  const totalPages = summaryPageNum; // we'll fix footer below

  drawPageHeader(doc, `${projectName} — Task Summary`, `${visibleTasks.length} tasks  ·  ${startDate} to ${endDate}`, summaryPageNum, summaryPageNum);

  let sy = 18;

  // Section title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Task Summary", M, sy);
  sy += 6;

  const sumCols = [
    Math.min(PW * 0.10, 28),  // Task ID
    PW * 0.30,                 // Name
    PW * 0.13,                 // Start
    PW * 0.13,                 // End
    PW * 0.12,                 // Hours
    PW - 2 * M - Math.min(PW * 0.10, 28) - PW * 0.30 - PW * 0.13 - PW * 0.13 - PW * 0.12  // Status (remainder)
  ];
  const sumHeaders = ["Task ID", "Name", "Start", "End", "Hours", "Status"];

  // Table header
  let cx = M;
  sumHeaders.forEach((header, i) => {
    doc.setFillColor(...GOLD);
    doc.setDrawColor(180, 160, 60);
    doc.setLineWidth(0.2);
    doc.rect(cx, sy, sumCols[i], 7, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(header.toUpperCase(), cx + 2, sy + 4.8);
    cx += sumCols[i];
  });
  sy += 7;

  visibleTasks.forEach((task, i) => {
    if (sy + 7 > PH - 14) {
      doc.addPage();
      sy = M + 4;
    }
    const alt = i % 2 === 0;
    const cells = [
      task.id,
      task.name.length > 42 ? task.name.slice(0, 40) + "…" : task.name,
      task.startDate,
      task.endDate,
      task.totalLabourHours.toLocaleString("en-CA", { maximumFractionDigits: 0 }),
      task.labourHoursMissing ? "Missing hrs" : "OK"
    ];
    let cx = M;
    cells.forEach((cell, j) => {
      doc.setFillColor(alt ? 248 : 255, alt ? 249 : 255, alt ? 250 : 255);
      doc.setDrawColor(220, 224, 230);
      doc.setLineWidth(0.2);
      doc.rect(cx, sy, sumCols[j], 7, "FD");
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const isWarning = j === 5 && task.labourHoursMissing;
      doc.setTextColor(isWarning ? 180 : 30, isWarning ? 100 : 30, 30);
      doc.text(String(cell), cx + 2, sy + 4.8, { maxWidth: sumCols[j] - 4 });
      cx += sumCols[j];
    });
    sy += 7;
  });

  // ── Footer on every page ─────────────────────────────────────────────────
  const realTotalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
  for (let p = 1; p <= realTotalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(248, 249, 250);
    doc.rect(0, PH - 9, PW, 9, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Generated by Groupe Piché app  ·  ${dateStr}  ·  Page ${p} of ${realTotalPages}`,
      PW / 2,
      PH - 3,
      { align: "center" }
    );
  }

  const safeProject = projectName.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
  doc.save(`${safeProject}-schedule-${startDate}-${endDate}.pdf`);
}
