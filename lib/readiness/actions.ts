"use server";

import { createClient } from "@/lib/supabase/server";
import { recordReadinessSnapshot } from "@/lib/readiness/service";

/** Records today's readiness snapshot for the signed-in user. Fire-and-forget. */
export async function recordReadiness(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  try {
    await recordReadinessSnapshot(supabase, user.id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
