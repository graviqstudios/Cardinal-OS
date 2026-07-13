import type { CalendarView } from "@/lib/calendar/types";

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Week starts on Sunday. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -x.getDay());
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Local calendar date as YYYY-MM-DD (not UTC - avoids off-by-one in +tz). */
export function isoDate(d: Date): string {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string as local midnight. */
export function parseLocalDate(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

/** The 42-cell grid (6 weeks) covering a month. */
export function monthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** [startISO, endISO) covering everything a given view renders. */
export function rangeForView(view: CalendarView, anchor: Date): [string, string] {
  if (view === "day") {
    const s = startOfDay(anchor);
    return [s.toISOString(), addDays(s, 1).toISOString()];
  }
  if (view === "week") {
    const s = startOfWeek(anchor);
    return [s.toISOString(), addDays(s, 7).toISOString()];
  }
  const grid = monthGrid(anchor);
  return [grid[0].toISOString(), addDays(grid[41], 1).toISOString()];
}

export function viewTitle(view: CalendarView, anchor: Date): string {
  if (view === "day")
    return anchor.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  if (view === "week") {
    const days = weekDays(anchor);
    const a = days[0];
    const b = days[6];
    const sameMonth = a.getMonth() === b.getMonth();
    return `${a.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${b.toLocaleDateString(
      undefined,
      sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" },
    )}`;
  }
  return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function shiftAnchor(view: CalendarView, anchor: Date, dir: 1 | -1): Date {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addDays(anchor, 7 * dir);
  const x = new Date(anchor);
  x.setMonth(x.getMonth() + dir);
  return x;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
