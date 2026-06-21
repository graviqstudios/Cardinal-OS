import { createClient } from "@/lib/supabase/server";
import type { Skill } from "@/lib/skills/types";

export async function getSkills(): Promise<Skill[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skills")
    .select("*")
    .order("area_tag", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as Skill[];
}
