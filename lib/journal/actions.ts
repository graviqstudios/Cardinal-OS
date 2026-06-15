"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Upsert today's daily reflection (one per day, manual upsert). */
export async function saveDailyReflection(input: {
  content: string;
  mood: number | null;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const day = todayKey();
  const content = input.content.trim() || null;
  const mood = input.mood ?? null;

  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "daily")
    .eq("date", day)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("journal_entries")
      .update({ content, mood })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("journal_entries")
      .insert({ user_id: user.id, type: "daily", date: day, content, mood });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/today");
  return { ok: true };
}
