export type PracticePoint = {
  score: number | null;
  max_score: number | null;
  created_at: string;
};

type Bucket = { id: string; label: string; range: string; from: number; to: number };

// Hour-of-day buckets (local time).
const BUCKETS: Bucket[] = [
  { id: "morning", label: "morning", range: "5am–12pm", from: 5, to: 11 },
  { id: "afternoon", label: "afternoon", range: "12–5pm", from: 12, to: 16 },
  { id: "evening", label: "evening", range: "5–10pm", from: 17, to: 21 },
  { id: "night", label: "late night", range: "10pm–5am", from: 22, to: 4 },
];

function bucketFor(hour: number): Bucket {
  return (
    BUCKETS.find((b) =>
      b.from <= b.to ? hour >= b.from && hour <= b.to : hour >= b.from || hour <= b.to,
    ) ?? BUCKETS[0]
  );
}

function frac(p: PracticePoint): number | null {
  return p.score != null && p.max_score ? p.score / p.max_score : null;
}

export type TimingInsight = { hasInsight: boolean; text?: string };

/**
 * "We noticed" timing insight: which part of the day the student performs best.
 * Surfaces only with enough data spanning enough days (avoids noise). Never uses
 * the phrase "cognitive fingerprint" — just "we noticed".
 */
export function computeTimingInsight(points: PracticePoint[]): TimingInsight {
  const valid = points.filter((p) => frac(p) != null);
  if (valid.length < 8) return { hasInsight: false };

  const times = valid.map((p) => new Date(p.created_at).getTime());
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
  if (spanDays < 10) return { hasInsight: false };

  const agg = new Map<string, { sum: number; n: number; b: Bucket }>();
  let overall = 0;
  for (const p of valid) {
    const f = frac(p)!;
    overall += f;
    const b = bucketFor(new Date(p.created_at).getHours());
    const e = agg.get(b.id) ?? { sum: 0, n: 0, b };
    e.sum += f;
    e.n += 1;
    agg.set(b.id, e);
  }
  const overallAvg = overall / valid.length;

  let best: { avg: number; b: Bucket } | null = null;
  for (const e of agg.values()) {
    if (e.n < 3) continue;
    const avg = e.sum / e.n;
    if (!best || avg > best.avg) best = { avg, b: e.b };
  }
  if (!best || overallAvg <= 0) return { hasInsight: false };

  const pct = Math.round(((best.avg - overallAvg) / overallAvg) * 100);
  if (pct < 12) return { hasInsight: false }; // not a meaningful difference

  return {
    hasInsight: true,
    text: `We noticed your scores are about ${pct}% higher in the ${best.b.label} (${best.b.range}). Studying your hard topics then tends to pay off.`,
  };
}
