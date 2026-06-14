import { Lightbulb, HeartPulse } from "lucide-react";

import type { TimingInsight } from "@/lib/intelligence/cognitive";
import type { BurnoutSignal } from "@/lib/intelligence/burnout";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Surfaces the "we noticed" timing insight and/or a gentle burnout nudge.
 * Renders nothing when there's neither — no empty state, no noise.
 */
export function InsightCard({
  timing,
  burnout,
}: {
  timing: TimingInsight;
  burnout: BurnoutSignal;
}) {
  if (!timing.hasInsight && !burnout.triggered) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {timing.hasInsight && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "hsl(var(--module-readiness) / 0.12)", color: "hsl(var(--module-readiness))" }}
            >
              <Lightbulb className="h-4 w-4" />
            </span>
            <p className="text-sm">{timing.text}</p>
          </CardContent>
        </Card>
      )}
      {burnout.triggered && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "hsl(var(--module-calendar) / 0.12)", color: "hsl(var(--module-calendar))" }}
            >
              <HeartPulse className="h-4 w-4" />
            </span>
            <p className="text-sm">{burnout.text}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
