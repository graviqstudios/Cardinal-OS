"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { WorkoutType } from "@/lib/body/types";

type Result = { ok: true } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Upsert today's body metric (one row per day). */
export async function saveMetric(input: {
  weight_kg: number | null;
  sleep_hours: number | null;
  energy_level: number | null;
  notes?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("body_metrics").upsert(
    {
      user_id: userId,
      date: todayKey(),
      weight_kg: input.weight_kg,
      sleep_hours: input.sleep_hours,
      energy_level: input.energy_level,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id,date" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/body");
  revalidatePath("/today");
  return { ok: true };
}

export async function logWorkout(input: {
  name: string;
  type: WorkoutType | null;
  duration_minutes: number | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.name.trim()) return { ok: false, error: "Name your workout." };

  const { error } = await supabase.from("workout_logs").insert({
    user_id: userId,
    date: todayKey(),
    name: input.name.trim(),
    type: input.type,
    duration_minutes: input.duration_minutes,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/body");
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteWorkout(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("workout_logs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/body");
  return { ok: true };
}

/** Record a completed focus (Pomodoro) session. */
export async function logFocusSession(input: {
  duration_minutes: number;
  note?: string | null;
  task_id?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("focus_sessions").insert({
    user_id: userId,
    duration_minutes: input.duration_minutes,
    note: input.note ?? null,
    task_id: input.task_id ?? null,
    completed: true,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/body");
  revalidatePath("/today");
  return { ok: true };
}
