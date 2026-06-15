"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function logMockExam(input: {
  label: string;
  score: number;
  max_score: number;
  taken_at?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.label.trim()) return { ok: false, error: "Label is required." };
  if (!(input.max_score > 0)) return { ok: false, error: "Max score must be positive." };
  if (!(input.score >= 0) || input.score > input.max_score)
    return { ok: false, error: "Score must be between 0 and max." };

  const { error } = await supabase.from("mock_exams").insert({
    user_id: userId,
    label: input.label.trim(),
    score: input.score,
    max_score: input.max_score,
    taken_at: input.taken_at || new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteMockExam(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("mock_exams").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/today");
  return { ok: true };
}
