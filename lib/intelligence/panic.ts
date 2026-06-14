import type { TopicStatus } from "@/lib/study/types";

export type PanicPlanDay = { label: string; topics: string[] };

export type PanicState = {
  triggered: boolean;
  daysToExam: number | null;
  score: number;
  triage: string[]; // high-impact topic names
  plan: PanicPlanDay[]; // next few days
  text?: string;
};

const READINESS_THRESHOLD = 500; // out of 1000
const TRIAGE_PRIORITY: TopicStatus[] = ["weak", "untouched", "moderate"];

/**
 * Panic mode: auto-triggers at ≤30 days to exam with a low readiness score.
 * Produces a triage list (highest-impact topics) and a short day-by-day sprint.
 */
export function computePanic(input: {
  daysToExam: number | null;
  score: number;
  topics: { name: string; status: TopicStatus }[];
}): PanicState {
  const { daysToExam, score, topics } = input;
  const triggered =
    daysToExam != null && daysToExam <= 30 && score < READINESS_THRESHOLD;

  const triageTopics = topics
    .filter((t) => t.status !== "strong")
    .sort(
      (a, b) =>
        idx(a.status) - idx(b.status),
    )
    .map((t) => t.name);

  let plan: PanicPlanDay[] = [];
  if (triggered && triageTopics.length > 0) {
    const planDays = Math.min(7, daysToExam ?? 7);
    const perDay = Math.max(1, Math.ceil(triageTopics.length / Math.max(1, planDays)));
    plan = Array.from({ length: planDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      return {
        label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        topics: triageTopics.slice(i * perDay, i * perDay + perDay),
      };
    }).filter((d) => d.topics.length > 0);
  }

  return {
    triggered,
    daysToExam,
    score,
    triage: triageTopics.slice(0, 12),
    plan,
    text: triggered
      ? `${daysToExam} days to your exam, with readiness at ${score}/1000. Here's a focused plan — concentrate on these high-impact topics first, in order.`
      : undefined,
  };
}

function idx(s: TopicStatus): number {
  const i = TRIAGE_PRIORITY.indexOf(s);
  return i === -1 ? 99 : i;
}
