"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { ReadinessRing } from "@/components/shell/readiness-ring";
import { Sparkline } from "@/components/readiness/sparkline";
import { Card, CardContent } from "@/components/ui/card";

/** The Life Score hero on Today: ring + label + trend + 14-day sparkline. */
export function LifeScoreHero({
  score,
  previous,
  history,
  hasData,
}: {
  score: number;
  previous: number | null;
  history: { day: string; score: number }[];
  hasData: boolean;
}) {
  const delta = previous == null ? null : score - previous;

  return (
    <Card data-tour="life-score">
      <CardContent className="flex items-center gap-5 p-6 sm:gap-7">
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
              Add a habit, a task, or a goal - your score grows as your days take shape.
            </p>
          )}
        </div>
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
