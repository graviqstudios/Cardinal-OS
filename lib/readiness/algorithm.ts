import type { TopicStatus } from "@/lib/study/types";

/**
 * Deterministic Readiness Score (0–1000). Explainable and stable - not an LLM.
 * Factors (project doc): syllabus coverage, mastery (weighted topic status),
 * recency-weighted practice scores, topic balance across subjects, plus
 * days-to-exam surfaced as context (it doesn't inflate preparedness itself).
 */

const MASTERY_WEIGHT: Record<TopicStatus, number> = {
  untouched: 0,
  weak: 0.34,
  moderate: 0.67,
  strong: 1,
};

const PRACTICE_HALF_LIFE_DAYS = 14;

export type ReadinessInput = {
  topics: { status: TopicStatus; subject_id: string }[];
  practice: { score: number | null; max_score: number | null; created_at: string }[];
  examDate: string | null;
  now?: Date;
};

export type ReadinessBreakdown = {
  mastery: number; // 0..1
  coverage: number; // 0..1
  practice: number; // 0..1
  balance: number; // 0..1
  topicCount: number;
  daysRemaining: number | null;
};

export type ReadinessResult = {
  score: number; // 0..1000
  breakdown: ReadinessBreakdown;
};

// Component weights - must sum to 1.
const W = { mastery: 0.45, coverage: 0.25, practice: 0.2, balance: 0.1 };

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const now = input.now ?? new Date();
  const topics = input.topics;
  const topicCount = topics.length;

  const daysRemaining = input.examDate
    ? Math.max(
        0,
        Math.round(
          (new Date(input.examDate).getTime() - now.getTime()) / 86_400_000,
        ),
      )
    : null;

  if (topicCount === 0) {
    return {
      score: 0,
      breakdown: {
        mastery: 0,
        coverage: 0,
        practice: 0,
        balance: 0,
        topicCount: 0,
        daysRemaining,
      },
    };
  }

  // Mastery: mean weighted status.
  const mastery =
    topics.reduce((s, t) => s + MASTERY_WEIGHT[t.status], 0) / topicCount;

  // Coverage: fraction of topics that have been touched at all.
  const coverage =
    topics.filter((t) => t.status !== "untouched").length / topicCount;

  // Practice: recency-weighted average of score/max fractions.
  let practice = 0;
  let weightSum = 0;
  for (const p of input.practice) {
    if (p.score == null || !p.max_score) continue;
    const ageDays =
      (now.getTime() - new Date(p.created_at).getTime()) / 86_400_000;
    const weight = Math.pow(0.5, Math.max(0, ageDays) / PRACTICE_HALF_LIFE_DAYS);
    practice += weight * (p.score / p.max_score);
    weightSum += weight;
  }
  practice = weightSum > 0 ? practice / weightSum : 0;

  // Balance: 1 − spread of per-subject mean mastery (penalise lopsided prep).
  const balance = computeBalance(topics);

  const base =
    W.mastery * mastery +
    W.coverage * coverage +
    W.practice * practice +
    W.balance * balance;

  return {
    score: Math.round(1000 * clamp01(base)),
    breakdown: {
      mastery,
      coverage,
      practice,
      balance,
      topicCount,
      daysRemaining,
    },
  };
}

function computeBalance(topics: ReadinessInput["topics"]): number {
  const bySubject = new Map<string, { sum: number; n: number }>();
  for (const t of topics) {
    const e = bySubject.get(t.subject_id) ?? { sum: 0, n: 0 };
    e.sum += MASTERY_WEIGHT[t.status];
    e.n += 1;
    bySubject.set(t.subject_id, e);
  }
  const means = [...bySubject.values()].map((e) => e.sum / e.n);
  if (means.length <= 1) return 1;
  const avg = means.reduce((s, m) => s + m, 0) / means.length;
  const variance =
    means.reduce((s, m) => s + (m - avg) ** 2, 0) / means.length;
  const std = Math.sqrt(variance);
  // std is in [0, 0.5]; normalise so an even split → 1, maximally lopsided → 0.
  return clamp01(1 - std / 0.5);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
