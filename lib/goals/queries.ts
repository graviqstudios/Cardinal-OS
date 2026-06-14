import { createClient } from "@/lib/supabase/server";
import type {
  CareerTarget,
  Goal,
  GoalWithMilestones,
  Milestone,
} from "@/lib/goals/types";

export async function getGoalsWithMilestones(): Promise<GoalWithMilestones[]> {
  const supabase = await createClient();
  const [{ data: goals }, { data: milestones }] = await Promise.all([
    supabase.from("goals").select("*").order("created_at", { ascending: true }),
    supabase.from("milestones").select("*").order("created_at", { ascending: true }),
  ]);

  const byGoal = new Map<string, Milestone[]>();
  for (const m of (milestones ?? []) as Milestone[]) {
    const list = byGoal.get(m.goal_id) ?? [];
    list.push(m);
    byGoal.set(m.goal_id, list);
  }
  return ((goals ?? []) as Goal[]).map((g) => ({
    ...g,
    milestones: byGoal.get(g.id) ?? [],
  }));
}

export async function getCareerTargets(): Promise<CareerTarget[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_targets")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as CareerTarget[];
}

/** Consecutive-day study streak from practice_sessions (ending today or yesterday). */
export async function getStudyStreak(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_sessions")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(400);

  const rows = (data ?? []) as { created_at: string }[];
  if (rows.length === 0) return 0;

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set(rows.map((r) => dayKey(new Date(r.created_at))));

  let streak = 0;
  const cursor = new Date();
  // Allow the streak to count from today, or from yesterday if nothing today yet.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
