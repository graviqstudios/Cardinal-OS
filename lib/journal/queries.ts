import { createClient } from "@/lib/supabase/server";

export type { JournalType, JournalEntry } from "@/lib/journal/types";
export { JOURNAL_TYPES, journalTypeLabel } from "@/lib/journal/types";

import type { JournalEntry } from "@/lib/journal/types";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** All journal entries for the signed-in user, newest first. */
export async function getJournalEntries(): Promise<JournalEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as JournalEntry[];
}

/** A single entry by id (RLS limits to the owner). */
export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as JournalEntry) ?? null;
}

/** Today's daily reflection entry, or null. */
export async function getTodayReflection(): Promise<JournalEntry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("type", "daily")
    .eq("date", todayKey())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as JournalEntry) ?? null;
}
