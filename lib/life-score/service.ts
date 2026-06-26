import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient, getUser } from "@/lib/supabase/server";
import {
  computeLifeScore,
  type LifeScoreBreakdown,
  type LifeScoreResult,
} from "@/lib/life-score/algorithm";

export type LifeScoreSnapshot = {
  score: number;
  breakdown: LifeScoreBreakdown;
  history: { day: string; score: number }[];
  previous: number | null;
};

/** Compute the live Life Score for a user from current habits/tasks/goals/areas. */
export async function computeForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<LifeScoreResult> {
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const since7Date = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const since14 = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const [
    { data: habits },
    { data: habitLogs },
    { data: tasksRecent },
    { data: goals },
    { data: projects },
    { data: txns },
    { data: events },
    { data: workouts },
    { data: focus },
  ] = await Promise.all([
    supabase.from("habits").select("id, created_at").eq("user_id", userId).eq("archived", false),
    supabase.from("habit_logs").select("completed, logged_date").eq("user_id", userId).gte("logged_date", since7Date),
    supabase.from("tasks").select("status, created_at").eq("user_id", userId).gte("created_at", since14),
    supabase.from("goals").select("progress").eq("user_id", userId),
    supabase.from("projects").select("progress").eq("user_id", userId),
    supabase.from("transactions").select("id").eq("user_id", userId).gte("occurred_at", since7),
    supabase.from("events").select("id").eq("user_id", userId).gte("start_time", since7),
    supabase.from("workout_logs").select("id").eq("user_id", userId).gte("date", since7Date),
    supabase.from("focus_sessions").select("id").eq("user_id", userId).gte("created_at", since7),
  ]);

  // Habits: completions in the last 7 days vs. (active habits × 7).
  const activeHabits = (habits ?? []).length;
  const completed = (habitLogs ?? []).filter((l) => l.completed).length;
  const habitsFactor = activeHabits > 0 ? { completed, possible: activeHabits * 7 } : null;

  // Tasks: done vs. total among tasks created in the last 14 days.
  const recent = tasksRecent ?? [];
  const tasksFactor =
    recent.length > 0
      ? { done: recent.filter((t) => t.status === "done").length, total: recent.length }
      : null;

  // Velocity: average progress across goals + projects, 0..1.
  const progresses = [
    ...(goals ?? []).map((g) => Number(g.progress)),
    ...(projects ?? []).map((p) => Number(p.progress)),
  ];
  const velocity =
    progresses.length > 0
      ? progresses.reduce((s, p) => s + p, 0) / progresses.length / 100
      : null;

  // Balance: how many core areas saw activity this week.
  const areasActive = [
    completed > 0, // habits
    recent.some((t) => t.status === "done"), // tasks
    progresses.some((p) => p > 0), // goals/projects
    (txns ?? []).length > 0, // money
    (events ?? []).length > 0, // calendar
    (workouts ?? []).length > 0 || (focus ?? []).length > 0, // body
  ];
  const balance = areasActive.filter(Boolean).length / areasActive.length;

  return computeLifeScore({ habits: habitsFactor, tasks: tasksFactor, velocity, balance });
}

/** Compute + upsert today's Life Score snapshot. */
export async function recordLifeScoreSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { score, breakdown } = await computeForUser(supabase, userId);
  const day = new Date().toISOString().slice(0, 10);
  await supabase
    .from("life_scores")
    .upsert(
      { user_id: userId, day, score, breakdown, calculated_at: new Date().toISOString() },
      { onConflict: "user_id,day" },
    );
  return score;
}

/**
 * Live score + 14-day history + previous score for the trend.
 *
 * Wrapped in React `cache()` so the layout (header) and the Today page reuse a
 * single computation per request instead of running the 11-query snapshot twice.
 */
export const getLifeScoreSnapshot = cache(
  async function getLifeScoreSnapshot(): Promise<LifeScoreSnapshot | null> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const live = await computeForUser(supabase, user.id);
  const { data: rows } = await supabase
    .from("life_scores")
    .select("day, score")
    .eq("user_id", user.id)
    .order("day", { ascending: false })
    .limit(14);

  const history = ((rows ?? []) as { day: string; score: number }[]).slice().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const previous = history.filter((h) => h.day !== today).slice(-1)[0]?.score ?? null;

  return { score: live.score, breakdown: live.breakdown, history, previous };
  },
);
