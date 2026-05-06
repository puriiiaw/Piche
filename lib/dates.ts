import type { Granularity } from "@/lib/types";

const dayMs = 24 * 60 * 60 * 1000;

export function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function today(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return iso(date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function dateRange(startDate: string, endDate: string): Date[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dates: Date[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += dayMs) {
    dates.push(new Date(time));
  }
  return dates.length ? dates : [start];
}

export function workingDays(startDate: string, endDate: string): Date[] {
  const days = dateRange(startDate, endDate).filter((date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  });
  return days.length ? days : dateRange(startDate, endDate);
}

export function bucketKey(date: Date, granularity: Granularity): string {
  const year = date.getFullYear();
  if (granularity === "day") return iso(date);
  if (granularity === "month") return `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay() + 1);
  return iso(weekStart);
}

export function bucketLabel(date: Date, granularity: Granularity): string {
  if (granularity === "day") return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  if (granularity === "month") return date.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay() + 1);
  return `Wk ${weekStart.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
}

export function formatDate(value: string): string {
  if (!value) return "-";
  return parseDate(value).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export function minDate(values: string[]): string {
  return values.filter(Boolean).sort()[0] ?? today();
}

export function maxDate(values: string[]): string {
  const clean = values.filter(Boolean).sort();
  return clean[clean.length - 1] ?? today();
}
