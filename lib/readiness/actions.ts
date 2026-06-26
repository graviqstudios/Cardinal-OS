"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import { recordReadinessSnapshot } from "@/lib/readiness/service";

/** Records today's readiness snapshot for the signed-in user. Fire-and-forget. */
export async function recordReadiness(): Promise<{ ok: boolean }> {
  const user = await getUser();
  const supabase = await createClient();
  if (!user) return { ok: false };
  try {
    await recordReadinessSnapshot(supabase, user.id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
