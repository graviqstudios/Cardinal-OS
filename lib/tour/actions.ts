"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import { TOUR_VERSION } from "@/lib/tour/version";

/** Mark the welcome tour as completed (or skipped) for the signed-in user. */
export async function completeTour(): Promise<{ ok: boolean }> {
  const user = await getUser();
  const supabase = await createClient();
  if (!user) return { ok: false };

  await supabase
    .from("users")
    .update({ tour_completed_at: new Date().toISOString(), tour_version: TOUR_VERSION })
    .eq("id", user.id);
  return { ok: true };
}
