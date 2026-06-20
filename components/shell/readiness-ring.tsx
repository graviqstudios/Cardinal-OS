"use client";

import * as React from "react";
import { animate, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * The signature object (BRAND §8): the logo as a live instrument. A ring fills
 * to score/1000 in the accent, the number sits inside in Instrument Serif, and
 * both reveal with a ~1.2s count-up (one-shot data viz, the sanctioned >250ms).
 */
export function ReadinessRing({
  score,
  previous,
  size = 56,
  showLabel = false,
  label = "Readiness",
}: {
  score: number;
  previous?: number | null;
  size?: number;
  showLabel?: boolean;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(reduce ? score : 0);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(score);
      return;
    }
    const controls = animate(0, score, {
      duration: 1.2,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, reduce]);

  const delta = previous == null ? null : score - previous;
  const stroke = Math.max(6, Math.round(size * 0.13));
  const fontSize = Math.round(size * 0.32);

  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          {delta != null && delta > 0 && (
            <p
              className="text-xs font-medium"
              style={{ color: "hsl(var(--module-calendar))" }}
            >
              up {delta} today
            </p>
          )}
        </div>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" width={size} height={size} fill="none">
          <circle cx="70" cy="70" r="60" stroke="var(--border)" strokeWidth={stroke} />
          <circle
            cx="70"
            cy="70"
            r="60"
            stroke="hsl(var(--primary))"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={1000}
            strokeDasharray={`${display} 1000`}
            transform="rotate(-90 70 70)"
            style={{ filter: "drop-shadow(0 0 5px hsl(var(--primary) / 0.45))" }}
          />
        </svg>
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center font-serif tabular-nums",
          )}
          style={{ fontSize }}
        >
          {display}
        </div>
      </div>
    </div>
  );
}
