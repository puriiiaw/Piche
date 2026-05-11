"use client";

import type { Project } from "@/lib/types";

type DashboardExportData = {
  chartData: Record<string, string | number>[];
  analysis: {
    peakExact: number;
    overCapacityPeriods: number;
    riskLevel: string;
    peaks: { label: string; crew: number; rounded: number; contributors: { id: string; name: string; value: number }[] }[];
  };
  totalHours: number;
  thisWeekPeak: number;
  projectMix: { id: string; name: string; totalHours: number }[];
};

const GOLD: [number, number, number] = [199, 177, 87];
const NAVY: [number, number, number] = [15, 25, 38];
const MUTED: [number, number, number] = [100, 116, 139];
const CHART_COLORS = ["#c7b157", "#1f6f78", "#345995", "#d97706", "#667085", "#0f766e", "#7c3aed"];

function fmtN(value: number, decimals = 0): string {
  return value.toLocaleString("en-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function drawTableHeader(doc: any, headers: string[], colWidths: number[], x: number, y: number) {
  let cx = x;
  headers.forEach((header, i) => {
    doc.setFillColor(...GOLD);
    doc.setDrawColor(180, 160, 60);
    doc.setLineWidth(0.2);
    doc.rect(cx, y, colWidths[i], 7, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(header.toUpperCase(), cx + 2, y + 4.8);
    cx += colWidths[i];
  });
}

function drawTableRow(doc: any, cells: string[], colWidths: number[], x: number, y: number, alternate: boolean) {
  let cx = x;
  cells.forEach((cell, i) => {
    doc.setFillColor(alternate ? 248 : 255, alternate ? 249 : 255, alternate ? 250 : 255);
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.2);
    doc.rect(cx, y, colWidths[i], 7, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const maxW = colWidths[i] - 4;
    doc.text(String(cell), cx + 2, y + 4.8, { maxWidth: maxW });
    cx += colWidths[i];
  });
}

function drawLineChart(doc: any, chartData: Record<string, string | number>[], projectNames: string[], capacity: number, x: number, y: number, w: number, h: number) {
  // White chart area with border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, "FD");

  if (!chartData.length) return;

  const keysToPlot = projectNames.length > 1 ? [...projectNames, "Total Demand"] : projectNames;

  // Find y max across all data series + capacity
  let yMax = 1;
  chartData.forEach((row) => {
    keysToPlot.forEach((k) => {
      const v = Number(row[k] || 0);
      if (v > yMax) yMax = v;
    });
  });
  if (capacity > 0 && capacity > yMax) yMax = capacity;
  yMax *= 1.1;

  // Horizontal grid lines + y-axis labels
  const STEPS = 5;
  for (let i = 0; i <= STEPS; i++) {
    const val = (i / STEPS) * yMax;
    const yp = y + h - (i / STEPS) * h;
    doc.setDrawColor(235, 237, 240);
    doc.setLineWidth(0.1);
    doc.line(x, yp, x + w, yp);
    doc.setFontSize(5.5);
    doc.setTextColor(...MUTED);
    doc.text(Math.round(val).toString(), x - 1.5, yp + 1, { align: "right" });
  }

  // X-axis period labels (sampled)
  const labelStep = Math.max(1, Math.floor(chartData.length / 14));
  chartData.forEach((row, i) => {
    if (i % labelStep === 0 || i === chartData.length - 1) {
      const xp = chartData.length <= 1 ? x : x + (i / (chartData.length - 1)) * w;
      doc.setFontSize(5);
      doc.setTextColor(...MUTED);
      doc.text(String(row.period || ""), xp, y + h + 3.5, { align: "center" });
    }
  });

  // Capacity reference line (red dashed)
  if (capacity > 0 && yMax > 0) {
    const capY = y + h - (capacity / yMax) * h;
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([1.5, 1], 0);
    doc.line(x, capY, x + w, capY);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(5.5);
    doc.setTextColor(220, 38, 38);
    doc.text(`Cap: ${capacity}`, x + w + 1, capY + 1.5);
  }

  // Draw each data series
  if (chartData.length > 1) {
    keysToPlot.forEach((key, idx) => {
      const isTotal = projectNames.length > 1 && key === "Total Demand";
      const hex = isTotal ? "#0f172a" : CHART_COLORS[idx % CHART_COLORS.length];
      const rgb = hexToRgb(hex);
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(isTotal ? 0.75 : 0.45);
      if (isTotal) doc.setLineDashPattern([2, 1], 0);

      for (let i = 0; i < chartData.length - 1; i++) {
        const n = chartData.length - 1;
        const x1 = x + (i / n) * w;
        const y1 = y + h - (Number(chartData[i][key] || 0) / yMax) * h;
        const x2 = x + ((i + 1) / n) * w;
        const y2 = y + h - (Number(chartData[i + 1][key] || 0) / yMax) * h;
        doc.line(x1, Math.max(y, Math.min(y + h, y1)), x2, Math.max(y, Math.min(y + h, y2)));
      }
      if (isTotal) doc.setLineDashPattern([], 0);
    });
  }

  // Legend
  const LY = y + h + 8;
  let LX = x;
  keysToPlot.forEach((key, idx) => {
    if (LX + 38 > x + w) return;
    const isTotal = projectNames.length > 1 && key === "Total Demand";
    const hex = isTotal ? "#0f172a" : CHART_COLORS[idx % CHART_COLORS.length];
    const rgb = hexToRgb(hex);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(LX, LY - 1.5, 6, 2.5, "F");
    doc.setFontSize(5.5);
    doc.setTextColor(50, 50, 50);
    const label = key.length > 20 ? key.slice(0, 18) + "…" : key;
    doc.text(label, LX + 7, LY + 0.5);
    LX += 42;
  });
}

export async function exportDashboardPDF(
  data: DashboardExportData,
  selectedProjects: Project[],
  capacity: number
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const PW = doc.internal.pageSize.getWidth();   // 297
  const PH = doc.internal.pageSize.getHeight();  // 210
  const M = 12;
  const CW = PW - 2 * M; // content width = 273
  const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  let y = M;

  // Utility: ensure there's enough space, else add a new page
  const ensureSpace = (needed: number) => {
    if (y + needed > PH - 14) {
      doc.addPage();
      y = M;
    }
  };

  // ── HEADER ──────────────────────────────────────────────────────────────
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, PW, 11, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("GROUPE PICHÉ", M, 7.5);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Workforce Dashboard", M + 52, 7.5);

  doc.setFontSize(8);
  doc.text(`Exported: ${dateStr}`, PW - M, 7.5, { align: "right" });

  y = 15;

  // ── KPI STRIP ──────────────────────────────────────────────────────────
  const kpis = [
    { title: "Active Projects", value: String(selectedProjects.filter((p) => p.status !== "Planning").length) },
    { title: "Total Labour Hours", value: fmtN(data.totalHours) },
    { title: "Peak Crew Needed", value: `${fmtN(data.analysis.peakExact, 2)} / ${Math.ceil(data.analysis.peakExact)}` },
    { title: "Crew This Week", value: `${fmtN(data.thisWeekPeak, 2)} / ${Math.ceil(data.thisWeekPeak)}` },
    { title: "Over-Capacity", value: String(data.analysis.overCapacityPeriods) },
    { title: "Max Required Crew", value: String(Math.ceil(data.analysis.peakExact)) },
    { title: "Risk Level", value: data.analysis.riskLevel ?? "—" }
  ];

  const KPI_W = CW / kpis.length;
  const KPI_H = 24;

  kpis.forEach((kpi, i) => {
    const kx = M + i * KPI_W;
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.2);
    doc.rect(kx, y, KPI_W - 0.5, KPI_H, "FD");
    // Gold label
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GOLD);
    doc.text(kpi.title.toUpperCase(), kx + 3, y + 6);
    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(kpi.value, kx + 3, y + 18);
  });

  y += KPI_H + 5;

  // ── CHART ──────────────────────────────────────────────────────────────
  const CHART_H = 65;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Company Crew Demand", M, y);
  y += 4;

  drawLineChart(doc, data.chartData, selectedProjects.map((p) => p.name), capacity, M, y, CW - 6, CHART_H);

  y += CHART_H + 14; // +14 for x-axis labels + legend

  // ── PEAK WATCH TABLE ──────────────────────────────────────────────────
  ensureSpace(35);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Peak Watch", M, y);
  y += 4;

  const peakCols = [40, 30, 30, CW - 100];
  drawTableHeader(doc, ["Period", "Exact Crew", "Rounded", "Contributors"], peakCols, M, y);
  y += 7;

  (data.analysis.peaks || []).forEach((peak, i) => {
    ensureSpace(8);
    drawTableRow(
      doc,
      [
        peak.label,
        fmtN(peak.crew, 2),
        String(peak.rounded),
        peak.contributors.slice(0, 4).map((c) => `${c.name} (${fmtN(c.value, 1)})`).join(", ")
      ],
      peakCols,
      M,
      y,
      i % 2 === 0
    );
    y += 7;
  });

  y += 6;

  // ── PROJECT MIX ────────────────────────────────────────────────────────
  ensureSpace(25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Project Mix", M, y);
  y += 4;

  const mixCols = [CW * 0.65, CW * 0.35];
  drawTableHeader(doc, ["Project", "Total Labour Hours"], mixCols, M, y);
  y += 7;

  selectedProjects.forEach((project, i) => {
    ensureSpace(8);
    const mix = data.projectMix.find((m) => m.id === project.id);
    drawTableRow(doc, [project.name, mix ? `${fmtN(mix.totalHours)} hrs` : "—"], mixCols, M, y, i % 2 === 0);
    y += 7;
  });

  // ── FOOTER (all pages) ────────────────────────────────────────────────
  const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(248, 249, 250);
    doc.rect(0, PH - 9, PW, 9, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Generated by Groupe Piché app  ·  ${dateStr}  ·  Page ${p} of ${totalPages}`,
      PW / 2,
      PH - 3,
      { align: "center" }
    );
  }

  const filename = `dashboard-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
