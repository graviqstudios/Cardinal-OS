"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { reindexJournalEntry } from "@/lib/journal/embed";
import type { JournalType } from "@/lib/journal/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

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

  let entryId = existing?.id as string | undefined;
  if (existing) {
    const { error } = await supabase
      .from("journal_entries")
      .update({ content, mood })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({ user_id: user.id, type: "daily", date: day, content, mood })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    entryId = data.id as string;
  }

  if (entryId) await reindexJournalEntry(supabase, user.id, entryId, content);

  revalidatePath("/today");
  return { ok: true };
}

const VALID_TYPES = ["daily", "weekly", "monthly", "quarterly", "yearly", "note"];

/** Create a journal entry. */
export async function createEntry(input: {
  type: JournalType;
  title: string | null;
  content: string;
  mood: number | null;
  date: string | null;
}): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const type = VALID_TYPES.includes(input.type) ? input.type : "note";
  const content = input.content.trim();
  if (!content && !input.title?.trim()) {
    return { ok: false, error: "Write something first." };
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      type,
      title: input.title?.trim() || null,
      content: content || null,
      mood: input.mood ?? null,
      date: input.date || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await reindexJournalEntry(supabase, user.id, data.id as string, content);

  revalidatePath("/journal");
  return { ok: true, data: { id: data.id as string } };
}

/** Update an existing journal entry (RLS scopes to the owner). */
export async function updateEntry(
  id: string,
  input: { title: string | null; content: string; mood: number | null },
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("journal_entries")
    .update({
      title: input.title?.trim() || null,
      content: input.content.trim() || null,
      mood: input.mood ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  await reindexJournalEntry(supabase, user.id, id, input.content);

  revalidatePath("/journal");
  return { ok: true };
}

/** Delete a journal entry. */
export async function deleteEntry(id: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/journal");
  return { ok: true };
}
