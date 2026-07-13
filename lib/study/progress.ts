import type { TopicStatus } from "@/lib/study/types";

/**
 * Mastery weight per topic status, used to roll a set of topics up into a single
 * 0–100 progress figure for subject cards and progress bars. Matches the heat
 * scale order untouched → weak → moderate → strong.
 */
export const STATUS_WEIGHT: Record<TopicStatus, number> = {
  untouched: 0,
  weak: 1 / 3,
  moderate: 2 / 3,
  strong: 1,
};

/** Weighted mastery of a topic list as a 0–100 integer (0 when empty). */
export function subjectProgress(topics: { status: TopicStatus }[]): number {
  if (topics.length === 0) return 0;
  const sum = topics.reduce((acc, t) => acc + STATUS_WEIGHT[t.status], 0);
  return Math.round((sum / topics.length) * 100);
}

/** Count of topics per status, for a compact breakdown under a progress bar. */
export function statusCounts(
  topics: { status: TopicStatus }[],
): Record<TopicStatus, number> {
  const counts: Record<TopicStatus, number> = {
    untouched: 0,
    weak: 0,
    moderate: 0,
    strong: 0,
  };
  for (const t of topics) counts[t.status] += 1;
  return counts;
}
