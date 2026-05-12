import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

/** Normalise a column header: strip all whitespace/newlines, lowercase */
function normKey(k: string) {
  return k.replace(/[\s\r\n]+/g, "").toLowerCase();
}

/**
 * Try to parse a date string in any of these formats and return YYYY-MM.
 * Returns null if parsing fails.
 */
function parseMonth(raw: string): string | null {
  const s = raw.trim();

  // ISO: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  // DD/MM/YYYY or D/M/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime()))
      return `${y}-${String(Number(m)).padStart(2, "0")}`;
  }

  // MM/DD/YYYY (US)
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    // Try as MM/DD/YYYY — only use if DD > 12 (unambiguous)
    const [, m, d, y] = mdy;
    if (Number(d) > 12) {
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (!isNaN(date.getTime()))
        return `${y}-${String(Number(m)).padStart(2, "0")}`;
    }
  }

  // DD-MM-YYYY or MM-DD-YYYY (with dashes)
  const dashDmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashDmy) {
    const [, a, b, y] = dashDmy;
    // Treat as DD-MM-YYYY
    const date = new Date(Number(y), Number(b) - 1, Number(a));
    if (!isNaN(date.getTime()))
      return `${y}-${String(Number(b)).padStart(2, "0")}`;
  }

  // Fallback: let JS parse it (handles "May 2 2026", "2026-05-02T00:00:00", etc.)
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
  }

  return null;
}

/** Pick the latest month string from an array (lexicographic on YYYY-MM is correct) */
function latestMonth(months: string[]): string | null {
  return months.reduce<string | null>((best, m) => (best === null || m > best ? m : best), null);
}

/** Auto-detect the hours column from a list of column names */
function detectHoursCol(columns: string[]): string | null {
  // Exact normalised matches first
  return (
    columns.find(k => normKey(k) === "totalhour") ??
    columns.find(k => normKey(k) === "totalhours") ??
    columns.find(k => /total.{0,4}hour/i.test(k)) ??
    columns.find(k => /hour|hrs/i.test(k)) ??
    null
  );
}

/** Auto-detect the week-ending date column */
function detectDateCol(columns: string[]): string | null {
  return (
    columns.find(k => normKey(k) === "weekendingdate") ??
    columns.find(k => /week.{0,5}end/i.test(k.replace(/[\r\n]+/g, " "))) ??
    columns.find(k => /date/i.test(k)) ??
    null
  );
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; name?: string | null; role?: string };

  // PM must have this project assigned
  if (user.role === "PM") {
    const db = getDb();
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { assignedProjectIds: true }
    });
    if (!dbUser?.assignedProjectIds.includes(params.projectId)) {
      return NextResponse.json({ error: "You don't have access to this project." }, { status: 403 });
    }
  }

  const url = new URL(request.url);
  const replace       = url.searchParams.get("replace") === "true";
  const preview       = url.searchParams.get("preview") === "true";
  const hoursColParam = url.searchParams.get("hoursColumn");
  const dateColParam  = url.searchParams.get("dateColumn");

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    return NextResponse.json({ error: "Could not parse the Excel file. Make sure it is a valid .xlsx or .xls file." }, { status: 400 });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return NextResponse.json({ error: "The workbook contains no sheets." }, { status: 400 });

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });

  if (rows.length === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  const columns = Object.keys(rows[0]);

  // ── PREVIEW MODE ─────────────────────────────────────────────────────────
  if (preview) {
    return NextResponse.json({
      columns,
      guessHours: detectHoursCol(columns),
      guessDate:  detectDateCol(columns),
    });
  }

  // ── PROCESS MODE ─────────────────────────────────────────────────────────

  // Resolve hours column
  let totalHourKey: string | undefined;
  if (hoursColParam) {
    totalHourKey = columns.find(k => k === hoursColParam);
    if (!totalHourKey)
      return NextResponse.json({ error: `Column '${hoursColParam}' not found in the file.` }, { status: 400 });
  } else {
    const auto = detectHoursCol(columns);
    if (!auto) {
      // Ask user to pick
      return NextResponse.json(
        { needsColumnSelection: true, columns, guessHours: null, guessDate: detectDateCol(columns) },
        { status: 422 }
      );
    }
    totalHourKey = auto;
  }

  // Resolve date column
  let weekEndingKey: string | undefined;
  if (dateColParam) {
    weekEndingKey = columns.find(k => k === dateColParam) ?? undefined;
  } else {
    weekEndingKey = detectDateCol(columns) ?? undefined;
  }

  // Sum hours and collect parsed months
  let totalHours = 0;
  let rowCount   = 0;
  const parsedMonths: string[] = [];

  for (const row of rows) {
    // Hours
    const rawVal = row[totalHourKey];
    const num = typeof rawVal === "number"
      ? rawVal
      : typeof rawVal === "string" ? parseFloat(rawVal.replace(/,/g, "")) : NaN;
    if (!isNaN(num) && num > 0) {
      totalHours += num;
      rowCount++;
    }

    // Date
    if (weekEndingKey) {
      const dateVal = row[weekEndingKey];
      if (dateVal) {
        const m = parseMonth(String(dateVal));
        if (m) parsedMonths.push(m);
      }
    }
  }

  // Determine month from the latest date found
  let month: string | null = null;

  if (parsedMonths.length > 0) {
    month = latestMonth(parsedMonths);
  }

  if (!month) {
    if (!weekEndingKey) {
      return NextResponse.json(
        { needsColumnSelection: true, columns, guessHours: totalHourKey, guessDate: null,
          error: "Could not find a date column — please select one." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Could not parse any dates from the selected date column. Please make sure it contains dates (e.g. 25/04/2026 or 2026-04-25)." },
      { status: 400 }
    );
  }

  const db = getDb();

  const existing = await db.actualHours.findUnique({
    where: { projectId_month: { projectId: params.projectId, month } }
  });

  if (existing && !replace) {
    return NextResponse.json(
      {
        conflict: true,
        month,
        existingHours: existing.totalHours,
        newHours: totalHours,
        message: `A timesheet for ${month} already exists (${existing.totalHours.toLocaleString()} hrs).`
      },
      { status: 409 }
    );
  }

  try {
    const record = await db.actualHours.upsert({
      where: { projectId_month: { projectId: params.projectId, month } },
      update: {
        totalHours,
        uploadedBy: user.name || user.id || "Unknown",
        uploadedAt: new Date(),
        originalFilename: file.name,
        rowCount
      },
      create: {
        projectId: params.projectId,
        month,
        totalHours,
        uploadedBy: user.name || user.id || "Unknown",
        originalFilename: file.name,
        rowCount
      }
    });

    return NextResponse.json({ ok: true, month, totalHours, rowCount, id: record.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
