"use server";

import { createClient } from "@/lib/supabase/server";

/** Mark the welcome tour as completed (or skipped) for the signed-in user. */
export async function completeTour(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("users")
    .update({ tour_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  return { ok: true };
}
