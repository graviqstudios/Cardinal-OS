import { createClient } from "@/lib/supabase/server";

export type JournalEntry = {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  content: string | null;
  mood: number | null;
  date: string | null;
  created_at: string;
  updated_at: string;
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
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
