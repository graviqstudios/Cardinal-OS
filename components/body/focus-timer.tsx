"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2, Pause, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { logFocusSession } from "@/lib/body/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tap } from "@/components/motion/tap";

type Preset = { label: string; focus: number; brk: number };
const PRESETS: Preset[] = [
  { label: "25 / 5", focus: 25, brk: 5 },
  { label: "50 / 10", focus: 50, brk: 10 },
];
type Phase = "focus" | "reflect" | "break";
type LinkRef = { id: string; name: string };

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    o.start(); o.stop(ctx.currentTime + 1.15);
  } catch { /* audio not available */ }
}

export function FocusTimer({
  tasks = [],
  habits = [],
}: {
  tasks?: LinkRef[];
  habits?: LinkRef[];
}) {
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
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [link, setLink] = React.useState(""); // "task:<id>" | "habit:<id>" | ""
  const [zen, setZen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const wakeRef = React.useRef<{ release: () => Promise<void> } | null>(null);

  // Reset the clock only when the chosen focus length changes (not on pause).
  React.useEffect(() => {
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(focusMin * 60);
  }, [focusMin]);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  React.useEffect(() => {
    if (secondsLeft > 0 || !running) return;
    if (phase === "focus") {
      setRunning(false);
      chime();
      setPhase("reflect");
    } else if (phase === "break") {
      setRunning(false);
      setPhase("focus");
      setSecondsLeft(focusMin * 60);
    }
  }, [secondsLeft, phase, running, focusMin]);

  // Keep the screen awake while a focus block runs in zen mode.
  React.useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    async function manage() {
      try {
        if (zen && running && nav.wakeLock) {
          wakeRef.current = await nav.wakeLock.request("screen");
        } else if (wakeRef.current) {
          await wakeRef.current.release();
          wakeRef.current = null;
        }
      } catch { /* unsupported */ }
    }
    void manage();
  }, [zen, running]);

  async function enterZen() {
    setZen(true);
    try { await document.documentElement.requestFullscreen?.(); } catch { /* blocked */ }
  }
  async function exitZen() {
    setZen(false);
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* ignore */ }
  }

  const linkName = (() => {
    if (!link) return null;
    const [kind, id] = link.split(":");
    const list = kind === "task" ? tasks : habits;
    return list.find((x) => x.id === id)?.name ?? null;
  })();

  async function finishFocus() {
    const [kind, id] = link ? link.split(":") : [null, null];
    await logFocusSession({
      duration_minutes: focusMin,
      note: note.trim() || null,
      title: title.trim() || null,
      description: description.trim() || null,
      task_id: kind === "task" ? id : null,
      habit_id: kind === "habit" ? id : null,
    });
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

  const ring = (size: number) => (
    <div className="relative" style={{ width: size, height: size }}>
      {/* breathing pacer */}
      {running && phase === "focus" && (
        <div
          className="absolute inset-0 rounded-full motion-reduce:hidden"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)",
            animation: "co-breathe 8s ease-in-out infinite",
          }}
        />
      )}
      <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
        <circle cx="70" cy="70" r="60" stroke="hsl(var(--muted))" strokeWidth={size > 200 ? 5 : 8} />
        <circle
          cx="70" cy="70" r="60" stroke="hsl(var(--primary))" strokeWidth={size > 200 ? 5 : 8} strokeLinecap="round"
          pathLength={1000} strokeDasharray={`${Math.round(progress * 1000)} 1000`}
          transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray 1s linear", filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.4))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif tabular-nums leading-none" style={{ fontSize: size * 0.22 }}>{mmss(secondsLeft)}</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      </div>
    </div>
  );

  const controls = (
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
  );

  const setup = (
    <div className="w-full space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title (optional)" className="h-9 bg-surface" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you working on? (optional)" rows={2} className="resize-none bg-surface" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Link</span>
        <select value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link to a task or habit" className="h-9 flex-1 rounded-button border border-input bg-transparent px-2 text-sm">
          <option value="">Nothing — just focus</option>
          {tasks.length > 0 && (
            <optgroup label="Tasks">
              {tasks.map((t) => <option key={t.id} value={`task:${t.id}`}>{t.name}</option>)}
            </optgroup>
          )}
          {habits.length > 0 && (
            <optgroup label="Habits">
              {habits.map((h) => <option key={h.id} value={`habit:${h.id}`}>{h.name}</option>)}
            </optgroup>
          )}
        </select>
      </div>
    </div>
  );

  // ── Zen / full-screen mode ──────────────────────────────────────────────────
  if (zen) {
    const overlay = (
      <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-6 bg-background p-6">
        <button onClick={exitZen} aria-label="Exit focus mode" className="absolute right-5 top-5 text-muted-foreground hover:text-foreground">
          <Minimize2 className="h-5 w-5" />
        </button>
        {running && (title || linkName) && (
          <div className="text-center">
            {title && <p className="font-serif text-2xl">{title}</p>}
            {linkName && <p className="mt-1 text-sm text-muted-foreground">{linkName}</p>}
          </div>
        )}
        {ring(Math.min(360, typeof window !== "undefined" ? window.innerWidth - 80 : 360))}
        {phase === "reflect" ? (
          <div className="w-full max-w-sm space-y-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did that go?" className="bg-surface" />
            <Tap className="block"><Button className="w-full" onClick={finishFocus}>Save and break</Button></Tap>
          </div>
        ) : running ? (
          controls
        ) : (
          <div className="w-full max-w-sm space-y-4">
            {setup}
            <div className="flex justify-center">{controls}</div>
          </div>
        )}
      </div>
    );
    return mounted ? createPortal(overlay, document.body) : null;
  }

  // ── Compact card ────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-5">
        <div className="flex w-full items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Focus</p>
          <div className="flex items-center gap-1">
            {PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => { setCustom(false); setPresetIdx(i); }} aria-pressed={!custom && presetIdx === i}
                className={cn("rounded-pill border px-2 py-0.5 text-[11px] font-medium transition-colors", !custom && presetIdx === i ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground hover:bg-accent")}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setCustom(true)} aria-pressed={custom}
              className={cn("rounded-pill border px-2 py-0.5 text-[11px] font-medium transition-colors", custom ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground hover:bg-accent")}>⋯</button>
            <button onClick={enterZen} aria-label="Full screen focus" className="ml-1 text-muted-foreground hover:text-foreground"><Maximize2 className="h-4 w-4" /></button>
          </div>
        </div>

        {custom && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Input type="number" min={1} max={120} value={customFocus} onChange={(e) => setCustomFocus(Number(e.target.value) || 1)} className="h-8 w-16" />
            <span>min focus</span>
          </div>
        )}

        <div className="my-1">{ring(128)}</div>

        {phase === "reflect" ? (
          <div className="w-full space-y-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did that go?" className="h-9 bg-surface" />
            <Tap className="block"><Button size="sm" className="w-full" onClick={finishFocus}>Save and break</Button></Tap>
          </div>
        ) : (
          controls
        )}
      </CardContent>
    </Card>
  );
}
