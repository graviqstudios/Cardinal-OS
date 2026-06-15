/**
 * Life Score (0–1000) — the one orienting number (doc §"The One Number").
 * Four factors: habit consistency, goal/project velocity, task follow-through,
 * and life balance (breadth across active areas). Factors with no data yet are
 * dropped and the weights renormalised, so a new user isn't punished for not
 * having set up, say, habits. Deterministic — never an LLM.
 *
 * Anti-anxiety: the score moves slowly and is never shown in alarm colours.
 */

export type LifeScoreInput = {
  /** Habit completions over the window vs. the possible count, or null if no habits. */
  habits: { completed: number; possible: number } | null;
  /** Tasks done vs. total in the recent window, or null if no recent tasks. */
  tasks: { done: number; total: number } | null;
  /** Average goal/project progress 0..1, or null if no goals/projects. */
  velocity: number | null;
  /** Breadth: fraction of core areas active this week, 0..1 (always present). */
  balance: number;
};

export type LifeScoreBreakdown = {
  habits: number | null;
  velocity: number | null;
  tasks: number | null;
  balance: number;
};

export type LifeScoreResult = { score: number; breakdown: LifeScoreBreakdown };

const WEIGHTS = { habits: 0.3, velocity: 0.3, tasks: 0.25, balance: 0.15 };

export function computeLifeScore(input: LifeScoreInput): LifeScoreResult {
  const habits =
    input.habits && input.habits.possible > 0
      ? clamp01(input.habits.completed / input.habits.possible)
      : null;
  const tasks =
    input.tasks && input.tasks.total > 0
      ? clamp01(input.tasks.done / input.tasks.total)
      : null;
  const velocity = input.velocity == null ? null : clamp01(input.velocity);
  const balance = clamp01(input.balance);

  const parts: { value: number; weight: number }[] = [
    { value: balance, weight: WEIGHTS.balance },
  ];
  if (habits != null) parts.push({ value: habits, weight: WEIGHTS.habits });
  if (velocity != null) parts.push({ value: velocity, weight: WEIGHTS.velocity });
  if (tasks != null) parts.push({ value: tasks, weight: WEIGHTS.tasks });

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const weighted = parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight;

  return {
    score: Math.round(1000 * clamp01(weighted)),
    breakdown: { habits, velocity, tasks, balance },
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
