"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { GoalType } from "@/lib/goals/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

// ── Goals ─────────────────────────────────────────────────────────────────────
export async function createGoal(input: {
  title: string;
  type: GoalType;
  target_date?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    title: input.title.trim(),
    type: input.type,
    target_date: input.target_date || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

export async function setGoalIdentity(id: string, identity: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("goals")
    .update({ identity: identity.trim() || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

export async function setGoalProgress(id: string, progress: number): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const { error } = await supabase.from("goals").update({ progress: clamped }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

// ── Milestones ────────────────────────────────────────────────────────────────
export async function addMilestone(goalId: string, title: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!title.trim()) return { ok: false, error: "Title is required." };
  const { error } = await supabase
    .from("milestones")
    .insert({ user_id: userId, goal_id: goalId, title: title.trim() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

export async function toggleMilestone(id: string, completed: boolean): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("milestones").update({ completed }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

export async function deleteMilestone(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("milestones").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

// ── Career targets ──────────────────────────────────────────────────────────
export async function createCareerTarget(input: {
  title: string;
  required_score?: string | null;
  current_score?: string | null;
  notes?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  const { error } = await supabase.from("career_targets").insert({
    user_id: userId,
    title: input.title.trim(),
    required_score: input.required_score || null,
    current_score: input.current_score || null,
    notes: input.notes || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

export async function deleteCareerTarget(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("career_targets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}
