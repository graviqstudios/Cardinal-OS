import { ReadinessRing } from "@/components/shell/readiness-ring";

/**
 * Persistent header (BRAND §8): the readiness ring lives at the top of every
 * in-app screen. Sticky on desktop; on mobile it sits above the page content
 * (the sidebar's own top bar holds the menu there).
 */
export function AppHeader({
  score,
  previous,
}: {
  score: number;
  previous: number | null;
}) {
  return (
    <div className="z-20 flex h-16 items-center justify-end gap-3 border-b border-border bg-background/55 px-4 backdrop-blur-xl md:sticky md:top-0 md:px-8">
      <ReadinessRing score={score} previous={previous} size={46} showLabel label="Life Score" />
    </div>
  );
}
