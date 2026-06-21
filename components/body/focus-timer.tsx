"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { logFocusSession } from "@/lib/body/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tap } from "@/components/motion/tap";

type Preset = { label: string; focus: number; brk: number };
const PRESETS: Preset[] = [
  { label: "25 / 5", focus: 25, brk: 5 },
  { label: "50 / 10", focus: 50, brk: 10 },
];

type Phase = "focus" | "reflect" | "break";

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer() {
  const router = useRouter();
  const [presetIdx, setPresetIdx] = React.useState(0);
  const [customFocus, setCustomFocus] = React.useState(30);
  const [custom, setCustom] = React.useState(false);

  const focusMin = custom ? Math.max(1, customFocus) : PRESETS[presetIdx].focus;
  const breakMin = custom ? Math.max(1, Math.round(customFocus / 5)) : PRESETS[presetIdx].brk;

  const [phase, setPhase] = React.useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = React.useState(focusMin * 60);
  const [running, setRunning] = React.useState(false);
  const [note, setNote] = React.useState("");

  // Reset the clock ONLY when the chosen focus length changes (not on pause).
  React.useEffect(() => {
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(focusMin * 60);
  }, [focusMin]);

  // Tick.
  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Phase transitions at zero.
  React.useEffect(() => {
    if (secondsLeft > 0 || !running) return;
    if (phase === "focus") {
      setRunning(false);
      setPhase("reflect");
    } else if (phase === "break") {
      setRunning(false);
      setPhase("focus");
      setSecondsLeft(focusMin * 60);
    }
  }, [secondsLeft, phase, running, focusMin]);

  async function finishFocus() {
    await logFocusSession({ duration_minutes: focusMin, note: note.trim() || null });
    setNote("");
    setPhase("break");
    setSecondsLeft(breakMin * 60);
    router.refresh();
  }

  function reset() {
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(focusMin * 60);
    setNote("");
  }

  const total = (phase === "break" ? breakMin : focusMin) * 60;
  const progress = total > 0 ? 1 - secondsLeft / total : 0;
  const label = phase === "focus" ? "Focus" : phase === "break" ? "Break" : "Done";

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-5">
        <div className="flex w-full items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Focus
          </p>
          <div className="flex items-center gap-1">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => { setCustom(false); setPresetIdx(i); }}
                aria-pressed={!custom && presetIdx === i}
                className={cn(
                  "rounded-pill border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  !custom && presetIdx === i
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-input text-muted-foreground hover:bg-accent",
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setCustom(true)}
              aria-pressed={custom}
              className={cn(
                "rounded-pill border px-2 py-0.5 text-[11px] font-medium transition-colors",
                custom ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground hover:bg-accent",
              )}
            >
              ⋯
            </button>
          </div>
        </div>

        {custom && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Input
              type="number" min={1} max={120} value={customFocus}
              onChange={(e) => setCustomFocus(Number(e.target.value) || 1)}
              className="h-8 w-16"
            />
            <span>min focus</span>
          </div>
        )}

        <div className="relative my-1 h-32 w-32">
          <svg width={128} height={128} viewBox="0 0 140 140" fill="none">
            <circle cx="70" cy="70" r="60" stroke="hsl(var(--muted))" strokeWidth={8} />
            <circle
              cx="70" cy="70" r="60" stroke="hsl(var(--primary))" strokeWidth={8} strokeLinecap="round"
              pathLength={1000} strokeDasharray={`${Math.round(progress * 1000)} 1000`}
              transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-serif text-2xl tabular-nums leading-none">{mmss(secondsLeft)}</div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          </div>
        </div>

        {phase === "reflect" ? (
          <div className="w-full space-y-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did that go?" className="h-9 bg-surface" />
            <Tap className="block">
              <Button size="sm" className="w-full" onClick={finishFocus}>Save and break</Button>
            </Tap>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Tap className="inline-flex">
              <Button onClick={() => setRunning((r) => !r)}>
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? "Pause" : secondsLeft < total ? "Resume" : "Start"}
              </Button>
            </Tap>
            <Tap className="inline-flex">
              <Button size="icon" variant="ghost" aria-label="Reset" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </Tap>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
