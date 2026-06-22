"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { PeriodFlow, WorkoutType } from "@/lib/body/types";

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

/**
 * Upsert specific columns of today's body metric (one row per day). Only the
 * supplied columns are written, so partial updates (e.g. just hydration) never
 * clobber the rest of the day's check-in.
 */
async function upsertToday(
  patch: Record<string, number | string | null>,
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("body_metrics")
    .upsert({ user_id: userId, date: todayKey(), ...patch }, { onConflict: "user_id,date" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/health");
  revalidatePath("/today");
  return { ok: true };
}

/** Save the daily check-in (sleep, weight, energy, mood, stress). */
export async function saveMetric(input: {
  weight_kg: number | null;
  sleep_hours: number | null;
  energy_level: number | null;
  mood_level?: number | null;
  stress_level?: number | null;
  notes?: string | null;
}): Promise<Result> {
  return upsertToday({
    weight_kg: input.weight_kg,
    sleep_hours: input.sleep_hours,
    energy_level: input.energy_level,
    mood_level: input.mood_level ?? null,
    stress_level: input.stress_level ?? null,
    notes: input.notes ?? null,
  });
}

/** Add (or remove, with a negative delta) hydration for today, clamped at 0. */
export async function addWater(deltaMl: number): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data: row } = await supabase
    .from("body_metrics")
    .select("water_ml")
    .eq("user_id", userId)
    .eq("date", todayKey())
    .maybeSingle();

  const next = Math.max(0, (row?.water_ml ?? 0) + deltaMl);
  return upsertToday({ water_ml: next });
}

/** Add minutes to today's mindfulness total (e.g. after a breathing session). */
export async function logMindfulness(minutes: number): Promise<Result> {
  if (!Number.isFinite(minutes) || minutes <= 0) return { ok: false, error: "Invalid duration." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data: row } = await supabase
    .from("body_metrics")
    .select("mindfulness_minutes")
    .eq("user_id", userId)
    .eq("date", todayKey())
    .maybeSingle();

  return upsertToday({
    mindfulness_minutes: (row?.mindfulness_minutes ?? 0) + Math.round(minutes),
  });
}

export async function logNutrition(input: {
  label: string;
  quality: number | null;
  calories: number | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.label.trim()) return { ok: false, error: "Name the meal." };

  const { error } = await supabase.from("nutrition_logs").insert({
    user_id: userId,
    date: todayKey(),
    label: input.label.trim(),
    quality: input.quality,
    calories: input.calories,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/health");
  return { ok: true };
}

export async function deleteNutrition(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/health");
  return { ok: true };
}

/** Upsert a cycle log for a given day (one row per day). */
export async function savePeriodDay(input: {
  date: string;
  flow: PeriodFlow | null;
  symptoms: string[];
  note?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("period_logs").upsert(
    {
      user_id: userId,
      date: input.date,
      flow: input.flow,
      symptoms: input.symptoms.length ? input.symptoms : null,
      note: input.note?.trim() || null,
    },
    { onConflict: "user_id,date" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/health");
  return { ok: true };
}

export async function deletePeriodDay(date: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("period_logs")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/health");
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

  revalidatePath("/health");
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteWorkout(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("workout_logs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/health");
  return { ok: true };
}

/** Record a completed focus (Pomodoro) session. */
export async function logFocusSession(input: {
  duration_minutes: number;
  note?: string | null;
  title?: string | null;
  description?: string | null;
  task_id?: string | null;
  habit_id?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("focus_sessions").insert({
    user_id: userId,
    duration_minutes: input.duration_minutes,
    note: input.note ?? null,
    title: input.title?.trim() || null,
    description: input.description?.trim() || null,
    task_id: input.task_id ?? null,
    habit_id: input.habit_id ?? null,
    completed: true,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/health");
  revalidatePath("/today");
  return { ok: true };
}
