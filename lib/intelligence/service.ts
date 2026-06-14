import { createClient } from "@/lib/supabase/server";
import { computeForUser } from "@/lib/readiness/service";
import { computeTimingInsight, type TimingInsight } from "@/lib/intelligence/cognitive";
import { computeBurnout, type BurnoutSignal } from "@/lib/intelligence/burnout";
import { computePanic, type PanicState } from "@/lib/intelligence/panic";
import { computePredictive, type MockExam, type Prediction } from "@/lib/intelligence/predictive";
import type { TopicStatus } from "@/lib/study/types";

export type Intelligence = {
  timing: TimingInsight;
  burnout: BurnoutSignal;
  panic: PanicState;
  predictive: Prediction;
  mocks: MockExam[];
};

export async function getIntelligence(): Promise<Intelligence | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: practice }, { data: topics }, { data: mocks }, { data: profile }, readiness] =
    await Promise.all([
      supabase
        .from("practice_sessions")
        .select("score, max_score, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("topics").select("name, status").eq("user_id", user.id),
      supabase
        .from("mock_exams")
        .select("id, label, score, max_score, taken_at")
        .eq("user_id", user.id)
        .order("taken_at", { ascending: false }),
      supabase.from("users").select("exam_date").eq("id", user.id).single(),
      computeForUser(supabase, user.id),
    ]);

  const practicePoints = (practice ?? []) as {
    score: number | null;
    max_score: number | null;
    created_at: string;
  }[];
  const topicList = (topics ?? []) as { name: string; status: TopicStatus }[];
  const mockList = (mocks ?? []) as MockExam[];

  let daysToExam: number | null = null;
  if (profile?.exam_date) {
    const d = Math.round(
      (new Date(profile.exam_date).getTime() - Date.now()) / 86_400_000,
    );
    daysToExam = d >= 0 ? d : null;
  }

  return {
    timing: computeTimingInsight(practicePoints),
    burnout: computeBurnout(practicePoints),
    panic: computePanic({ daysToExam, score: readiness.score, topics: topicList }),
    predictive: computePredictive(mockList, topicList),
    mocks: mockList,
  };
}
