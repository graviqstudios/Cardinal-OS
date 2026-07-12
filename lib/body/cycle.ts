import type { PeriodLog } from "@/lib/body/types";

/**
 * Client-safe menstrual-cycle predictions (Flo-style). Derives cycle/period
 * length from logged period days and projects the recurring phases forward:
 * menstrual → follicular → fertile window (with ovulation) → luteal. Purely
 * informational — never medical advice.
 */

export type CyclePhase = "menstrual" | "follicular" | "fertile" | "ovulation" | "luteal";

export type DayType =
  | "period" // logged period day
  | "predicted-period"
  | "fertile"
  | "ovulation"
  | "none";

export type CycleParams = {
  lastStart: string | null; // ISO date of the most recent period's first day
  cycleLength: number; // days between period starts
  periodLength: number; // days a period lasts
  predicted: boolean; // false until we have enough data (defaults used)
};

const DAY = 86_400_000;

export function isoKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

/** Group logged days into period "runs" and derive cycle + period length. */
export function deriveCycleParams(logs: PeriodLog[]): CycleParams {
  const days = logs
    .filter((l) => l.flow) // only actual period days define a run
    .map((l) => l.date)
    .sort();

  const runs: { start: string; length: number }[] = [];
  let prevMs: number | null = null;
  for (const d of days) {
    const ms = toDate(d).getTime();
    if (prevMs == null || (ms - prevMs) / DAY > 2) {
      runs.push({ start: d, length: 1 });
    } else {
      runs[runs.length - 1].length += 1;
    }
    prevMs = ms;
  }

  const lastStart = runs.length ? runs[runs.length - 1].start : null;

  // Average gap between consecutive starts (sane cycles only).
  const gaps: number[] = [];
  for (let i = 1; i < runs.length; i++) {
    const g = Math.round((toDate(runs[i].start).getTime() - toDate(runs[i - 1].start).getTime()) / DAY);
    if (g >= 18 && g <= 45) gaps.push(g);
  }
  const cycleLength = gaps.length
    ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
    : 28;

  const lengths = runs.map((r) => r.length).filter((l) => l >= 1 && l <= 10);
  const periodLength = lengths.length
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : 5;

  return { lastStart, cycleLength, periodLength, predicted: gaps.length >= 1 };
}

/**
 * 1-based day within the projected cycle a date falls in (relative to the last
 * period start), or null if there's no anchor or the date is before it.
 */
export function cycleDay(dateIso: string, p: CycleParams): number | null {
  if (!p.lastStart) return null;
  const diff = Math.floor((toDate(dateIso).getTime() - toDate(p.lastStart).getTime()) / DAY);
  if (diff < 0) return null;
  return (diff % p.cycleLength) + 1;
}

function ovulationDay(p: CycleParams) {
  // Ovulation ~14 days before the next period.
  return Math.max(1, p.cycleLength - 14);
}

/** Predicted classification for a date (independent of logged data). */
export function dayType(dateIso: string, p: CycleParams): DayType {
  const day = cycleDay(dateIso, p);
  if (day == null) return "none";
  const ov = ovulationDay(p);
  if (day <= p.periodLength) return "predicted-period";
  if (day === ov) return "ovulation";
  if (day >= ov - 5 && day <= ov) return "fertile";
  return "none";
}

export function phaseFor(dateIso: string, p: CycleParams): CyclePhase | null {
  const day = cycleDay(dateIso, p);
  if (day == null) return null;
  const ov = ovulationDay(p);
  if (day <= p.periodLength) return "menstrual";
  if (day === ov) return "ovulation";
  if (day >= ov - 5 && day <= ov) return "fertile";
  if (day < ov - 5) return "follicular";
  return "luteal";
}

export const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: "Menstrual phase",
  follicular: "Follicular phase",
  fertile: "Fertile window",
  ovulation: "Ovulation",
  luteal: "Luteal phase",
};

export const PHASE_BLURB: Record<CyclePhase, string> = {
  menstrual: "Your period. Rest and be gentle with yourself.",
  follicular: "Energy and mood often lift through this phase.",
  fertile: "Higher chance of conception this week.",
  ovulation: "Your most fertile day, around now.",
  luteal: "Energy may dip a little before your period.",
};

export type CycleStatus = {
  cycleDay: number;
  phase: CyclePhase;
  nextPeriod: string; // ISO
  daysUntilNext: number;
  ovulation: string | null; // ISO of the upcoming/most-recent ovulation in this cycle
  fertileStart: string | null;
  fertileEnd: string | null;
};

/** Current-cycle status for the summary header, or null without an anchor. */
export function cycleStatus(todayIso: string, p: CycleParams): CycleStatus | null {
  const day = cycleDay(todayIso, p);
  if (day == null || !p.lastStart) return null;

  // Start of the cycle today falls in.
  const diff = Math.floor((toDate(todayIso).getTime() - toDate(p.lastStart).getTime()) / DAY);
  const cyclesElapsed = Math.floor(diff / p.cycleLength);
  const cycleStart = toDate(p.lastStart);
  cycleStart.setDate(cycleStart.getDate() + cyclesElapsed * p.cycleLength);

  const nextPeriod = new Date(cycleStart);
  nextPeriod.setDate(nextPeriod.getDate() + p.cycleLength);
  const daysUntilNext = Math.round((nextPeriod.getTime() - toDate(todayIso).getTime()) / DAY);

  const ov = ovulationDay(p);
  const ovDate = new Date(cycleStart);
  ovDate.setDate(ovDate.getDate() + (ov - 1));
  const fStart = new Date(ovDate);
  fStart.setDate(fStart.getDate() - 5);

  return {
    cycleDay: day,
    phase: phaseFor(todayIso, p) ?? "follicular",
    nextPeriod: isoKey(nextPeriod),
    daysUntilNext,
    ovulation: isoKey(ovDate),
    fertileStart: isoKey(fStart),
    fertileEnd: isoKey(ovDate),
  };
}
