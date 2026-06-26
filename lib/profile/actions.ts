"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import { ACCENT_IDS, PALETTE_IDS } from "@/lib/theme/config";

export type ProfileUpdate = {
  name?: string | null;
  exam_target?: string | null;
  exam_date?: string | null;
  accent_color?: string | null;
  theme?: string | null;
  sex?: "female" | "male" | "other" | null;
  exam_mode?: boolean;
};

const SEX_VALUES = ["female", "male", "other"] as const;

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Persist profile fields for the signed-in user. Validates the themeable fields
 * against the known palette/accent ids. RLS guarantees a user can only ever
 * touch their own row, but we also scope the update by id defensively.
 */
export async function updateProfile(
  update: ProfileUpdate,
): Promise<ProfileActionResult> {

  const user = await getUser();
  const supabase = await createClient();

  if (!user) return { ok: false, error: "Not authenticated." };

  if (
    update.accent_color != null &&
    !ACCENT_IDS.includes(update.accent_color as never)
  ) {
    return { ok: false, error: "Invalid accent." };
  }
  if (update.theme != null && !PALETTE_IDS.includes(update.theme as never)) {
    return { ok: false, error: "Invalid theme." };
  }
  if (update.sex != null && !SEX_VALUES.includes(update.sex)) {
    return { ok: false, error: "Invalid value." };
  }

  const { error } = await supabase
    .from("users")
    .update(update)
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
