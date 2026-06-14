import type { TopicStatus } from "@/lib/study/types";

export type MockExam = {
  id: string;
  label: string;
  score: number;
  max_score: number;
  taken_at: string;
};

export type Prediction = {
  hasProjection: boolean;
  lowMarks?: number;
  highMarks?: number;
  maxRef?: number;
  text?: string;
};

/**
 * Predictive score: after 3+ mocks, project a range from the recent trend, and
 * point at the single weakest topic with an estimate of recoverable marks.
 */
export function computePredictive(
  mocks: MockExam[],
  topics: { name: string; status: TopicStatus }[],
): Prediction {
  if (mocks.length < 3) return { hasProjection: false };

  const sorted = [...mocks].sort((a, b) => +new Date(a.taken_at) - +new Date(b.taken_at));
  const fracs = sorted.map((m) => m.score / m.max_score);
  const maxRef = sorted[sorted.length - 1].max_score;

  // Least-squares trend over index, predict one step ahead.
  const n = fracs.length;
  const xs = fracs.map((_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = fracs.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (fracs[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  const predicted = clamp01(intercept + slope * n);

  // Spread from residual RMSE.
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const fit = intercept + slope * xs[i];
    sse += (fracs[i] - fit) ** 2;
  }
  const rmse = Math.sqrt(sse / n);
  const low = clamp01(predicted - rmse);
  const high = clamp01(predicted + rmse);

  const lowMarks = Math.round(low * maxRef);
  const highMarks = Math.round(high * maxRef);

  // Recoverable: weakest topic + rough marks estimate.
  const weak = topics.find((t) => t.status === "weak") ?? topics.find((t) => t.status === "untouched");
  const gain = Math.max(2, Math.round(maxRef * 0.05));
  const recoverable = weak
    ? ` Fixing ${weak.name} alone could add roughly ${gain} marks.`
    : "";

  return {
    hasProjection: true,
    lowMarks,
    highMarks,
    maxRef,
    text: `Based on your last ${n} mocks, you're projecting ${lowMarks}–${highMarks} out of ${maxRef}.${recoverable}`,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
