"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import type { Routine } from "@/lib/habits/types";

type Result = { ok: true } | { ok: false; error: string };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createHabit(name: string, routine: Routine = "any"): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!name.trim()) return { ok: false, error: "Name is required." };
  const { error } = await supabase
    .from("habits")
    .insert({ user_id: userId, name: name.trim(), routine });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/plan");
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteHabit(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/plan");
  revalidatePath("/today");
  return { ok: true };
}

/** Toggle today's completion for a habit, then refresh the Life Score. */
export async function toggleHabitToday(habitId: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const day = todayKey();

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id, completed")
    .eq("habit_id", habitId)
    .eq("logged_date", day)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("habit_logs")
      .update({ completed: !existing.completed })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("habit_logs")
      .insert({ habit_id: habitId, user_id: userId, logged_date: day, completed: true });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/plan");
  revalidatePath("/today");
  return { ok: true };
}
