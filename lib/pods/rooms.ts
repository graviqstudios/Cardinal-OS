"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import { createGoogleMeet, freshAccessToken } from "@/lib/integrations/google";
import { sendMessage } from "@/lib/pods/chat";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

/**
 * Start (or update) the shared study-room timer for a pod. Members receive the
 * change over Supabase Realtime and derive their countdown from `ends_at`, so it
 * stays in sync even across tabs/late joins. RLS restricts this to pod members.
 */
export async function startPodTimer(
  podId: string,
  minutes: number,
  phase: "focus" | "break" = "focus",
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const mins = Math.min(180, Math.max(1, Math.round(minutes)));
  const endsAt = new Date(Date.now() + mins * 60_000).toISOString();

  const { error } = await supabase.from("pod_timer").upsert(
    {
      pod_id: podId,
      ends_at: endsAt,
      label: `${mins} min ${phase}`,
      phase,
      started_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pod_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Clear the pod's shared timer. */
export async function stopPodTimer(podId: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("pod_timer")
    .update({ ends_at: null, label: null, updated_at: new Date().toISOString() })
    .eq("pod_id", podId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Create a Google Meet for this constellation (for members who've connected
 * Google Calendar) and drop the link into the constellation chat so everyone
 * can join. Returns the link.
 */
export async function createPodMeet(
  podId: string,
  podName: string,
): Promise<Result<{ url: string }>> {
  const { userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const token = await freshAccessToken(userId, "google_calendar");
  if (!token) {
    return {
      ok: false,
      error: "Connect Google Calendar in Settings to create a Meet link.",
    };
  }

  try {
    const url = await createGoogleMeet(token, {
      summary: `Study room - ${podName}`,
      minutes: 90,
    });
    if (!url) return { ok: false, error: "Google did not return a Meet link." };
    await sendMessage(podId, `Google Meet room: ${url}`);
    return { ok: true, data: { url } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create a Meet link.",
    };
  }
}
