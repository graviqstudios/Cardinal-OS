import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Cross-domain "we noticed" patterns - the thing only a system that sees your
 * whole life can surface. Deterministic and conservative: a pattern is only
 * returned when there's enough overlapping data and a clear difference, so we
 * never invent noise. Calm, observational tone (never "you failed").
 */

const WINDOW_DAYS = 21;
const MIN_PER_SIDE = 4; // days needed on each side of a split
const REL_DIFF = 0.3; // 30% relative difference to count as a pattern

type DaySignals = {
  habits: number;
  sleep: number | null;
  tasksDone: number;
  spend: number;
  focus: number;
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Average of `pick` across two groups split by `cond`; null if too thin. */
function compare(
  days: DaySignals[],
  cond: (d: DaySignals) => boolean,
  pick: (d: DaySignals) => number,
): { hiAvg: number; loAvg: number } | null {
  const hi = days.filter(cond);
  const lo = days.filter((d) => !cond(d));
  if (hi.length < MIN_PER_SIDE || lo.length < MIN_PER_SIDE) return null;
  const avg = (arr: DaySignals[]) => arr.reduce((s, d) => s + pick(d), 0) / arr.length;
  return { hiAvg: avg(hi), loAvg: avg(lo) };
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function getInsights(): Promise<string[]> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return [];

  const sinceDate = dayKey(new Date(Date.now() - WINDOW_DAYS * 86_400_000));
  const sinceISO = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

  const [habitLogs, metrics, tasks, txns, focus] = await Promise.all([
    supabase.from("habit_logs").select("logged_date, completed").eq("user_id", user.id).gte("logged_date", sinceDate),
    supabase.from("body_metrics").select("date, sleep_hours").eq("user_id", user.id).gte("date", sinceDate),
    supabase.from("tasks").select("completed_at").eq("user_id", user.id).eq("status", "done").gte("completed_at", sinceISO),
    supabase.from("transactions").select("amount, occurred_at").eq("user_id", user.id).eq("direction", "expense").gte("occurred_at", sinceISO),
    supabase.from("focus_sessions").select("duration_minutes, created_at, completed").eq("user_id", user.id).gte("created_at", sinceISO),
  ]);

  const map = new Map<string, DaySignals>();
  const get = (k: string) =>
    map.get(k) ?? { habits: 0, sleep: null, tasksDone: 0, spend: 0, focus: 0 };

  for (const r of habitLogs.data ?? []) {
    if (!r.completed) continue;
    const k = r.logged_date as string;
    const d = get(k); d.habits += 1; map.set(k, d);
  }
  for (const r of metrics.data ?? []) {
    const k = r.date as string;
    const d = get(k); d.sleep = r.sleep_hours as number | null; map.set(k, d);
  }
  for (const r of tasks.data ?? []) {
    const k = dayKey(new Date(r.completed_at as string));
    const d = get(k); d.tasksDone += 1; map.set(k, d);
  }
  for (const r of txns.data ?? []) {
    const k = dayKey(new Date(r.occurred_at as string));
    const d = get(k); d.spend += Number(r.amount) || 0; map.set(k, d);
  }
  for (const r of focus.data ?? []) {
    if (!r.completed) continue;
    const k = dayKey(new Date(r.created_at as string));
    const d = get(k); d.focus += Number(r.duration_minutes) || 0; map.set(k, d);
  }

  const days = [...map.values()];
  const out: string[] = [];

  // Sleep ↔ getting things done.
  const sleepDays = days.filter((d) => d.sleep != null);
  const a = compare(sleepDays, (d) => (d.sleep as number) >= 7, (d) => d.tasksDone);
  if (a && a.hiAvg >= a.loAvg * (1 + REL_DIFF) && a.hiAvg - a.loAvg >= 0.5) {
    out.push("You tend to get more done on days you sleep well.");
  }

  // Sleep ↔ focus.
  const f = compare(sleepDays, (d) => (d.sleep as number) >= 7, (d) => d.focus);
  if (f && f.hiAvg >= f.loAvg * (1 + REL_DIFF) && f.hiAvg - f.loAvg >= 10) {
    out.push("Your focus runs deeper after a good night's sleep.");
  }

  // Spending ↔ habit consistency.
  const spendDays = days.filter((d) => d.spend > 0);
  if (spendDays.length >= MIN_PER_SIDE * 2) {
    const mid = median(spendDays.map((d) => d.spend));
    const h = compare(spendDays, (d) => d.spend > mid, (d) => d.habits);
    if (h && h.loAvg >= h.hiAvg * (1 + REL_DIFF) && h.loAvg - h.hiAvg >= 0.5) {
      out.push("Your habits hold up better on lower-spend days.");
    }
  }

  return out.slice(0, 3);
}
