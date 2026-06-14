import { createClient } from "@/lib/supabase/server";
import type {
  Pod,
  PodDetail,
  PodStat,
  PodSummary,
} from "@/lib/pods/types";

/** Pods the signed-in user belongs to, with member counts. */
export async function getMyPods(): Promise<PodSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: myMemberships } = await supabase
    .from("pod_members")
    .select("pod_id")
    .eq("user_id", user.id);

  const podIds = (myMemberships ?? []).map((m) => m.pod_id as string);
  if (podIds.length === 0) return [];

  const [{ data: pods }, { data: allMembers }] = await Promise.all([
    supabase.from("pods").select("*").in("id", podIds),
    supabase.from("pod_members").select("pod_id").in("pod_id", podIds),
  ]);

  const counts = new Map<string, number>();
  for (const m of allMembers ?? [])
    counts.set(m.pod_id as string, (counts.get(m.pod_id as string) ?? 0) + 1);

  return ((pods ?? []) as Pod[]).map((p) => ({
    ...p,
    memberCount: counts.get(p.id) ?? 0,
  }));
}

/** Full pod with each member's shared stats (RLS permits co-member reads). */
export async function getPodDetail(podId: string): Promise<PodDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pod } = await supabase
    .from("pods")
    .select("*")
    .eq("id", podId)
    .single();
  if (!pod) return null;

  const { data: members } = await supabase
    .from("pod_members")
    .select("user_id, joined_at")
    .eq("pod_id", podId)
    .order("joined_at", { ascending: true });

  const memberRows = (members ?? []) as { user_id: string; joined_at: string }[];
  const userIds = memberRows.map((m) => m.user_id);

  const { data: stats } = await supabase
    .from("pod_stats")
    .select("*")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const statByUser = new Map<string, PodStat>();
  for (const s of (stats ?? []) as PodStat[]) statByUser.set(s.user_id, s);

  return {
    ...(pod as Pod),
    members: memberRows
      .map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        stat: statByUser.get(m.user_id) ?? null,
        isYou: m.user_id === user.id,
      }))
      // Rank by readiness desc for the shared leaderboard feel.
      .sort((a, b) => (b.stat?.readiness ?? 0) - (a.stat?.readiness ?? 0)),
  };
}
