"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import { computeForUser } from "@/lib/readiness/service";
import { listPublicServers } from "@/lib/pods/queries";
import type { PublicServer } from "@/lib/pods/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** Search the public server directory (client-callable). */
export async function searchPublicServers(
  search: string,
): Promise<PublicServer[]> {
  return listPublicServers(search);
}

/** Join a public server directly (no invite code). */
export async function joinPublicServer(
  podId: string,
): Promise<Result<{ id: string }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { data, error } = await supabase.rpc("join_pod_public", {
    p_pod: podId,
  });
  if (error) return { ok: false, error: error.message.replace(/^.*?:\s*/, "") };
  await publishPodStats();
  revalidatePath("/constellations");
  return { ok: true, data: { id: data as string } };
}

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createServer(input: {
  name: string;
  exam?: string;
  description?: string;
  visibility?: "public" | "private";
}): Promise<Result<{ id: string }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.name.trim()) return { ok: false, error: "A name is required." };

  const { data, error } = await supabase.rpc("create_pod", {
    p_name: input.name.trim(),
    p_exam: (input.exam ?? "").trim(),
    p_description: (input.description ?? "").trim(),
    p_visibility: input.visibility ?? "private",
  });
  if (error) return { ok: false, error: error.message };

  await publishPodStats();
  revalidatePath("/constellations");
  return { ok: true, data: { id: data as string } };
}

/** Owner-only server edits (RLS enforces ownership on pods update). */
export async function updateServer(
  serverId: string,
  patch: {
    name?: string;
    description?: string | null;
    visibility?: "public" | "private";
    icon_url?: string | null;
  },
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const update: Record<string, unknown> = {};
  if (patch.name != null) {
    if (!patch.name.trim()) return { ok: false, error: "Name is required." };
    update.name = patch.name.trim();
  }
  if (patch.description !== undefined)
    update.description = patch.description?.trim() || null;
  if (patch.visibility != null) update.visibility = patch.visibility;
  if (patch.icon_url !== undefined) update.icon_url = patch.icon_url;

  const { error } = await supabase.from("pods").update(update).eq("id", serverId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/constellations/${serverId}`);
  revalidatePath("/constellations");
  return { ok: true };
}

export async function deleteServer(serverId: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  // RLS: only the owner may delete the pod row (cascade removes channels etc.).
  const { data: pod } = await supabase
    .from("pods")
    .select("created_by")
    .eq("id", serverId)
    .maybeSingle();
  if (!pod || pod.created_by !== userId)
    return { ok: false, error: "Only the owner can delete this server." };
  const { error } = await supabase.from("pods").delete().eq("id", serverId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/constellations");
  return { ok: true };
}

export async function joinPod(code: string): Promise<Result<{ id: string }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!code.trim()) return { ok: false, error: "Enter an invite code." };

  const { data, error } = await supabase.rpc("join_pod", { p_code: code.trim() });
  if (error) return { ok: false, error: error.message.replace(/^.*?:\s*/, "") };

  await publishPodStats();
  revalidatePath("/constellations");
  return { ok: true, data: { id: data as string } };
}

export async function leavePod(podId: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("pod_members")
    .delete()
    .eq("pod_id", podId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/constellations");
  return { ok: true };
}

/** Publish the user's own shareable snapshot (readiness, streak, current goal). */
export async function publishPodStats(): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { data: profile },
    { data: practice },
    { data: goal },
    { data: focus },
    { data: recentPractice },
    readiness,
  ] = await Promise.all([
    supabase.from("users").select("name, email").eq("id", userId).single(),
    supabase
      .from("practice_sessions")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("goals")
      .select("title, progress")
      .eq("user_id", userId)
      .lt("progress", 100)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("focus_sessions")
      .select("duration_minutes")
      .eq("user_id", userId)
      .gte("created_at", weekAgo),
    supabase
      .from("practice_sessions")
      .select("duration_minutes")
      .eq("user_id", userId)
      .gte("created_at", weekAgo),
    computeForUser(supabase, userId),
  ]);

  // Study minutes over the last 7 days: focus sessions + graded practice.
  const sumMinutes = (rows: { duration_minutes: number | null }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.duration_minutes ?? 0), 0);
  const studyMinutes = Math.round(
    sumMinutes(focus) + sumMinutes(recentPractice),
  );

  // Streak: consecutive days with practice ending today/yesterday.
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set((practice ?? []).map((r) => dayKey(new Date(r.created_at))));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const name = profile?.name?.trim() || profile?.email?.split("@")[0] || "Member";

  const { error } = await supabase.from("pod_stats").upsert(
    {
      user_id: userId,
      name,
      readiness: readiness.score,
      streak,
      study_minutes: studyMinutes,
      current_goal: goal?.title ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
