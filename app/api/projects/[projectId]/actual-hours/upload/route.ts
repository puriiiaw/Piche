import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

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
  const hoursColParam = url.searchParams.get("hoursColumn");   // explicit column override
  const dateColParam  = url.searchParams.get("dateColumn");    // explicit column override

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

  // Read into buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse workbook
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

  // ── PREVIEW MODE: just return column names ────────────────────────────────
  if (preview) {
    // Auto-detect best guesses to pre-select in the UI
    const guessHours = columns.find(k => k.trim().toLowerCase() === "total hour")
      ?? columns.find(k => /hour|hrs|hours/i.test(k))
      ?? null;
    const guessDate  = columns.find(k => k.trim().toLowerCase().replace(/\s+/g, " ") === "weekending date")
      ?? columns.find(k => /week.?end|date/i.test(k))
      ?? null;

    return NextResponse.json({ columns, guessHours, guessDate });
  }

  // ── PROCESS MODE ──────────────────────────────────────────────────────────

  // Resolve hours column: explicit param > auto-detect > error
  let totalHourKey: string | undefined;
  if (hoursColParam) {
    totalHourKey = columns.find(k => k === hoursColParam);
    if (!totalHourKey) {
      return NextResponse.json({ error: `Column '${hoursColParam}' not found in the file.` }, { status: 400 });
    }
  } else {
    totalHourKey = columns.find(k => k.trim().toLowerCase() === "total hour");
    if (!totalHourKey) {
      // Return the columns so the UI can prompt the user
      const guessHours = columns.find(k => /hour|hrs|hours/i.test(k)) ?? null;
      const guessDate  = columns.find(k => /week.?end|date/i.test(k)) ?? null;
      return NextResponse.json(
        { needsColumnSelection: true, columns, guessHours, guessDate },
        { status: 422 }
      );
    }
  }

  // Resolve date column
  let weekEndingKey: string | undefined;
  if (dateColParam) {
    weekEndingKey = columns.find(k => k === dateColParam) ?? undefined;
  } else {
    weekEndingKey = columns.find(
      k => k.trim().toLowerCase().replace(/\s+/g, " ") === "weekending date"
    );
  }

  // Sum Total Hour column and find latest WeekEnding Date
  let totalHours = 0;
  let rowCount = 0;
  let latestDateStr: string | null = null;

  for (const row of rows) {
    const rawVal = row[totalHourKey];
    const num = typeof rawVal === "number"
      ? rawVal
      : typeof rawVal === "string" ? parseFloat(rawVal) : NaN;
    if (!isNaN(num) && num > 0) {
      totalHours += num;
      rowCount++;
    }

    if (weekEndingKey) {
      const dateVal = row[weekEndingKey];
      if (dateVal) {
        const s = String(dateVal);
        if (!latestDateStr || s > latestDateStr) latestDateStr = s;
      }
    }
  }

  // Derive month from latest WeekEnding Date
  let month: string;
  if (latestDateStr) {
    const isoMatch = latestDateStr.match(/^(\d{4})-(\d{2})-\d{2}/);
    if (isoMatch) {
      month = `${isoMatch[1]}-${isoMatch[2]}`;
    } else {
      const parsed = new Date(latestDateStr);
      if (!isNaN(parsed.getTime())) {
        month = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      } else {
        return NextResponse.json(
          { error: "Could not parse a date from the selected date column." },
          { status: 400 }
        );
      }
    }
  } else {
    return NextResponse.json(
      { error: "No date column selected or it is empty — cannot determine the month." },
      { status: 400 }
    );
  }

  const db = getDb();

  // Check for existing record
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

  // Upsert record
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
