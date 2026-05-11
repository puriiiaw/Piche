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

const GOLD: [number, number, number] = [201, 168, 76];
const NAVY: [number, number, number] = [15, 25, 38];
const MUTED: [number, number, number] = [100, 116, 139];
const RED: [number, number, number] = [220, 38, 38];

// ─── Date helpers ──────────────────────────────────────────────────────────────

function parseIso(s: string): Date {
  return new Date(s + "T00:00:00");
}

function addDaysLocal(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Period builder ────────────────────────────────────────────────────────────

type Period = { key: string; label: string; start: string; end: string };

function buildPeriods(
  startDate: string,
  endDate: string,
  granularity: ScheduleGranularity
): Period[] {
  const periods: Period[] = [];
  let cursor = parseIso(startDate);
  const end = parseIso(endDate);

  if (granularity === "week") {
    const dow = cursor.getDay();
    cursor = addDaysLocal(cursor, dow === 0 ? -6 : 1 - dow);
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

// ─── Public helpers ────────────────────────────────────────────────────────────

export function autoGranularity(startDate: string, endDate: string): ScheduleGranularity {
  const days = (parseIso(endDate).getTime() - parseIso(startDate).getTime()) / 86_400_000;
  if (days <= 21) return "day";
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
  const leftW = Math.round(pw * 0.35);
  const rightW = pw - leftW - 20;
  const colW = granularity === "day" ? 8 : granularity === "week" ? 14 : 22;
  const periodsPerPage = Math.max(1, Math.floor(rightW / colW));
  return Math.max(1, Math.ceil(periods.length / periodsPerPage));
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function exportSchedulePDF(options: ScheduleExportOptions) {
  const { jsPDF } = await import("jspdf");
  const { projectName, tasks, startDate, endDate, granularity, orientation } = options;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 10;
  const dateStr = new Date().toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric"
  });

  // ── Layout constants ───────────────────────────────────────────────────────
  const LEFT_W   = Math.round(PW * 0.35);   // left info panel width
  const RIGHT_X  = M + LEFT_W;               // right panel x start
  const RIGHT_W  = PW - M - LEFT_W - M;      // right panel width
  const COL_W    = granularity === "day" ? 8 : granularity === "week" ? 14 : 22;
  const ROW_H    = 7;                         // task row height
  const HDR_H    = 9;                         // period header height
  const HDR_TOP  = 12;                        // y where header row starts (after page banner)
  const FIRST_ROW_Y = HDR_TOP + HDR_H;       // y where first data row starts
  const FOOTER_H = 8;

  // Left panel column widths (must sum to LEFT_W)
  const ID_W     = 18;
  const NAME_W   = LEFT_W - ID_W - 18 - 18 - 14; // ID + START + END + HRS
  const START_W  = 18;
  const END_W    = 18;
  const HRS_W    = 14;

  const periods = buildPeriods(startDate, endDate, granularity);
  const periodsPerPage = Math.max(1, Math.floor(RIGHT_W / COL_W));
  const visibleTasks = tasks.filter((t) => t.endDate >= startDate && t.startDate <= endDate);
  const totalPeriodPages = Math.max(1, Math.ceil(periods.length / periodsPerPage));

  // Pre-calculate total pages (Gantt pages accounting for row overflow + 1 summary)
  const usableH = PH - HDR_TOP - HDR_H - FOOTER_H;
  const rowsPerGanttPage = Math.max(1, Math.floor(usableH / ROW_H));
  const ganttPagesPerPeriodPage = Math.max(1, Math.ceil(visibleTasks.length / rowsPerGanttPage));
  const totalGanttPages = totalPeriodPages * ganttPagesPerPeriodPage;
  const TOTAL_PAGES = totalGanttPages + 1; // +1 for summary

  let currentPage = 0;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addNewPage() {
    doc.addPage();
    currentPage++;
  }

  function drawBanner(pg: number) {
    doc.setFillColor(...GOLD);
    doc.rect(0, 0, PW, 11, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("GROUPE PICHÉ", M, 7.5);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${projectName}  ·  ${startDate} → ${endDate}`,
      PW / 2, 7.5, { align: "center" }
    );

    doc.setFontSize(7);
    doc.text(
      `Exported: ${dateStr}  ·  Page ${pg} of ${TOTAL_PAGES}`,
      PW - M, 7.5, { align: "right" }
    );
  }

  function drawFooter() {
    doc.setFillColor(248, 249, 250);
    doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(
      `Generated by Groupe Piché app  ·  ${dateStr}`,
      PW / 2, PH - 2.5, { align: "center" }
    );
  }

  function drawPanelHeaders(pagePeriods: Period[]) {
    const y = HDR_TOP;

    // Left panel header cells
    const lhdrs: [string, number][] = [
      ["TASK ID", ID_W],
      ["NAME",    NAME_W],
      ["START",   START_W],
      ["END",     END_W],
      ["HOURS",   HRS_W]
    ];
    let cx = M;
    lhdrs.forEach(([label, w]) => {
      doc.setFillColor(235, 238, 242);
      doc.setDrawColor(195, 202, 212);
      doc.setLineWidth(0.15);
      doc.rect(cx, y, w, HDR_H, "FD");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text(label, cx + 2, y + HDR_H - 2.5);
      cx += w;
    });

    // Right panel period header cells
    pagePeriods.forEach((period, colIdx) => {
      const rx = RIGHT_X + colIdx * COL_W;
      doc.setFillColor(235, 238, 242);
      doc.setDrawColor(195, 202, 212);
      doc.setLineWidth(0.15);
      doc.rect(rx, y, COL_W, HDR_H, "FD");
      doc.setFontSize(4.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      const lbl = period.label.length > 7
        ? period.label.slice(0, 6) + "…"
        : period.label;
      doc.text(lbl, rx + COL_W / 2, y + HDR_H - 2.5, { align: "center" });
    });
  }

  // Draw a single task row: left panel info + right panel background + ONE continuous bar
  function drawTaskRow(
    task: MinimalTask,
    rowIdx: number,
    pagePeriods: Period[],
    rowY: number
  ) {
    const alt = rowIdx % 2 === 0;
    const bg: [number, number, number] = alt ? [248, 249, 250] : [255, 255, 255];

    // ── Left panel ──────────────────────────────────────────────────────────
    const cells: [string, number][] = [
      [task.id.length > 10 ? task.id.slice(0, 9) + "…" : task.id,   ID_W],
      [task.name.length > Math.floor(NAME_W / 1.9) ? task.name.slice(0, Math.floor(NAME_W / 1.9) - 1) + "…" : task.name, NAME_W],
      [task.startDate.slice(5).replace("-", "/"), START_W],  // MM/DD
      [task.endDate.slice(5).replace("-", "/"),   END_W],
      [task.totalLabourHours.toLocaleString("en-CA", { maximumFractionDigits: 0 }), HRS_W]
    ];

    let cx = M;
    cells.forEach(([text, w], i) => {
      doc.setFillColor(...bg);
      doc.setDrawColor(210, 215, 222);
      doc.setLineWidth(0.1);
      doc.rect(cx, rowY, w, ROW_H, "FD");
      doc.setFontSize(i === 0 ? 6.5 : 5.5);
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setTextColor(i >= 2 ? MUTED[0] : 30, i >= 2 ? MUTED[1] : 30, 30);
      doc.text(text, cx + 2, rowY + ROW_H - 2);
      cx += w;
    });

    // ── Right panel: background cells ───────────────────────────────────────
    pagePeriods.forEach((_period, colIdx) => {
      const rx = RIGHT_X + colIdx * COL_W;
      doc.setFillColor(...bg);
      doc.setDrawColor(210, 215, 222);
      doc.setLineWidth(0.1);
      doc.rect(rx, rowY, COL_W, ROW_H, "FD");
    });

    // ── Right panel: ONE continuous bar ─────────────────────────────────────
    if (!pagePeriods.length) return;

    const pageStart = pagePeriods[0].start;
    const pageEnd   = pagePeriods[pagePeriods.length - 1].end;

    // No overlap with this period page
    if (task.endDate < pageStart || task.startDate > pageEnd) return;

    const startsBefore = task.startDate < pageStart;
    const endsAfter    = task.endDate > pageEnd;

    // Clamp task dates to the page's visible range
    const visibleStart = startsBefore ? pageStart : task.startDate;
    const visibleEnd   = endsAfter   ? pageEnd   : task.endDate;

    // Convert dates to fractional position across the right panel
    // Use the full span from pageStart to day-after-pageEnd (inclusive end)
    const rangeMs = parseIso(pageEnd).getTime() - parseIso(pageStart).getTime() + 86_400_000;
    const startFrac = (parseIso(visibleStart).getTime() - parseIso(pageStart).getTime()) / rangeMs;
    const endFrac   = (parseIso(visibleEnd).getTime()   - parseIso(pageStart).getTime() + 86_400_000) / rangeMs;

    const totalRightPx = pagePeriods.length * COL_W;
    const barX = RIGHT_X + Math.max(0, startFrac) * totalRightPx;
    const barEnd = RIGHT_X + Math.min(1, endFrac) * totalRightPx;
    const barW = barEnd - barX;
    if (barW <= 0.5) return;

    const BAR_MARGIN = 1.5;
    const barTop = rowY + BAR_MARGIN;
    const barH   = ROW_H - BAR_MARGIN * 2;

    if (task.labourHoursMissing) {
      // Missing hours: light gray + dashed border
      doc.setFillColor(205, 212, 220);
      doc.rect(barX, barTop, barW, barH, "F");
      doc.setDrawColor(145, 158, 170);
      doc.setLineWidth(0.35);
      doc.setLineDashPattern([1.2, 0.8], 0);
      doc.rect(barX, barTop, barW, barH, "D");
      doc.setLineDashPattern([], 0);
    } else {
      // Normal: gold fill, rounded
      doc.setFillColor(...GOLD);
      doc.roundedRect(barX, barTop, barW, barH, 0.8, 0.8, "F");
    }

    // Left-arrow if task started before this page range
    if (startsBefore) {
      const ax = barX + 0.5;
      const mid = barTop + barH / 2;
      doc.setFillColor(160, 130, 40);
      doc.triangle(ax, mid, ax + 2.5, barTop, ax + 2.5, barTop + barH, "F");
    }
    // Right-arrow if task ends after this page range
    if (endsAfter) {
      const ax = barEnd - 0.5;
      const mid = barTop + barH / 2;
      doc.setFillColor(160, 130, 40);
      doc.triangle(ax, mid, ax - 2.5, barTop, ax - 2.5, barTop + barH, "F");
    }
  }

  // ── Render Gantt pages ─────────────────────────────────────────────────────

  for (let periodPage = 0; periodPage < totalPeriodPages; periodPage++) {
    const pagePeriods = periods.slice(
      periodPage * periodsPerPage,
      (periodPage + 1) * periodsPerPage
    );

    // Each period page may require multiple sub-pages if there are many tasks
    let taskOffset = 0;

    while (taskOffset < visibleTasks.length || taskOffset === 0) {
      if (currentPage === 0) {
        currentPage = 1;
      } else {
        addNewPage();
      }

      drawBanner(currentPage);
      drawFooter();
      drawPanelHeaders(pagePeriods);

      let rowY = FIRST_ROW_Y;
      let rowIdx = taskOffset;

      while (rowIdx < visibleTasks.length) {
        if (rowY + ROW_H > PH - FOOTER_H - 1) break;
        drawTaskRow(visibleTasks[rowIdx], rowIdx, pagePeriods, rowY);
        rowY += ROW_H;
        rowIdx++;
      }

      taskOffset = rowIdx;
      if (taskOffset >= visibleTasks.length) break;
    }
  }

  // ── Summary table page ─────────────────────────────────────────────────────
  addNewPage();
  drawBanner(currentPage);
  drawFooter();

  let sy = HDR_TOP + 2;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Task Summary", M, sy);
  sy += 6;

  // Summary column widths
  const S_ID    = 20;
  const S_NAME  = Math.round(PW * 0.28);
  const S_START = 22;
  const S_END   = 22;
  const S_HRS   = 22;
  const S_STAT  = PW - 2 * M - S_ID - S_NAME - S_START - S_END - S_HRS;
  const sumCols = [S_ID, S_NAME, S_START, S_END, S_HRS, S_STAT];
  const sumHdrs = ["TASK ID", "NAME", "START", "END", "HOURS", "STATUS"];

  // Header row
  let hx = M;
  sumHdrs.forEach((h, i) => {
    doc.setFillColor(...GOLD);
    doc.setDrawColor(170, 148, 50);
    doc.setLineWidth(0.2);
    doc.rect(hx, sy, sumCols[i], 8, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(h, hx + 2, sy + 5.5);
    hx += sumCols[i];
  });
  sy += 8;

  let totalHrs = 0;
  visibleTasks.forEach((task, i) => {
    if (sy + 7 > PH - FOOTER_H - 1) {
      addNewPage();
      drawBanner(currentPage);
      drawFooter();
      sy = HDR_TOP + 4;
    }

    totalHrs += task.totalLabourHours;
    const alt = i % 2 === 0;
    const isOk = !task.labourHoursMissing;
    const cells = [
      task.id,
      task.name.length > 44 ? task.name.slice(0, 42) + "…" : task.name,
      task.startDate,
      task.endDate,
      task.totalLabourHours.toLocaleString("en-CA", { maximumFractionDigits: 0 }),
      isOk ? "OK" : "Missing hrs"
    ];

    let cx = M;
    cells.forEach((cell, j) => {
      doc.setFillColor(alt ? 248 : 255, alt ? 249 : 255, alt ? 250 : 255);
      doc.setDrawColor(212, 218, 226);
      doc.setLineWidth(0.15);
      doc.rect(cx, sy, sumCols[j], 7, "FD");
      doc.setFontSize(7);
      doc.setFont("helvetica", j === 5 ? "bold" : "normal");
      const isStatus = j === 5;
      const isMissing = isStatus && !isOk;
      doc.setTextColor(isMissing ? RED[0] : 30, isMissing ? RED[1] : 30, 30);
      if (isStatus && isOk) doc.setTextColor(16, 130, 80);
      doc.text(String(cell), cx + 2, sy + 5, { maxWidth: sumCols[j] - 3 });
      cx += sumCols[j];
    });
    sy += 7;
  });

  // Totals row
  if (sy + 9 <= PH - FOOTER_H - 1) {
    const totals = [
      "",
      `${visibleTasks.length} tasks total`,
      "", "",
      totalHrs.toLocaleString("en-CA", { maximumFractionDigits: 0 }) + " hrs",
      ""
    ];
    let cx = M;
    totals.forEach((cell, j) => {
      doc.setFillColor(230, 234, 240);
      doc.setDrawColor(190, 198, 210);
      doc.setLineWidth(0.2);
      doc.rect(cx, sy, sumCols[j], 8, "FD");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      if (cell) doc.text(cell, cx + 2, sy + 5.5, { maxWidth: sumCols[j] - 3 });
      cx += sumCols[j];
    });
  }

  const safeProject = projectName.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
  doc.save(`${safeProject}-schedule-${startDate}-${endDate}.pdf`);
}
