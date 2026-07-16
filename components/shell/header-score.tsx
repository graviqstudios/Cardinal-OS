import { getLifeScoreSnapshot } from "@/lib/life-score/service";
import { ReadinessRing } from "@/components/shell/readiness-ring";

/**
 * The header's Life Score, isolated so it can stream.
 *
 * Computing the score is a ~10-query round trip. Awaiting it in the layout
 * blocked *every* navigation behind it; rendered inside a Suspense boundary
 * instead, the page ships immediately and the ring fills in when ready.
 */
export async function HeaderScore() {
  const life = await getLifeScoreSnapshot();
  return (
    <ReadinessRing
      score={life?.score ?? 0}
      previous={life?.previous ?? null}
      size={46}
      showLabel
      label="Life Score"
    />
  );
}

/** Same footprint as the ring, so streaming in causes no layout shift. */
export function HeaderScoreSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <div className="h-[46px] w-[46px] animate-pulse rounded-full bg-muted" />
      <div className="hidden h-3 w-16 animate-pulse rounded bg-muted sm:block" />
    </div>
  );
}
