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

// ─── Colours ──────────────────────────────────────────────────────────────────
const GOLD:       [number,number,number] = [201, 168,  76];
const NAVY:       [number,number,number] = [15,   25,  38];
const MUTED:      [number,number,number] = [100, 116, 139];
const DARK_HDR:   [number,number,number] = [26,   26,  26];
const DARK_PARENT:[number,number,number] = [45,   45,  45];
const RED_BAR:    [number,number,number] = [224,  85,  85];
const GRAY_BAR:   [number,number,number] = [85,   85,  85];

// ─── Date helpers ──────────────────────────────────────────────────────────────
function parseIso(s: string): Date { return new Date(s + "T00:00:00"); }

function addDaysLocal(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fmtMDY(iso: string): string {
  const d = parseIso(iso);
  return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${String(d.getFullYear()).slice(2)}`;
}

function calDays(startIso: string, endIso: string): number {
  return Math.max(1, Math.round((parseIso(endIso).getTime() - parseIso(startIso).getTime()) / 86_400_000) + 1);
}

// ─── Period builder ────────────────────────────────────────────────────────────
type Period = { key: string; label: string; start: string; end: string };

function buildPeriods(start: string, end: string, gran: ScheduleGranularity): Period[] {
  const periods: Period[] = [];
  let cur = parseIso(start);
  const endD = parseIso(end);

  if (gran === "week") {
    const dow = cur.getDay();
    cur = addDaysLocal(cur, dow === 0 ? -6 : 1 - dow);
  } else if (gran === "month") {
    cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
  }

  let guard = 0;
  while (cur <= endD && guard < 600) {
    let pEnd: Date;
    let label: string;
    if (gran === "day") {
      pEnd  = new Date(cur);
      label = cur.toLocaleDateString("en-CA", { weekday: "short", day: "numeric" });
    } else if (gran === "week") {
      pEnd  = addDaysLocal(cur, 6);
      label = cur.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    } else {
      pEnd  = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      label = cur.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
    }
    periods.push({ key: toIso(cur), label, start: toIso(cur), end: toIso(pEnd) });
    if (gran === "day")        cur = addDaysLocal(cur, 1);
    else if (gran === "week")  cur = addDaysLocal(cur, 7);
    else                       cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    guard++;
  }
  return periods;
}

// ─── Public helpers ────────────────────────────────────────────────────────────
export function autoGranularity(start: string, end: string): ScheduleGranularity {
  const days = (parseIso(end).getTime() - parseIso(start).getTime()) / 86_400_000;
  if (days <= 21)  return "day";
  if (days <= 120) return "week";
  return "month";
}

export function estimatePageCount(
  _startDate: string,
  _endDate: string,
  _granularity: ScheduleGranularity,
  _orientation: ScheduleOrientation,
  taskCount = 30
): number {
  // A3 landscape: ~32 task rows per Gantt page + 1 summary page
  const rowsPerPage = 32;
  return Math.max(1, Math.ceil(taskCount / rowsPerPage)) + 1;
}

// ─── Row-style helpers ─────────────────────────────────────────────────────────
type RowStyle = {
  bg:       [number,number,number];
  txtColor: [number,number,number];
  bold:     boolean;
  barColor: [number,number,number];
  barH:     number;   // mm
  isParent: boolean;
};

function getZone(task: MinimalTask): string {
  const id = task.id.toUpperCase();
  if (/^L2/.test(id)) return "L2";
  if (/^LE/.test(id)) return "LE";
  if (/^L3/.test(id)) return "L3";
  if (/^P1/.test(id)) return "P1";
  if (/drywall ceiling framing/i.test(task.name)) return "DRYWALL";
  return "DEFAULT";
}

function isParent(task: MinimalTask): boolean {
  return task.totalLabourHours === 0 && !task.labourHoursMissing;
}

function rowStyle(task: MinimalTask): RowStyle {
  if (isParent(task)) {
    return { bg: DARK_PARENT, txtColor: [255,255,255], bold: true,  barColor: GRAY_BAR, barH: 2.5, isParent: true };
  }
  const zone = getZone(task);
  const bgMap: Record<string,[number,number,number]> = {
    L2:      [214, 228, 247],
    LE:      [214, 236, 214],
    L3:      [255, 243, 204],
    P1:      [237, 224, 245],
    DRYWALL: [250, 218, 221],
    DEFAULT: [255, 255, 255],
  };
  const barMap: Record<string,[number,number,number]> = {
    DRYWALL: RED_BAR,
  };
  return {
    bg:       bgMap[zone]  || bgMap.DEFAULT,
    txtColor: [26, 26, 26],
    bold:     false,
    barColor: barMap[zone] || GOLD,
    barH:     4.5,
    isParent: false,
  };
}

function indentMM(task: MinimalTask): number {
  // Indent sub-tasks based on dot-depth in ID (e.g. "1.2.3" → 2 levels → 8mm)
  const dots = (task.id.match(/\./g) || []).length;
  return dots * 4;
}

// ─── Main export ───────────────────────────────────────────────────────────────
export async function exportSchedulePDF(options: ScheduleExportOptions) {
  const { jsPDF }     = await import("jspdf");
  const autoTable     = (await import("jspdf-autotable")).default;
  const { projectName, tasks, startDate, endDate, granularity, orientation } = options;

  // A3 document
  const doc = new jsPDF({ orientation, unit: "mm", format: "a3" });
  const PW  = doc.internal.pageSize.getWidth();   // 420 landscape / 297 portrait
  const PH  = doc.internal.pageSize.getHeight();  // 297 landscape / 420 portrait
  const M   = 10; // uniform margin

  const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  // ── Layout constants ────────────────────────────────────────────────────────
  const BANNER_H  = 12; // top page header height
  const COL_HDR_H =  8; // column-label row height
  const FOOTER_H  =  8;
  const ROW_H     =  7; // task row height
  const LEFT_W    = 110;
  const RIGHT_X   = M + LEFT_W;
  const RIGHT_W   = PW - M - LEFT_W - M; // full remaining width

  // Left panel sub-column widths (must sum to LEFT_W = 110)
  const C_ID   = 12;
  const C_MODE =  6;
  const C_NAME = 60;
  const C_DUR  = 12;
  const C_STA  = 10;
  const C_FIN  = 10;
  // 12+6+60+12+10+10 = 110 ✓

  // ── Time axis ───────────────────────────────────────────────────────────────
  const periods   = buildPeriods(startDate, endDate, granularity);
  const colW      = periods.length > 0 ? Math.max(5, RIGHT_W / periods.length) : RIGHT_W;

  const rangeStartMs  = parseIso(startDate).getTime();
  const rangeEndMs    = parseIso(endDate).getTime();
  const rangeTotalMs  = rangeEndMs - rangeStartMs + 86_400_000; // inclusive

  // Today vertical line
  const todayMs  = new Date().setHours(0, 0, 0, 0);
  const todayX   = todayMs >= rangeStartMs && todayMs <= rangeEndMs
    ? RIGHT_X + ((todayMs - rangeStartMs) / rangeTotalMs) * RIGHT_W
    : null;

  // Visible tasks
  const visTasks = tasks.filter(t => t.endDate >= startDate && t.startDate <= endDate);

  // Rows available per page (after banner + col-hdr + footer + margins)
  const usableH       = PH - M - BANNER_H - COL_HDR_H - FOOTER_H - M;
  const rowsPerPage   = Math.max(1, Math.floor(usableH / ROW_H));
  const ganttPages    = Math.max(1, Math.ceil(visTasks.length / rowsPerPage));
  const TOTAL_PAGES   = ganttPages + 1; // +1 summary

  let currentPage = 1;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function drawBanner(pg: number) {
    // White background strip
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, PW, BANNER_H, "F");

    // Left: GROUPE PICHÉ (gold bold) · project name (black normal)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GOLD);
    doc.text("GROUPE PICHÉ", M, 7.5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NAVY);
    doc.text(`  ${projectName}`, M + 28, 7.5);

    // Center: date range
    const startLabel = parseIso(startDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
    const endLabel   = parseIso(endDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`${startLabel} – ${endLabel}`, PW / 2, 7.5, { align: "center" });

    // Right: exported date + page
    doc.setFontSize(7.5);
    doc.text(`Exported: ${dateStr}  ·  Page ${pg} of ${TOTAL_PAGES}`, PW - M, 7.5, { align: "right" });

    // Separator line
    doc.setDrawColor(200, 205, 212);
    doc.setLineWidth(0.4);
    doc.line(0, BANNER_H, PW, BANNER_H);
  }

  function drawFooter() {
    const fy = PH - FOOTER_H;
    doc.setDrawColor(200, 205, 212);
    doc.setLineWidth(0.3);
    doc.line(0, fy, PW, fy);
    doc.setFillColor(248, 249, 250);
    doc.rect(0, fy, PW, FOOTER_H, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`Generated by Groupe Piché app  ·  ${dateStr}`, PW / 2, fy + 5, { align: "center" });
  }

  function drawColumnHeaders(baseY: number) {
    // Left panel header (dark background)
    doc.setFillColor(...DARK_HDR);
    doc.rect(M, baseY, LEFT_W, COL_HDR_H, "F");

    const lCols: [string, number][] = [
      ["ID",        C_ID],
      ["Mode",      C_MODE],
      ["Task Name", C_NAME],
      ["Duration",  C_DUR],
      ["Start",     C_STA],
      ["Finish",    C_FIN],
    ];
    let cx = M;
    lCols.forEach(([label, w]) => {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(label, cx + 2, baseY + COL_HDR_H - 2.5);
      // Vertical divider
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.2);
      doc.line(cx, baseY, cx, baseY + COL_HDR_H);
      cx += w;
    });

    // Right panel time-axis header (same dark background)
    doc.setFillColor(...DARK_HDR);
    doc.rect(RIGHT_X, baseY, RIGHT_W, COL_HDR_H, "F");

    periods.forEach((period, i) => {
      const px = RIGHT_X + i * colW;
      // Vertical tick
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.15);
      doc.line(px, baseY, px, baseY + COL_HDR_H);
      // Label
      const lbl = period.label.length > Math.floor(colW / 1.8)
        ? period.label.slice(0, Math.floor(colW / 1.8) - 1) + "…"
        : period.label;
      doc.setFontSize(Math.max(4, Math.min(6, colW * 0.42)));
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(lbl, px + colW / 2, baseY + COL_HDR_H - 2.5, { align: "center" });
    });

    // Today indicator in header
    if (todayX !== null) {
      doc.setFillColor(255, 80, 80);
      doc.rect(todayX - 0.5, baseY, 1, COL_HDR_H, "F");
    }
  }

  function drawTaskRow(task: MinimalTask, rowIdx: number, rowY: number) {
    const st = rowStyle(task);

    // ── Left panel background ──
    doc.setFillColor(...st.bg);
    doc.setDrawColor(200, 205, 210);
    doc.setLineWidth(0.1);
    doc.rect(M, rowY, LEFT_W, ROW_H, "FD");

    // ── Left panel content ──
    let cx = M;

    // ID cell
    doc.setFillColor(...st.bg);
    doc.setDrawColor(200, 205, 210);
    doc.setLineWidth(0.1);
    doc.rect(cx, rowY, C_ID, ROW_H, "FD");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(102, 102, 102);
    doc.text(task.id.length > 6 ? task.id.slice(0, 5) + "…" : task.id, cx + 1.5, rowY + ROW_H - 2);
    cx += C_ID;

    // Task Mode cell (small coloured square)
    doc.rect(cx, rowY, C_MODE, ROW_H, "FD");
    const sq: [number,number,number] = st.isParent ? GRAY_BAR : st.barColor;
    doc.setFillColor(sq[0], sq[1], sq[2]);
    doc.rect(cx + 1.5, rowY + 2, 3, 3, "F");
    cx += C_MODE;

    // Name cell (with indent)
    doc.setFillColor(...st.bg);
    doc.rect(cx, rowY, C_NAME, ROW_H, "FD");
    const indent = indentMM(task);
    const nameX  = cx + 2 + indent;
    const maxNameW = C_NAME - 2 - indent - 1;
    doc.setFontSize(7);
    doc.setFont("helvetica", st.bold ? "bold" : "normal");
    doc.setTextColor(...st.txtColor);
    // Try to fit; reduce font if name is long
    const estCharW = 7 * 0.42; // ~0.42mm per char at 7pt
    const fitChars = Math.floor(maxNameW / estCharW);
    if (task.name.length <= fitChars) {
      doc.text(task.name, nameX, rowY + ROW_H - 2);
    } else {
      // Try at 5.5pt
      doc.setFontSize(5.5);
      const fitChars2 = Math.floor(maxNameW / (5.5 * 0.42));
      const displayName = task.name.length <= fitChars2
        ? task.name
        : task.name.slice(0, fitChars2 - 1) + "…";
      doc.text(displayName, nameX, rowY + ROW_H - 2);
      doc.setFontSize(7);
    }
    cx += C_NAME;

    // Duration
    doc.setFillColor(...st.bg);
    doc.rect(cx, rowY, C_DUR, ROW_H, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...st.txtColor);
    const days = calDays(task.startDate, task.endDate);
    const durLabel = days >= 14 ? `${Math.round(days/7)}w` : `${days}d`;
    doc.text(durLabel, cx + 1.5, rowY + ROW_H - 2);
    cx += C_DUR;

    // Start
    doc.setFillColor(...st.bg);
    doc.rect(cx, rowY, C_STA, ROW_H, "FD");
    doc.setFontSize(5.8);
    doc.text(fmtMDY(task.startDate), cx + 1, rowY + ROW_H - 2);
    cx += C_STA;

    // Finish
    doc.setFillColor(...st.bg);
    doc.rect(cx, rowY, C_FIN, ROW_H, "FD");
    doc.text(fmtMDY(task.endDate), cx + 1, rowY + ROW_H - 2);

    // ── Right panel background (same colour as left row) ──
    doc.setFillColor(...st.bg);
    doc.setDrawColor(200, 205, 210);
    doc.setLineWidth(0.1);
    doc.rect(RIGHT_X, rowY, RIGHT_W, ROW_H, "FD");

    // Vertical period grid lines
    periods.forEach((_p, i) => {
      const px = RIGHT_X + i * colW;
      doc.setDrawColor(221, 221, 221);
      doc.setLineWidth(0.1);
      doc.line(px, rowY, px, rowY + ROW_H);
    });

    // Today's date vertical line
    if (todayX !== null) {
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.line(todayX, rowY, todayX, rowY + ROW_H);
      doc.setLineDashPattern([], 0);
    }

    // ── Bar ────────────────────────────────────────────────────────────────
    const taskStartMs = parseIso(task.startDate).getTime();
    const taskEndMs   = parseIso(task.endDate).getTime();

    if (taskEndMs < rangeStartMs || taskStartMs > rangeEndMs) return; // no overlap

    const startsBefore = taskStartMs < rangeStartMs;
    const endsAfter    = taskEndMs   > rangeEndMs;

    const clampedStart = Math.max(taskStartMs, rangeStartMs);
    const clampedEnd   = Math.min(taskEndMs,   rangeEndMs);

    const startFrac = (clampedStart - rangeStartMs) / rangeTotalMs;
    const endFrac   = (clampedEnd   - rangeStartMs + 86_400_000) / rangeTotalMs;

    const barX   = RIGHT_X + Math.max(0, startFrac) * RIGHT_W;
    const barEndX= RIGHT_X + Math.min(1, endFrac)   * RIGHT_W;
    const barW   = barEndX - barX;
    if (barW < 0.5) return;

    const BAR_H  = st.barH;
    const barTop = rowY + (ROW_H - BAR_H) / 2;

    if (task.labourHoursMissing && !st.isParent) {
      doc.setFillColor(238, 238, 238);
      doc.roundedRect(barX, barTop, barW, BAR_H, 0.8, 0.8, "F");
      doc.setDrawColor(155, 162, 170);
      doc.setLineWidth(0.35);
      doc.setLineDashPattern([1.2, 0.8], 0);
      doc.roundedRect(barX, barTop, barW, BAR_H, 0.8, 0.8, "D");
      doc.setLineDashPattern([], 0);
    } else {
      doc.setFillColor(...st.barColor);
      doc.roundedRect(barX, barTop, barW, BAR_H, st.isParent ? 0 : 0.8, st.isParent ? 0 : 0.8, "F");
    }

    // Arrow overlays
    if (startsBefore) {
      const mid = barTop + BAR_H / 2;
      doc.setFillColor(130, 105, 25);
      doc.triangle(barX, mid, barX + 2.5, barTop, barX + 2.5, barTop + BAR_H, "F");
    }
    if (endsAfter) {
      const mid = barTop + BAR_H / 2;
      doc.setFillColor(130, 105, 25);
      doc.triangle(barEndX, mid, barEndX - 2.5, barTop, barEndX - 2.5, barTop + BAR_H, "F");
    }

    void rowIdx;
  }

  // ── Render Gantt pages ─────────────────────────────────────────────────────
  for (let pg = 0; pg < ganttPages; pg++) {
    if (pg > 0) { doc.addPage(); currentPage++; }

    drawBanner(currentPage);
    drawFooter();

    const baseY = M + BANNER_H;
    drawColumnHeaders(baseY);

    let rowY   = baseY + COL_HDR_H;
    const slice = visTasks.slice(pg * rowsPerPage, (pg + 1) * rowsPerPage);

    slice.forEach((task, ri) => {
      drawTaskRow(task, pg * rowsPerPage + ri, rowY);
      rowY += ROW_H;
    });
  }

  // ── Summary page ───────────────────────────────────────────────────────────
  doc.addPage();
  currentPage++;
  drawBanner(currentPage);
  drawFooter();

  const sumBaseY = M + BANNER_H + 4;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Task Summary", M, sumBaseY);

  // Build table body for autoTable
  let totalHrs = 0;
  const body = visTasks.map((t) => {
    totalHrs += t.totalLabourHours;
    return [
      t.id,
      t.name,
      t.startDate,
      t.endDate,
      `${calDays(t.startDate, t.endDate)}d`,
      t.totalLabourHours.toLocaleString("en-CA", { maximumFractionDigits: 0 }),
      t.labourHoursMissing ? "Missing hrs" : "OK",
    ];
  });
  body.push([
    "",
    `${visTasks.length} tasks total`,
    "", "", "",
    totalHrs.toLocaleString("en-CA", { maximumFractionDigits: 0 }),
    "",
  ]);

  autoTable(doc, {
    startY: sumBaseY + 5,
    margin: { left: M, right: M },
    head: [["Task ID", "Name", "Start", "End", "Duration", "Hours", "Status"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: DARK_HDR,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [26, 26, 26],
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22 },
    },
    didParseCell(data) {
      // Totals row (last row)
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [225, 230, 238];
      }
      // Status cell colour
      if (data.column.index === 6 && data.section === "body" && data.row.index < body.length - 1) {
        const val = String(data.cell.raw);
        if (val === "OK")          data.cell.styles.textColor = [16, 130, 80];
        if (val === "Missing hrs") data.cell.styles.textColor = RED_BAR;
      }
    },
    didDrawPage() {
      // Re-draw footer on any autoTable overflow pages (autoTable adds pages internally)
      drawFooter();
    },
  });

  const safe = projectName.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
  doc.save(`${safe}-schedule-${startDate}-${endDate}.pdf`);
}
