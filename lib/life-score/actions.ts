"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import { recordLifeScoreSnapshot } from "@/lib/life-score/service";

/** Records today's Life Score snapshot for the signed-in user. Fire-and-forget. */
export async function recordLifeScore(): Promise<{ ok: boolean }> {
  const user = await getUser();
  const supabase = await createClient();
  if (!user) return { ok: false };
  try {
    await recordLifeScoreSnapshot(supabase, user.id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
