"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { levelForXp, XP_PER_LEVEL } from "@/lib/skills/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createSkill(name: string, areaTag: string | null): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!name.trim()) return { ok: false, error: "Name your skill." };
  const { error } = await supabase.from("skills").insert({
    user_id: userId,
    name: name.trim(),
    area_tag: areaTag?.trim() || null,
    level: 1,
    xp: 0,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}

/** Grant XP to a skill; recompute level. Returns whether it just levelled up. */
export async function addXp(
  id: string,
  amount = XP_PER_LEVEL / 4,
): Promise<Result<{ level: number; leveledUp: boolean }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data: current } = await supabase
    .from("skills")
    .select("xp")
    .eq("id", id)
    .single<{ xp: number }>();
  if (!current) return { ok: false, error: "Skill not found." };

  const oldLevel = levelForXp(current.xp);
  const newXp = current.xp + amount;
  const newLevel = levelForXp(newXp);

  const { error } = await supabase
    .from("skills")
    .update({ xp: newXp, level: newLevel })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/goals");
  return { ok: true, data: { level: newLevel, leveledUp: newLevel > oldLevel } };
}

export async function deleteSkill(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("skills").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  return { ok: true };
}
