"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { BellOff, Maximize2, Minimize2, Pause, Play, RotateCcw, Settings2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { logFocusSession } from "@/lib/body/actions";
import {
  FOCUS_SOUNDS,
  DEFAULT_SOUND,
  WHITE_NOISE,
  DEFAULT_NOISE,
  previewAlarm,
  scheduleAlarm,
  startAmbient,
} from "@/lib/focus/sounds";
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

/** Fresh AudioContext (guarded for older WebKit). */
function makeAudioContext(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new Ctx();
  } catch {
    return null;
  }
}

/** Play a short taste of the alarm ring, for the picker preview. */
function previewSound(id: string) {
  const ctx = makeAudioContext();
  if (!ctx) return;
  void ctx.resume();
  previewAlarm(ctx, id);
  window.setTimeout(() => { try { void ctx.close(); } catch { /* ignore */ } }, 2200);
}

/** Play a few seconds of an ambience, for the white-noise preview. */
function previewAmbient(id: string) {
  if (id === "none") return;
  const ctx = makeAudioContext();
  if (!ctx) return;
  void ctx.resume();
  const stop = startAmbient(ctx, id);
  window.setTimeout(() => {
    try { stop?.(); } catch { /* ignore */ }
    window.setTimeout(() => { try { void ctx.close(); } catch { /* ignore */ } }, 600);
  }, 3000);
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
  // Three independent sound channels, like the well-known Pomodoro apps.
  const [focusAlarm, setFocusAlarm] = React.useState(DEFAULT_SOUND);
  const [breakAlarm, setBreakAlarm] = React.useState(DEFAULT_SOUND);
  const [whiteNoise, setWhiteNoise] = React.useState(DEFAULT_NOISE);
  const [showSettings, setShowSettings] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    try {
      setFocusAlarm(localStorage.getItem("focus-alarm") || DEFAULT_SOUND);
      setBreakAlarm(localStorage.getItem("break-alarm") || DEFAULT_SOUND);
      setWhiteNoise(localStorage.getItem("focus-whitenoise") || DEFAULT_NOISE);
    } catch { /* ignore */ }
  }, []);

  const wakeRef = React.useRef<{ release: () => Promise<void> } | null>(null);

  // Absolute end timestamp - the countdown is derived from the wall clock, so it
  // stays accurate even when a background tab throttles our interval to a crawl.
  const endAtRef = React.useRef(0);
  // A dedicated AudioContext holding the *scheduled* end alarm plus any looping
  // white noise. Scheduling the alarm on the audio clock (at start) means it
  // fires on time even while the tab is backgrounded; the white noise keeps the
  // context alive so nothing gets suspended.
  const alarmRef = React.useRef<{ ctx: AudioContext; keepAlive: OscillatorNode; stopNoise?: (() => void) | null } | null>(null);
  // Latest choices without re-arming mid-run.
  const cfgRef = React.useRef({ focusAlarm, breakAlarm, whiteNoise });
  React.useEffect(() => { cfgRef.current = { focusAlarm, breakAlarm, whiteNoise }; }, [focusAlarm, breakAlarm, whiteNoise]);

  const disarmAlarm = React.useCallback(() => {
    const a = alarmRef.current;
    alarmRef.current = null;
    if (!a) return;
    try { a.stopNoise?.(); } catch { /* ignore */ }
    try { a.keepAlive.stop(); } catch { /* ignore */ }
    try { void a.ctx.close(); } catch { /* ignore */ }
  }, []);

  const armAlarm = React.useCallback((seconds: number, phase: Phase) => {
    disarmAlarm();
    const ctx = makeAudioContext();
    if (!ctx) return;
    void ctx.resume();
    const keepAlive = ctx.createOscillator();
    const kg = ctx.createGain();
    kg.gain.value = 0.0004; // inaudible; keeps the context from being suspended
    keepAlive.connect(kg); kg.connect(ctx.destination);
    keepAlive.start();
    // Ring loudly and repeatedly from the end time until the user stops it,
    // using the alarm for the phase that's ending.
    const alarm = phase === "break" ? cfgRef.current.breakAlarm : cfgRef.current.focusAlarm;
    scheduleAlarm(ctx, alarm, ctx.currentTime + Math.max(0, seconds));
    // White noise plays through the focus block only.
    const stopNoise = phase === "focus" ? startAmbient(ctx, cfgRef.current.whiteNoise) : null;
    alarmRef.current = { ctx, keepAlive, stopNoise };
  }, [disarmAlarm]);

  const [ringing, setRinging] = React.useState(false);
  const stopAlarm = React.useCallback(() => {
    disarmAlarm();
    setRinging(false);
  }, [disarmAlarm]);

  // Release the audio context on unmount.
  React.useEffect(() => disarmAlarm, [disarmAlarm]);

  // Reset the clock only when the chosen focus length changes (not on pause).
  React.useEffect(() => {
    setRunning(false);
    disarmAlarm();
    setPhase("focus");
    setSecondsLeft(focusMin * 60);
  }, [focusMin, disarmAlarm]);

  // While running, re-derive the remaining time from the end timestamp every
  // half-second, and immediately on returning to the tab.
  React.useEffect(() => {
    if (!running) return;
    const recompute = () =>
      setSecondsLeft(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
    const id = window.setInterval(recompute, 500);
    const onVisible = () => { if (!document.hidden) recompute(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [running]);

  React.useEffect(() => {
    if (secondsLeft > 0 || !running) return;
    // The alarm was scheduled at start and is now ringing (loudly, repeatedly) on
    // the audio clock. Leave it ringing until the user stops it - don't close the
    // context here. Fade the white noise out so only the alarm sounds.
    try { alarmRef.current?.stopNoise?.(); } catch { /* ignore */ }
    if (alarmRef.current) alarmRef.current.stopNoise = null;
    setRinging(true);
    if (phase === "focus") {
      setRunning(false);
      setPhase("reflect");
    } else if (phase === "break") {
      setRunning(false);
      setPhase("focus");
      setSecondsLeft(focusMin * 60);
    }
  }, [secondsLeft, phase, running, focusMin]);

  // Start/resume (arms the alarm within the click gesture) or pause.
  function toggleRun() {
    setRinging(false);
    setRunning((r) => {
      const next = !r;
      if (next) {
        endAtRef.current = Date.now() + secondsLeft * 1000;
        armAlarm(secondsLeft, phase);
      } else {
        disarmAlarm();
      }
      return next;
    });
  }

  function changeFocusAlarm(id: string) {
    setFocusAlarm(id);
    try { localStorage.setItem("focus-alarm", id); } catch { /* ignore */ }
    previewSound(id);
  }
  function changeBreakAlarm(id: string) {
    setBreakAlarm(id);
    try { localStorage.setItem("break-alarm", id); } catch { /* ignore */ }
    previewSound(id);
  }
  function changeWhiteNoise(id: string) {
    setWhiteNoise(id);
    try { localStorage.setItem("focus-whitenoise", id); } catch { /* ignore */ }
    previewAmbient(id);
  }

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
    stopAlarm();
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
    stopAlarm();
    setPhase("focus");
    setSecondsLeft(focusMin * 60);
    setNote("");
  }

  const total = (phase === "break" ? breakMin : focusMin) * 60;
  const progress = total > 0 ? 1 - secondsLeft / total : 0;
  const label = phase === "focus" ? "Focus" : phase === "break" ? "Break" : "Done";

  const ring = (size: number) => {
    const big = size > 200;
    const stroke = big ? 6 : 8;
    return (
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
        <circle cx="70" cy="70" r="60" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx="70" cy="70" r="60" stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round"
          pathLength={1000} strokeDasharray={`${Math.round(progress * 1000)} 1000`}
          transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray 1s linear", filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.4))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif tabular-nums leading-none" style={{ fontSize: size * 0.22 }}>{mmss(secondsLeft)}</div>
        <div className={cn("uppercase tracking-[0.16em] text-muted-foreground", big ? "mt-3 text-sm" : "mt-1 text-[10px]")}>{label}</div>
      </div>
    </div>
    );
  };

  const controls = (
    <div className="flex items-center gap-2">
      <Tap className="inline-flex">
        <Button onClick={toggleRun}>
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

  // Shown while the end alarm is ringing - the loud, obvious way to silence it.
  const stopButton = (
    <Tap className="block w-full">
      <Button
        onClick={stopAlarm}
        className="w-full animate-pulse bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        <BellOff className="h-4 w-4" />
        Stop alarm
      </Button>
    </Tap>
  );

  const setup = (
    <div className="w-full space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title (optional)" className="h-9 bg-surface" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you working on? (optional)" rows={2} className="resize-none bg-surface" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Link to Task</span>
        <select value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link to a task or habit" className="h-9 flex-1 rounded-button border border-input bg-transparent px-2 text-sm">
          <option value="">Nothing - just focus</option>
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
      <Tap className="block">
        <Button type="button" variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => setShowSettings(true)}>
          <Settings2 className="h-4 w-4" />
          Sounds - focus &amp; break alarm, white noise
        </Button>
      </Tap>
    </div>
  );

  const settingsModal = showSettings && mounted
    ? createPortal(
        <SoundSettings
          focusAlarm={focusAlarm}
          breakAlarm={breakAlarm}
          whiteNoise={whiteNoise}
          onFocusAlarm={changeFocusAlarm}
          onBreakAlarm={changeBreakAlarm}
          onWhiteNoise={changeWhiteNoise}
          onClose={() => setShowSettings(false)}
        />,
        document.body,
      )
    : null;

  // ── Zen / full-screen mode ──────────────────────────────────────────────────
  if (zen) {
    const zenSize = typeof window !== "undefined"
      ? Math.min(560, window.innerWidth - 96, window.innerHeight - 260)
      : 480;
    const overlay = (
      <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-10 bg-background p-8">
        <button onClick={exitZen} aria-label="Exit focus mode" className="absolute right-6 top-6 text-muted-foreground hover:text-foreground">
          <Minimize2 className="h-6 w-6" />
        </button>
        {running && (title || linkName) && (
          <div className="text-center">
            {title && <p className="font-serif text-4xl">{title}</p>}
            {linkName && <p className="mt-2 text-base text-muted-foreground">{linkName}</p>}
          </div>
        )}
        {ring(Math.max(320, zenSize))}
        {ringing && <div className="w-full max-w-sm">{stopButton}</div>}
        {phase === "reflect" ? (
          <div className="w-full max-w-sm space-y-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did that go?" className="bg-surface" />
            <Tap className="block"><Button className="w-full" onClick={finishFocus}>Save and break</Button></Tap>
          </div>
        ) : running ? (
          <div className="scale-125">{controls}</div>
        ) : (
          <div className="w-full max-w-sm space-y-4">
            {setup}
            <div className="flex justify-center">{controls}</div>
          </div>
        )}
      </div>
    );
    return mounted ? <>{createPortal(overlay, document.body)}{settingsModal}</> : null;
  }

  // ── Compact card ────────────────────────────────────────────────────────────
  return (
    <>
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

        {ringing && <div className="w-full">{stopButton}</div>}

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
    {settingsModal}
    </>
  );
}

/* ── Sound settings modal (focus alarm · break alarm · white noise) ────────── */
function SoundSettings({
  focusAlarm,
  breakAlarm,
  whiteNoise,
  onFocusAlarm,
  onBreakAlarm,
  onWhiteNoise,
  onClose,
}: {
  focusAlarm: string;
  breakAlarm: string;
  whiteNoise: string;
  onFocusAlarm: (id: string) => void;
  onBreakAlarm: (id: string) => void;
  onWhiteNoise: (id: string) => void;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-card border bg-card p-6 shadow-xl sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl">Focus sounds</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <SoundGroup title="Focus alarm" hint="Rings loudly when a focus block ends." options={FOCUS_SOUNDS} value={focusAlarm} onPick={onFocusAlarm} />
        <SoundGroup title="Break alarm" hint="Rings when a break ends." options={FOCUS_SOUNDS} value={breakAlarm} onPick={onBreakAlarm} />
        <SoundGroup title="White noise" hint="Plays quietly through your focus block." options={WHITE_NOISE} value={whiteNoise} onPick={onWhiteNoise} />

        <p className="mt-2 text-[11px] text-muted-foreground">Tap any option to hear a preview. Choices are saved on this device.</p>
      </div>
    </div>
  );
}

function SoundGroup({
  title,
  hint,
  options,
  value,
  onPick,
}: {
  title: string;
  hint: string;
  options: { id: string; label: string }[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-medium">{title}</p>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            aria-pressed={value === o.id}
            className={cn(
              "flex items-center gap-2 rounded-button border px-3 py-2 text-left text-sm transition-colors",
              value === o.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                value === o.id ? "bg-primary" : "bg-muted-foreground/30",
              )}
            />
            <span className="truncate">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
