import { createClient } from "@/lib/supabase/server";
import type { Habit, HabitWithToday } from "@/lib/habits/types";

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Active habits with today's completion + current streak. */
export async function getHabitsWithToday(): Promise<HabitWithToday[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const since = new Date(Date.now() - 70 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_date, completed")
      .eq("user_id", user.id)
      .gte("logged_date", since),
  ]);

  // Completed dates per habit.
  const doneByHabit = new Map<string, Set<string>>();
  for (const l of logs ?? []) {
    if (!l.completed) continue;
    const set = doneByHabit.get(l.habit_id as string) ?? new Set<string>();
    set.add(l.logged_date as string);
    doneByHabit.set(l.habit_id as string, set);
  }

  const todayKey = localDateKey(new Date());

  return ((habits ?? []) as Habit[]).map((h) => {
    const done = doneByHabit.get(h.id) ?? new Set<string>();
    // Streak: consecutive days ending today or yesterday.
    let streak = 0;
    const cursor = new Date();
    if (!done.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (done.has(localDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { ...h, doneToday: done.has(todayKey), streak, completedDates: [...done] };
  });
}
