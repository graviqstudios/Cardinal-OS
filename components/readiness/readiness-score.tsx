"use client";

import * as React from "react";
import { animate, useReducedMotion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Sparkline } from "@/components/readiness/sparkline";

/**
 * Hero Readiness Score (0–1000) with a count-up tween on change and a trend
 * arrow vs the previous snapshot. The count-up is the one deliberate motion
 * exception to the ≤250ms budget (the project doc calls it out specifically);
 * it falls back to an instant set under prefers-reduced-motion.
 */
export function ReadinessScore({
  score,
  previous,
  history,
}: {
  score: number;
  previous: number | null;
  history: { day: string; score: number }[];
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(reduce ? score : 0);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(score);
      return;
    }
    const controls = animate(0, score, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, reduce]);

  const delta = previous == null ? null : score - previous;

  return (
    <div className="flex items-center gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Readiness Score</p>
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl"
            style={{ color: "hsl(var(--module-readiness))" }}
          >
            {display}
          </span>
          <span className="text-sm text-muted-foreground">/ 1000</span>
        </div>
        <Trend delta={delta} />
      </div>
      <div className="ml-auto hidden sm:block">
        <Sparkline data={history.map((h) => h.score)} />
      </div>
    </div>
  );
}

function Trend({ delta }: { delta: number | null }) {
  if (delta == null) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Your daily preparedness signal.
      </p>
    );
  }
  if (delta === 0) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> No change since last check
      </p>
    );
  }
  const up = delta > 0;
  return (
    <p
      className="mt-1 flex items-center gap-1 text-xs font-medium"
      style={{
        color: up ? "hsl(var(--status-strong))" : "hsl(var(--status-untouched))",
      }}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {delta} since last check
    </p>
  );
}
