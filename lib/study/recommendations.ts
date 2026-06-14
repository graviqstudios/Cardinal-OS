import type { TopicStatus } from "@/lib/study/types";

export type RecoTopic = {
  id: string;
  name: string;
  subjectName: string;
  status: TopicStatus;
};

export type Recommendation = RecoTopic & { reason: string };

// Impact = headroom to gain; time = relative effort. Ratio ranks quick wins
// (weak topics) ahead of from-scratch untouched ones.
const PROFILE: Record<TopicStatus, { ratio: number; reason: string }> = {
  weak: { ratio: 0.66, reason: "Quick win — close to solid, small push needed" },
  untouched: { ratio: 0.45, reason: "Untouched — start here to open up coverage" },
  moderate: { ratio: 0.33, reason: "Solidify to push toward strong" },
  strong: { ratio: 0, reason: "Already strong" },
};

/** Top 3 topics ranked by impact ÷ time. Strong topics are excluded. */
export function recommendTopics(topics: RecoTopic[]): Recommendation[] {
  return topics
    .filter((t) => t.status !== "strong")
    .sort((a, b) => PROFILE[b.status].ratio - PROFILE[a.status].ratio)
    .slice(0, 3)
    .map((t) => ({ ...t, reason: PROFILE[t.status].reason }));
}
