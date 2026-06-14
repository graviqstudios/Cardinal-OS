import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import {
  computeReadiness,
  type ReadinessBreakdown,
  type ReadinessResult,
} from "@/lib/readiness/algorithm";
import type { TopicStatus } from "@/lib/study/types";

export type ReadinessSnapshot = {
  score: number;
  breakdown: ReadinessBreakdown;
  /** Last 14 daily snapshots, oldest → newest. */
  history: { day: string; score: number }[];
  /** Previous distinct snapshot score for the trend arrow, or null. */
  previous: number | null;
};

/** Compute the live readiness score for a user from current topics + practice. */
export async function computeForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReadinessResult> {
  const [{ data: topics }, { data: practice }, { data: profile }] =
    await Promise.all([
      supabase.from("topics").select("status, subject_id").eq("user_id", userId),
      supabase
        .from("practice_sessions")
        .select("score, max_score, created_at")
        .eq("user_id", userId),
      supabase.from("users").select("exam_date").eq("id", userId).single(),
    ]);

  return computeReadiness({
    topics: (topics ?? []) as { status: TopicStatus; subject_id: string }[],
    practice: (practice ?? []) as {
      score: number | null;
      max_score: number | null;
      created_at: string;
    }[],
    examDate: profile?.exam_date ?? null,
  });
}

/** Compute + upsert today's snapshot. Safe to call after any practice session. */
export async function recordReadinessSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { score, breakdown } = await computeForUser(supabase, userId);
  const day = new Date().toISOString().slice(0, 10);
  await supabase
    .from("readiness_scores")
    .upsert(
      { user_id: userId, day, score, breakdown, calculated_at: new Date().toISOString() },
      { onConflict: "user_id,day" },
    );
  return score;
}

/** Dashboard read: live score + 14-day history + previous score for the trend. */
export async function getReadinessSnapshot(): Promise<ReadinessSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const live = await computeForUser(supabase, user.id);

  const { data: rows } = await supabase
    .from("readiness_scores")
    .select("day, score")
    .eq("user_id", user.id)
    .order("day", { ascending: false })
    .limit(14);

  const history = ((rows ?? []) as { day: string; score: number }[])
    .slice()
    .reverse();

  const today = new Date().toISOString().slice(0, 10);
  const previous =
    history.filter((h) => h.day !== today).slice(-1)[0]?.score ?? null;

  return { score: live.score, breakdown: live.breakdown, history, previous };
}
