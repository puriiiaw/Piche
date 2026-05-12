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

// ── Date helpers ──────────────────────────────────────────────────────────────
function parseIso(s: string): Date {
  return new Date(s + "T00:00:00");
}

function addDaysLocal(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtMDY(iso: string): string {
  const d = parseIso(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
}

function calDays(s: string, e: string): number {
  return Math.max(1, Math.round((parseIso(e).getTime() - parseIso(s).getTime()) / 86_400_000) + 1);
}

// ── Period builder ────────────────────────────────────────────────────────────
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
      pEnd = new Date(cur);
      label = cur.toLocaleDateString("en-CA", { weekday: "short", day: "numeric" });
    } else if (gran === "week") {
      pEnd = addDaysLocal(cur, 6);
      label = cur.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    } else {
      pEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      label = cur.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
    }
    periods.push({ key: toIso(cur), label, start: toIso(cur), end: toIso(pEnd) });
    if (gran === "day") cur = addDaysLocal(cur, 1);
    else if (gran === "week") cur = addDaysLocal(cur, 7);
    else cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    guard++;
  }
  return periods;
}

// ── Public helpers ────────────────────────────────────────────────────────────
export function autoGranularity(start: string, end: string): ScheduleGranularity {
  const days = (parseIso(end).getTime() - parseIso(start).getTime()) / 86_400_000;
  if (days <= 21) return "day";
  if (days <= 120) return "week";
  return "month";
}

export function estimatePageCount(
  _s: string,
  _e: string,
  _g: ScheduleGranularity,
  _o: ScheduleOrientation,
  taskCount = 30
): number {
  return Math.max(1, Math.ceil(taskCount / 36)) + 1;
}

// ── Style helpers ─────────────────────────────────────────────────────────────
function isParent(t: MinimalTask): boolean {
  return t.totalLabourHours === 0 && !t.labourHoursMissing;
}

function getRowBg(t: MinimalTask): [number, number, number] {
  if (isParent(t)) return [45, 45, 45];
  const id = t.id.toUpperCase();
  if (/^L2/.test(id)) return [214, 228, 247];
  if (/^LE/.test(id)) return [214, 236, 214];
  if (/^L3/.test(id)) return [237, 224, 245];
  if (/^P1/.test(id)) return [255, 243, 204];
  if (/drywall ceiling framing/i.test(t.name)) return [250, 218, 221];
  return [255, 255, 255];
}

function getBarColor(t: MinimalTask): [number, number, number] {
  if (isParent(t)) return [85, 85, 85];
  if (t.labourHoursMissing) return [220, 220, 220];
  if (/drywall ceiling framing/i.test(t.name)) return [224, 85, 85];
  return [201, 168, 76];
}

function getIndentMM(t: MinimalTask): number {
  return (t.id.match(/\./g) || []).length * 4;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function exportSchedulePDF(opts: ScheduleExportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { projectName, tasks, startDate, endDate, granularity } = opts;

  // ── Page & layout constants ──────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  doc.setFont("helvetica");

  const PW         = 420;   // A3 landscape width
  const PH         = 297;   // A3 landscape height
  const M          = 10;    // margin
  const LEFT_X     = 10;    // left panel origin x
  const LEFT_W     = 120;   // left panel width
  const RIGHT_X    = 130;   // right panel origin x
  const RIGHT_W    = 280;   // right panel width
  const FULL_W     = 400;   // 10 → 410
  const ROW_H      = 7;     // task row height mm
  const HDR_H      = 9;     // column header row height mm
  const BANNER_H   = 8;     // top banner height mm
  const FOOTER_Y   = 289;   // footer top y
  const FOOTER_H   = 6;     // footer height mm

  // Left panel column widths (must sum to LEFT_W = 120)
  const C_ID   = 14;  // x: 10..24
  const C_NAME = 66;  // x: 24..90
  const C_DUR  = 20;  // x: 90..110
  const C_STA  = 10;  // x: 110..120
  const C_FIN  = 10;  // x: 120..130
  // 14+66+20+10+10 = 120 ✓

  const CONTENT_START = M + BANNER_H + HDR_H; // y = 27, where rows begin
  const PAGE_BOTTOM   = FOOTER_Y - 4;          // y = 285, last safe row y

  // ── Time range math ──────────────────────────────────────────────────────────
  const rangeStartMs   = parseIso(startDate).getTime();
  const rangeEndMs     = parseIso(endDate).getTime();
  const totalRangeDays = (rangeEndMs - rangeStartMs) / 86_400_000 + 1; // inclusive

  const todayMs = new Date().setHours(0, 0, 0, 0);

  // ── Periods for time axis ────────────────────────────────────────────────────
  const periods = buildPeriods(startDate, endDate, granularity);
  const colW    = periods.length > 0 ? RIGHT_W / periods.length : RIGHT_W;

  // ── Visible tasks ─────────────────────────────────────────────────────────────
  const visTasks   = tasks.filter(t => t.endDate >= startDate && t.startDate <= endDate);
  const rowsPerPage = Math.floor((PAGE_BOTTOM - CONTENT_START) / ROW_H); // ≈ 36
  const ganttPageCount  = Math.max(1, Math.ceil(visTasks.length / rowsPerPage));
  const TOTAL_PAGES     = ganttPageCount + 1; // +1 for summary

  const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAW BANNER (dark header bar across full width)
  // ─────────────────────────────────────────────────────────────────────────────
  function drawBanner(pg: number) {
    doc.setFillColor(26, 26, 26);
    doc.rect(M, M, FULL_W, BANNER_H, "F");

    // "GROUPE PICHÉ" in gold
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(201, 168, 76);
    doc.text("GROUPE PICHÉ", M + 2, M + 5.5);

    // project name in white, directly after
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    const gpWidth = doc.getTextWidth("GROUPE PICHÉ");
    doc.text(projectName, M + 2 + gpWidth + 4, M + 5.5);

    // date range centred
    const rangeLabel =
      `${parseIso(startDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}` +
      ` – ` +
      `${parseIso(endDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`;
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(rangeLabel, PW / 2, M + 5.5, { align: "center" });

    // right: export metadata
    doc.setFontSize(7.5);
    doc.text(`Exported: ${dateStr}  ·  Page ${pg} of ${TOTAL_PAGES}`, M + FULL_W - 2, M + 5.5, { align: "right" });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAW COLUMN HEADERS (second dark row)
  // ─────────────────────────────────────────────────────────────────────────────
  function drawColHeaders() {
    const y = M + BANNER_H; // y = 18

    doc.setFillColor(45, 45, 45);
    doc.rect(M, y, FULL_W, HDR_H, "F");

    const textY = y + 6.5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);

    doc.text("ID",       LEFT_X + 1,                                     textY);
    doc.text("Task Name", LEFT_X + C_ID + 1,                              textY);
    doc.text("Dur",      LEFT_X + C_ID + C_NAME + 1,                     textY);
    doc.text("Start",    LEFT_X + C_ID + C_NAME + C_DUR + 1,             textY);
    doc.text("Finish",   LEFT_X + C_ID + C_NAME + C_DUR + C_STA + 1,    textY);

    // vertical dividers between left columns
    doc.setDrawColor(80, 80, 80);
    const dividers = [
      LEFT_X + C_ID,
      LEFT_X + C_ID + C_NAME,
      LEFT_X + C_ID + C_NAME + C_DUR,
      LEFT_X + C_ID + C_NAME + C_DUR + C_STA,
    ];
    dividers.forEach(cx => doc.line(cx, y, cx, y + HDR_H));

    // right panel period labels
    const labelFontSize = Math.max(4, Math.min(6, colW * 0.45));
    doc.setFontSize(labelFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    periods.forEach((p, i) => {
      const px = RIGHT_X + i * colW;
      doc.setDrawColor(80, 80, 80);
      doc.line(px, y, px, y + HDR_H);
      doc.text(p.label, px + colW / 2, textY, { align: "center" });
    });

    // panel separator
    doc.setDrawColor(180, 180, 180);
    doc.line(RIGHT_X, y, RIGHT_X, y + HDR_H);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAW FOOTER
  // ─────────────────────────────────────────────────────────────────────────────
  function drawFooter(pg: number) {
    doc.setFillColor(245, 245, 245);
    doc.rect(M, FOOTER_Y, FULL_W, FOOTER_H, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated by Groupe Piché app  ·  ${dateStr}`, M + 2, FOOTER_Y + 4);
    doc.text(`Page ${pg} of ${TOTAL_PAGES}`, M + FULL_W - 2, FOOTER_Y + 4, { align: "right" });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAW ONE TASK ROW
  // ─────────────────────────────────────────────────────────────────────────────
  function drawTaskRow(t: MinimalTask, y: number, logBar = false) {
    const bg      = getRowBg(t);
    const parent  = isParent(t);
    const txtColor: [number, number, number] = parent ? [255, 255, 255] : [26, 26, 26];
    const mutedColor: [number, number, number] = parent ? [180, 180, 180] : [120, 120, 120];
    const bc      = getBarColor(t);
    const barH    = parent ? 2 : 4;

    // ── Full-width background (MUST be drawn first) ──
    doc.setFillColor(...bg);
    doc.rect(LEFT_X, y, FULL_W, ROW_H, "F");

    const baseline = y + 5;

    // ── Task ID ──
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    doc.text(t.id, LEFT_X + 1, baseline);

    // ── Task Name (with indent, no truncation at 7pt, shrink to 5.5pt before …) ──
    const indent   = getIndentMM(t);
    const nameX    = LEFT_X + C_ID + 1 + indent;
    const maxNameW = C_NAME - 2 - indent;

    doc.setFontSize(7);
    doc.setFont("helvetica", parent ? "bold" : "normal");
    doc.setTextColor(...txtColor);

    const w7 = doc.getTextWidth(t.name);
    if (w7 <= maxNameW) {
      doc.text(t.name, nameX, baseline);
    } else {
      doc.setFontSize(5.5);
      const w55 = doc.getTextWidth(t.name);
      if (w55 <= maxNameW) {
        doc.text(t.name, nameX, baseline);
      } else {
        // last resort: truncate at 5.5pt with ellipsis
        let tr = t.name;
        while (doc.getTextWidth(tr + "…") > maxNameW && tr.length > 1) {
          tr = tr.slice(0, -1);
        }
        doc.text(tr + "…", nameX, baseline);
      }
      doc.setFontSize(7);
    }

    // ── Duration ──
    const durX = LEFT_X + C_ID + C_NAME + 1;
    const days  = calDays(t.startDate, t.endDate);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...txtColor);
    doc.text(days >= 14 ? `${Math.round(days / 7)}w` : `${days}d`, durX, baseline);

    // ── Start ──
    const staX = LEFT_X + C_ID + C_NAME + C_DUR + 1;
    doc.setFontSize(5.8);
    doc.text(fmtMDY(t.startDate), staX, baseline);

    // ── Finish ──
    const finX = LEFT_X + C_ID + C_NAME + C_DUR + C_STA + 1;
    doc.text(fmtMDY(t.endDate), finX, baseline);

    // ── Right panel period grid lines ──
    doc.setDrawColor(220, 220, 220);
    periods.forEach((_p, i) => {
      const px = RIGHT_X + i * colW;
      doc.line(px, y, px, y + ROW_H);
    });

    // ── GANTT BAR ────────────────────────────────────────────────────────────
    const taskStartMs = parseIso(t.startDate).getTime();
    const taskEndMs   = parseIso(t.endDate).getTime();

    // Skip rows with zero overlap
    if (taskEndMs < rangeStartMs || taskStartMs > rangeEndMs) {
      doc.setDrawColor(220, 220, 220);
      doc.line(LEFT_X, y + ROW_H, LEFT_X + FULL_W, y + ROW_H);
      return;
    }

    // Raw bar positions (right panel x = 130..410)
    const barLeftRaw  = RIGHT_X + ((taskStartMs - rangeStartMs) / (totalRangeDays * 86_400_000)) * RIGHT_W;
    const barRightRaw = RIGHT_X + ((taskEndMs - rangeStartMs + 86_400_000) / (totalRangeDays * 86_400_000)) * RIGHT_W;

    const startsBefore = taskStartMs < rangeStartMs;
    const endsAfter    = taskEndMs   > rangeEndMs;

    // Clamped bar
    const clampedLeft  = Math.max(RIGHT_X, barLeftRaw);
    const clampedRight = Math.min(RIGHT_X + RIGHT_W, barRightRaw);
    const barW         = clampedRight - clampedLeft;

    if (logBar) {
      console.log(
        `[PDF bar debug] "${t.name}" ` +
        `barLeft=${barLeftRaw.toFixed(2)} barRight=${barRightRaw.toFixed(2)} ` +
        `clampedW=${barW.toFixed(2)}`
      );
    }

    if (barW > 0.2) {
      const barY = y + (ROW_H - barH) / 2;

      doc.setFillColor(...bc);
      doc.rect(clampedLeft, barY, barW, barH, "F");

      // Left arrow: task starts before range
      if (startsBefore) {
        const midY = barY + barH / 2;
        doc.setDrawColor(...bc);
        doc.line(RIGHT_X, barY, RIGHT_X - 3, midY);
        doc.line(RIGHT_X - 3, midY, RIGHT_X, barY + barH);
      }

      // Right arrow: task ends after range
      if (endsAfter) {
        const rEdge = RIGHT_X + RIGHT_W;
        const midY  = barY + barH / 2;
        doc.setDrawColor(...bc);
        doc.line(rEdge, barY, rEdge + 3, midY);
        doc.line(rEdge + 3, midY, rEdge, barY + barH);
      }
    }

    // ── Row divider ──
    doc.setDrawColor(220, 220, 220);
    doc.line(LEFT_X, y + ROW_H, LEFT_X + FULL_W, y + ROW_H);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER GANTT PAGES
  // ─────────────────────────────────────────────────────────────────────────────
  for (let pg = 0; pg < ganttPageCount; pg++) {
    if (pg > 0) doc.addPage();

    drawBanner(pg + 1);
    drawColHeaders();
    drawFooter(pg + 1);

    let rowY = CONTENT_START; // starts at y=27
    const slice = visTasks.slice(pg * rowsPerPage, (pg + 1) * rowsPerPage);

    slice.forEach((t, ri) => {
      drawTaskRow(t, rowY, pg === 0 && ri < 3); // log bar math for first 3 rows on page 1
      rowY += ROW_H;
    });

    // Today vertical dashed line (drawn AFTER all rows so it's on top)
    if (todayMs >= rangeStartMs && todayMs <= rangeEndMs) {
      const todayX = RIGHT_X + ((todayMs - rangeStartMs) / (totalRangeDays * 86_400_000)) * RIGHT_W;
      if (todayX >= RIGHT_X && todayX <= RIGHT_X + RIGHT_W) {
        doc.setDrawColor(150, 150, 150);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(todayX, CONTENT_START, todayX, rowY);
        doc.setLineDashPattern([], 0);
      }
    }

    // Panel separator line (full content height)
    doc.setDrawColor(180, 180, 180);
    doc.line(RIGHT_X, CONTENT_START, RIGHT_X, rowY);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY PAGE  (fully manual — no autoTable)
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage();
  let sumPage = ganttPageCount + 1;
  drawBanner(sumPage);
  drawFooter(sumPage);

  // Summary table columns (total = 400mm, x: 10 → 410)
  // [Task ID=20, Name=254, Start=28, End=28, Duration=22, Hours=20, Status=28] = 400
  const S_W = [20, 254, 28, 28, 22, 20, 28] as const;
  const S_X: number[] = [];
  let sxAcc = LEFT_X;
  S_W.forEach(w => { S_X.push(sxAcc); sxAcc += w; });
  const S_LABELS = ["Task ID", "Name", "Start", "End", "Duration", "Hours", "Status"];
  const S_ROW_H  = 7;
  const S_HDR_H  = 8;

  function drawSumTitle(y: number) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 25, 38);
    doc.text("Task Summary", LEFT_X, y);
  }

  function drawSumHeader(y: number) {
    doc.setFillColor(26, 26, 26);
    doc.rect(LEFT_X, y, FULL_W, S_HDR_H, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    S_LABELS.forEach((lbl, i) => doc.text(lbl, S_X[i] + 2, y + 5.5));
  }

  function drawSumRow(t: MinimalTask, y: number, alt: boolean) {
    // Row background
    doc.setFillColor(...(alt ? ([249, 249, 249] as [number,number,number]) : ([255, 255, 255] as [number,number,number])));
    doc.rect(LEFT_X, y, FULL_W, S_ROW_H, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(26, 26, 26);

    const days = calDays(t.startDate, t.endDate);

    // ID
    doc.text(t.id, S_X[0] + 2, y + 5);

    // Name (fit check)
    const nameMaxW = S_W[1] - 4;
    doc.setFontSize(7);
    let nameText = t.name;
    if (doc.getTextWidth(nameText) > nameMaxW) {
      doc.setFontSize(5.5);
      if (doc.getTextWidth(nameText) > nameMaxW) {
        while (doc.getTextWidth(nameText + "…") > nameMaxW && nameText.length > 1) {
          nameText = nameText.slice(0, -1);
        }
        nameText = nameText + "…";
      }
    }
    doc.text(nameText, S_X[1] + 2, y + 5);
    doc.setFontSize(7);

    // Start / End
    doc.text(fmtMDY(t.startDate), S_X[2] + 2, y + 5);
    doc.text(fmtMDY(t.endDate),   S_X[3] + 2, y + 5);

    // Duration
    doc.text(days >= 14 ? `${Math.round(days / 7)}w` : `${days}d`, S_X[4] + 2, y + 5);

    // Hours
    doc.text(
      t.totalLabourHours.toLocaleString("en-CA", { maximumFractionDigits: 0 }),
      S_X[5] + 2,
      y + 5
    );

    // Status badge
    const ok      = !t.labourHoursMissing;
    const badgeBg: [number,number,number] = ok ? [214, 236, 214] : [250, 218, 221];
    const badgeTx: [number,number,number] = ok ? [39, 80, 10]    : [121, 31, 31];
    const badgeLbl = ok ? "OK" : "Missing";
    doc.setFillColor(...badgeBg);
    doc.rect(S_X[6] + 2, y + 1.5, 20, 4, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...badgeTx);
    doc.text(badgeLbl, S_X[6] + 12, y + 4.7, { align: "center" });

    // Row divider
    doc.setDrawColor(220, 220, 220);
    doc.line(LEFT_X, y + S_ROW_H, LEFT_X + FULL_W, y + S_ROW_H);
  }

  let sumY = CONTENT_START;

  drawSumTitle(sumY);
  sumY += 8;

  drawSumHeader(sumY);
  sumY += S_HDR_H;

  let totalHrs = 0;

  visTasks.forEach((t, i) => {
    // Page overflow check
    if (sumY + S_ROW_H > PAGE_BOTTOM) {
      doc.addPage();
      sumPage++;
      drawBanner(sumPage);
      drawFooter(sumPage);
      sumY = CONTENT_START;
      drawSumHeader(sumY);
      sumY += S_HDR_H;
    }
    drawSumRow(t, sumY, i % 2 === 1);
    totalHrs += t.totalLabourHours;
    sumY += S_ROW_H;
  });

  // Totals row
  if (sumY + S_ROW_H > PAGE_BOTTOM) {
    doc.addPage();
    sumPage++;
    drawBanner(sumPage);
    drawFooter(sumPage);
    sumY = CONTENT_START;
  }
  doc.setFillColor(45, 45, 45);
  doc.rect(LEFT_X, sumY, FULL_W, S_ROW_H, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`${visTasks.length} tasks total`, S_X[0] + 2, sumY + 5);
  doc.text(
    totalHrs.toLocaleString("en-CA", { maximumFractionDigits: 0 }),
    S_X[5] + 2,
    sumY + 5
  );

  // ── Save ────────────────────────────────────────────────────────────────────
  const safe = projectName.replace(/[^a-zA-Z0-9\-_]/g, "-").replace(/-+/g, "-");
  doc.save(`${safe}-schedule-${startDate}-${endDate}.pdf`);
}
