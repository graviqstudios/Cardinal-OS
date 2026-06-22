import { createClient } from "@/lib/supabase/server";
import type {
  BodyMetric,
  BodyOverview,
  CycleSummary,
  NutritionLog,
  PeriodLog,
  WorkoutLog,
} from "@/lib/body/types";

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Everything the Health page needs in one round trip. */
export async function getBodyOverview(): Promise<BodyOverview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = dateKey(new Date());
  const since14 = dateKey(new Date(Date.now() - 13 * 86_400_000));
  const since90 = dateKey(new Date(Date.now() - 89 * 86_400_000));
  const since7ISO = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const since7Date = dateKey(new Date(Date.now() - 6 * 86_400_000));

  const [
    { data: profile },
    { data: metrics },
    { data: workouts },
    { data: focus },
    { data: nutrition },
  ] = await Promise.all([
    supabase.from("users").select("sex").eq("id", user.id).maybeSingle(),
    supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", since14)
      .order("date", { ascending: true }),
    supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("focus_sessions")
      .select("duration_minutes, created_at, completed")
      .eq("user_id", user.id)
      .gte("created_at", since7ISO),
    supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: true }),
  ]);

  const cycleEnabled = profile?.sex === "female";

  // Cycle history is only fetched (and computed) when the user tracks it.
  const { data: periods } = cycleEnabled
    ? await supabase
        .from("period_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", since90)
        .order("date", { ascending: true })
    : { data: null };

  const series = (metrics ?? []) as BodyMetric[];
  const todayMetric = series.find((m) => m.date === today) ?? null;
  const workoutList = (workouts ?? []) as WorkoutLog[];
  const periodLogs = (periods ?? []) as PeriodLog[];

  const focusMinutesWeek = (focus ?? [])
    .filter((f) => f.completed)
    .reduce((s, f) => s + (f.duration_minutes ?? 0), 0);

  // Active days this week = days with a workout or a focus session.
  const activeDays = new Set<string>();
  for (const w of workoutList) if (w.date >= since7Date) activeDays.add(w.date);
  for (const f of focus ?? []) activeDays.add(dateKey(new Date(f.created_at)));

  return {
    today: todayMetric,
    series,
    workouts: workoutList,
    nutritionToday: (nutrition ?? []) as NutritionLog[],
    focusMinutesWeek,
    workoutDaysWeek: activeDays.size,
    recovery: recoveryNudge(workoutList, focus ?? [], todayMetric),
    cycleEnabled,
    cycle: cycleEnabled ? summariseCycle(periodLogs, today) : null,
    periodLogs,
  };
}

/**
 * Turn logged period days into a calm summary: the most recent period's first
 * day, the average gap between period starts, and a gentle next-period estimate.
 * Informational only, never alarming, and explicitly not medical advice.
 */
function summariseCycle(logs: PeriodLog[], today: string): CycleSummary {
  const days = logs.map((l) => l.date).sort();
  // Group consecutive (or near-consecutive) days into period "runs"; the start
  // of each run is its first day.
  const starts: string[] = [];
  let prev: number | null = null;
  for (const d of days) {
    const t = new Date(`${d}T00:00:00`).getTime();
    if (prev == null || (t - prev) / 86_400_000 > 2) starts.push(d);
    prev = t;
  }

  const lastStart = starts.length ? starts[starts.length - 1] : null;
  const activeToday = days.includes(today);

  // Average cycle length from the gaps between consecutive starts.
  let avgCycleLength: number | null = null;
  if (starts.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < starts.length; i++) {
      const a = new Date(`${starts[i - 1]}T00:00:00`).getTime();
      const b = new Date(`${starts[i]}T00:00:00`).getTime();
      gaps.push(Math.round((b - a) / 86_400_000));
    }
    const sane = gaps.filter((g) => g >= 18 && g <= 45);
    if (sane.length) avgCycleLength = Math.round(sane.reduce((s, g) => s + g, 0) / sane.length);
  }

  let nextEstimate: string | null = null;
  let daysUntilNext: number | null = null;
  if (lastStart) {
    const cycle = avgCycleLength ?? 28;
    const next = new Date(`${lastStart}T00:00:00`);
    next.setDate(next.getDate() + cycle);
    nextEstimate = dateKey(next);
    const todayMs = new Date(`${today}T00:00:00`).getTime();
    daysUntilNext = Math.round((next.getTime() - todayMs) / 86_400_000);
  }

  return { lastStart, activeToday, avgCycleLength, nextEstimate, daysUntilNext };
}

/** A calm, never-alarming suggestion from recent activity. */
function recoveryNudge(
  workouts: WorkoutLog[],
  focus: { created_at: string }[],
  today: BodyMetric | null,
): string | null {
  const active = new Set<string>();
  for (const w of workouts) active.add(w.date);
  for (const f of focus) active.add(dateKey(new Date(f.created_at)));

  // Consecutive active days ending today or yesterday.
  let streak = 0;
  const cursor = new Date();
  if (!active.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (active.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  if (streak >= 5) {
    return `${streak} active days in a row. A rest day tomorrow would do you good.`;
  }
  if (today?.energy_level != null && today.energy_level <= 2) {
    return "Energy's running low today. Keep it light and be gentle with yourself.";
  }
  if (today?.stress_level != null && today.stress_level >= 4) {
    return "Stress is running high. A few slow breaths or a short walk could help.";
  }
  if (today?.sleep_hours != null && today.sleep_hours < 6) {
    return "Short on sleep. Maybe an earlier night, and ease the load today.";
  }
  return null;
}
