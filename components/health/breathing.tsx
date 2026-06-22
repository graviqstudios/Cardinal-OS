"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wind } from "lucide-react";

import { cn } from "@/lib/utils";
import { logMindfulness } from "@/lib/body/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

const DURATIONS = [2, 5, 10];
// A calm 4-in / 6-out pace (10s per breath). Phase labels track the cycle.
const IN = 4;
const OUT = 6;
const CYCLE = IN + OUT;

export function Breathing({ todayMinutes }: { todayMinutes: number }) {
  const router = useRouter();
  const [minutes, setMinutes] = React.useState(5);
  const [running, setRunning] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(5 * 60);
  const [phase, setPhase] = React.useState<"in" | "out">("in");

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Drive the in/out label from the elapsed position in the breath cycle.
  React.useEffect(() => {
    if (!running) return;
    const elapsed = minutes * 60 - secondsLeft;
    setPhase(elapsed % CYCLE < IN ? "in" : "out");
  }, [running, secondsLeft, minutes]);

  // Finished: log the minutes once and reset.
  React.useEffect(() => {
    if (!running || secondsLeft > 0) return;
    setRunning(false);
    void (async () => {
      await logMindfulness(minutes);
      router.refresh();
    })();
  }, [running, secondsLeft, minutes, router]);

  function begin() {
    setSecondsLeft(minutes * 60);
    setPhase("in");
    setRunning(true);
  }
  function stop() {
    // Credit the minutes actually completed.
    const done = Math.round((minutes * 60 - secondsLeft) / 60);
    setRunning(false);
    if (done >= 1) {
      void (async () => {
        await logMindfulness(done);
        router.refresh();
      })();
    }
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col items-center gap-4 p-6">
        <div className="flex w-full items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Mindfulness
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wind className="h-3.5 w-3.5" />
            {todayMinutes > 0 ? `${todayMinutes} min today` : "Breathe a moment"}
          </span>
        </div>

        <div className="relative flex h-44 w-44 items-center justify-center">
          <div
            className="absolute inset-3 rounded-full motion-reduce:!scale-100"
            style={{
              background: "radial-gradient(circle, hsl(var(--module-readiness) / 0.22), hsl(var(--module-readiness) / 0.04) 70%)",
              border: "1px solid hsl(var(--module-readiness) / 0.25)",
              transition: `transform ${running ? (phase === "in" ? IN : OUT) : 0.6}s cubic-bezier(0.2,0,0,1)`,
              transform: running ? (phase === "in" ? "scale(1.18)" : "scale(0.82)") : "scale(1)",
            }}
          />
          <div className="relative text-center">
            {running ? (
              <>
                <p className="font-serif text-lg lowercase tracking-wide text-foreground/90">
                  breathe {phase}
                </p>
                <p className="mt-1 font-serif text-3xl tabular-nums">
                  {mm}:{String(ss).padStart(2, "0")}
                </p>
              </>
            ) : (
              <p className="px-6 text-sm text-muted-foreground">A few slow breaths to settle.</p>
            )}
          </div>
        </div>

        {running ? (
          <Tap className="inline-flex">
            <Button variant="ghost" onClick={stop}>End session</Button>
          </Tap>
        ) : (
          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex items-center gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setMinutes(d)}
                  aria-pressed={minutes === d}
                  className={cn(
                    "rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
                    minutes === d
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input text-muted-foreground hover:bg-accent",
                  )}
                >
                  {d} min
                </button>
              ))}
            </div>
            <Tap className="inline-flex">
              <Button onClick={begin}>Begin</Button>
            </Tap>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
