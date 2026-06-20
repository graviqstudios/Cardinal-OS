"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import type { LifeScoreBreakdown } from "@/lib/life-score/algorithm";
import { ReadinessRing } from "@/components/shell/readiness-ring";
import { Sparkline } from "@/components/readiness/sparkline";
import { Card, CardContent } from "@/components/ui/card";

const FACTORS: { key: keyof LifeScoreBreakdown; label: string; weight: number }[] = [
  { key: "habits", label: "Habits", weight: 30 },
  { key: "velocity", label: "Goal velocity", weight: 30 },
  { key: "tasks", label: "Task follow-through", weight: 25 },
  { key: "balance", label: "Life balance", weight: 15 },
];

/** The Life Score hero on Today: ring + trend + sparkline + factor breakdown. */
export function LifeScoreHero({
  score,
  previous,
  history,
  hasData,
  breakdown,
}: {
  score: number;
  previous: number | null;
  history: { day: string; score: number }[];
  hasData: boolean;
  breakdown: LifeScoreBreakdown | null;
}) {
  const delta = previous == null ? null : score - previous;

  // The strongest contributing factor, for a one-line read.
  const top = breakdown
    ? FACTORS.map((f) => ({ ...f, v: breakdown[f.key] }))
        .filter((f): f is typeof f & { v: number } => typeof f.v === "number")
        .sort((a, b) => b.v - a.v)[0]
    : undefined;

  return (
    <Card data-tour="life-score" className="h-full">
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-center gap-5 sm:gap-7">
          <ReadinessRing score={score} previous={previous} size={108} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Life Score
            </p>
            {hasData ? (
              <>
                <Trend delta={delta} />
                <div className="mt-2">
                  <Sparkline data={history.map((h) => h.score)} width={180} height={42} />
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Add a habit, a task, or a goal — your score grows as your days take shape.
              </p>
            )}
          </div>
        </div>

        {hasData && breakdown && (
          <div className="mt-auto space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                What&apos;s shaping it
              </p>
              {top && (
                <p className="text-xs text-muted-foreground">
                  {top.label} {top.v >= 0.5 ? "is carrying it" : "has the most room"}
                </p>
              )}
            </div>
            <div className="space-y-2.5">
              {FACTORS.map((f) => {
                const v = breakdown[f.key];
                return (
                  <div key={f.key} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-[13px] text-foreground/80">{f.label}</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-pill bg-muted">
                      {v != null && (
                        <div
                          className="h-full rounded-pill bg-primary transition-[width] duration-500"
                          style={{ width: `${Math.round(v * 100)}%` }}
                        />
                      )}
                    </div>
                    <div className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {v == null ? "—" : `${Math.round(v * 100)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Trend({ delta }: { delta: number | null }) {
  if (delta == null)
    return <p className="mt-1 text-sm text-muted-foreground">Your one number to orient by.</p>;
  if (delta === 0)
    return (
      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        <Minus className="h-3.5 w-3.5" /> Steady since yesterday
      </p>
    );
  const up = delta > 0;
  // Anti-anxiety: a drop is muted, never alarm-red.
  return (
    <p
      className="mt-1 flex items-center gap-1 text-sm font-medium"
      style={{ color: up ? "hsl(var(--module-calendar))" : "hsl(var(--muted-foreground))" }}
    >
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? `up ${delta}` : `down ${Math.abs(delta)}`} since yesterday
    </p>
  );
}
