"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function WeeklyReview() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Surface this more warmly on Sundays, when a week has just closed.
  const isSunday = new Date().getDay() === 0;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/journal/weekly-review", { method: "POST" });
      if (!res.ok) {
        setError("Couldn't write your review just now. Please try again.");
      } else {
        router.refresh(); // the new weekly entry appears in the list below
      }
    } catch {
      setError("Couldn't write your review just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cn(isSunday && "ring-1 ring-primary/30")}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "hsl(var(--accent) / 0.12)", color: "hsl(var(--accent))" }}
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {isSunday ? "Your week, gently reviewed" : "Reflect on this week"}
            </p>
            <p className="text-sm text-muted-foreground">
              Cardinal reads your week - habits, tasks and reflections - and writes a calm summary.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
        <Tap className="inline-flex">
          <Button onClick={generate} disabled={busy} variant={isSunday ? "default" : "secondary"}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Writing…" : "Write my weekly review"}
          </Button>
        </Tap>
      </CardContent>
    </Card>
  );
}
