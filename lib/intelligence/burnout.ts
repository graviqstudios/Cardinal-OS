import type { PracticePoint } from "@/lib/intelligence/cognitive";

export type BurnoutSignal = { triggered: boolean; text?: string };

function frac(p: PracticePoint): number | null {
  return p.score != null && p.max_score ? p.score / p.max_score : null;
}

/**
 * Gentle burnout detection: declining performance despite sustained effort.
 * Compares the last 7 days to the prior 7. Intentionally conservative.
 */
export function computeBurnout(points: PracticePoint[]): BurnoutSignal {
  const now = Date.now();
  const recent: number[] = [];
  const prior: number[] = [];

  for (const p of points) {
    const f = frac(p);
    if (f == null) continue;
    const ageDays = (now - new Date(p.created_at).getTime()) / 86_400_000;
    if (ageDays <= 7) recent.push(f);
    else if (ageDays <= 14) prior.push(f);
  }

  if (recent.length < 4 || prior.length < 3) return { triggered: false };

  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const recentAvg = avg(recent);
  const priorAvg = avg(prior);

  // Sustained/increased effort but a meaningful dip in performance.
  const sustainedEffort = recent.length >= prior.length;
  const declined = recentAvg < priorAvg - 0.08;

  if (sustainedEffort && declined) {
    return {
      triggered: true,
      text: "Your scores have dipped a little even though you're putting in the hours. Tomorrow, keep it light - two hours max, no new topics, just revise what you already know.",
    };
  }
  return { triggered: false };
}
