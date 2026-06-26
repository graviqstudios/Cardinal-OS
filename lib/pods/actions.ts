"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import { computeForUser } from "@/lib/readiness/service";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createPod(name: string, examTarget: string): Promise<Result<{ id: string }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!name.trim()) return { ok: false, error: "A name is required." };

  const { data, error } = await supabase.rpc("create_pod", {
    p_name: name.trim(),
    p_exam: examTarget.trim(),
  });
  if (error) return { ok: false, error: error.message };

  await publishPodStats();
  revalidatePath("/constellations");
  return { ok: true, data: { id: data as string } };
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

  const [{ data: profile }, { data: practice }, { data: goal }, readiness] =
    await Promise.all([
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
      computeForUser(supabase, userId),
    ]);

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
      current_goal: goal?.title ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
