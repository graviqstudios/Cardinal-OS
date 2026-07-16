import { Suspense } from "react";

import { HeaderScore, HeaderScoreSkeleton } from "@/components/shell/header-score";

/**
 * Persistent header (BRAND §8): the readiness ring lives at the top of every
 * in-app screen. Sticky on desktop; on mobile it sits above the page content
 * (the sidebar's own top bar holds the menu there).
 *
 * The score streams inside a Suspense boundary so the page never waits on it.
 */
export function AppHeader() {
  return (
    <div className="z-20 flex h-16 items-center justify-end gap-3 border-b border-border bg-background/55 px-4 backdrop-blur-xl md:sticky md:top-0 md:px-8">
      <Suspense fallback={<HeaderScoreSkeleton />}>
        <HeaderScore />
      </Suspense>
    </div>
  );
}
