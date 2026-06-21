import { createClient } from "@/lib/supabase/server";
import type { BodyMetric, BodyOverview, WorkoutLog } from "@/lib/body/types";

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Everything the Body page needs in one round trip. */
export async function getBodyOverview(): Promise<BodyOverview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = dateKey(new Date());
  const since14 = dateKey(new Date(Date.now() - 13 * 86_400_000));
  const since7ISO = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const since7Date = dateKey(new Date(Date.now() - 6 * 86_400_000));

  const [{ data: metrics }, { data: workouts }, { data: focus }] = await Promise.all([
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
  ]);

  const series = (metrics ?? []) as BodyMetric[];
  const todayMetric = series.find((m) => m.date === today) ?? null;
  const workoutList = (workouts ?? []) as WorkoutLog[];

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
    focusMinutesWeek,
    workoutDaysWeek: activeDays.size,
    recovery: recoveryNudge(workoutList, focus ?? [], todayMetric),
  };
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
  if (today?.sleep_hours != null && today.sleep_hours < 6) {
    return "Short on sleep. Maybe an earlier night, and ease the load today.";
  }
  return null;
}
