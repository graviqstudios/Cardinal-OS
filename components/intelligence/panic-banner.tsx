import { Target } from "lucide-react";

import type { PanicState } from "@/lib/intelligence/panic";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Focus-plan banner. Calmly surfaces a prioritised plan when the exam is near
 * and readiness is low — supportive framing, a priority list, and a short
 * day-by-day plan. No alarming language (no "panic"/"sprint" in the UI).
 */
export function PanicBanner({ panic }: { panic: PanicState }) {
  if (!panic.triggered) return null;

  return (
    <Card
      className="border-2"
      style={{
        borderColor: "hsl(var(--status-weak) / 0.7)",
        backgroundColor: "hsl(var(--status-weak) / 0.06)",
      }}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "hsl(var(--status-weak) / 0.15)", color: "hsl(var(--status-weak))" }}
          >
            <Target className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold">Your focus plan</p>
            <p className="text-sm text-muted-foreground">{panic.text}</p>
          </div>
        </div>

        {panic.triage.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {panic.triage.map((t) => (
              <span
                key={t}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: "hsl(var(--status-weak) / 0.12)", color: "hsl(var(--status-weak))" }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {panic.plan.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {panic.plan.map((d) => (
              <div key={d.label} className="rounded-lg border bg-background/60 p-2.5">
                <p className="text-xs font-semibold">{d.label}</p>
                <ul className="mt-1 space-y-0.5">
                  {d.topics.map((t) => (
                    <li key={t} className="truncate text-xs text-muted-foreground">• {t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
