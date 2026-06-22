"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Droplet, Loader2, Minus, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addWater,
  deleteNutrition,
  deletePeriodDay,
  deleteWorkout,
  logNutrition,
  logWorkout,
  saveMetric,
  savePeriodDay,
} from "@/lib/body/actions";
import {
  GLASS_ML,
  HYDRATION_GOAL_ML,
  PERIOD_FLOWS,
  PERIOD_SYMPTOMS,
  WORKOUT_TYPES,
  type BodyOverview,
  type NutritionLog,
  type PeriodFlow,
  type PeriodLog,
  type WorkoutLog,
  type WorkoutType,
} from "@/lib/body/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkline } from "@/components/readiness/sparkline";
import { Tap } from "@/components/motion/tap";
import { Breathing } from "@/components/health/breathing";

const ENERGY = ["Drained", "Low", "Okay", "Good", "Strong"];
const MOOD = ["Low", "Meh", "Okay", "Good", "Great"];
const STRESS = ["Calm", "Easy", "Some", "High", "Peak"];
const LBS_PER_KG = 2.2046226218;

export function HealthClient({ overview }: { overview: BodyOverview }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Trends overview={overview} className="lg:col-span-2" />
      <CheckIn today={overview.today} />
      <Hydration today={overview.today} />
      <Breathing todayMinutes={overview.today?.mindfulness_minutes ?? 0} />
      <Nutrition meals={overview.nutritionToday} />
      {overview.cycleEnabled && overview.cycle && (
        <Cycle cycle={overview.cycle} logs={overview.periodLogs} className="lg:col-span-2" />
      )}
      <Workouts workouts={overview.workouts} className="lg:col-span-2" />
    </div>
  );
}

/* ── shared rating dots (energy / mood / stress) ─────────────────────────── */
function RatingDots({
  value,
  labels,
  onPick,
}: {
  value: number | null;
  labels: string[];
  onPick: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const v = i + 1;
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={on}
            onClick={() => onPick(on ? null : v)}
            className={cn(
              "h-4 w-4 rounded-pill border transition-transform hover:scale-110",
              on ? "border-foreground" : "border-input",
            )}
            style={{
              backgroundColor: on ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)",
            }}
          />
        );
      })}
    </div>
  );
}

/* ── daily check-in ──────────────────────────────────────────────────────── */
function CheckIn({ today }: { today: BodyOverview["today"] }) {
  const router = useRouter();
  const [sleep, setSleep] = React.useState(today?.sleep_hours?.toString() ?? "");
  const [energy, setEnergy] = React.useState<number | null>(today?.energy_level ?? null);
  const [mood, setMood] = React.useState<number | null>(today?.mood_level ?? null);
  const [stress, setStress] = React.useState<number | null>(today?.stress_level ?? null);
  const [unit, setUnit] = React.useState<"kg" | "lbs">("kg");
  const [weight, setWeight] = React.useState(today?.weight_kg?.toString() ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const u = localStorage.getItem("bodyUnit");
    if (u === "lbs") {
      setUnit("lbs");
      if (today?.weight_kg != null) setWeight((today.weight_kg * LBS_PER_KG).toFixed(1));
    }
  }, [today?.weight_kg]);

  function switchUnit(next: "kg" | "lbs") {
    if (next === unit) return;
    const v = parseFloat(weight);
    if (!Number.isNaN(v)) {
      setWeight(next === "lbs" ? (v * LBS_PER_KG).toFixed(1) : (v / LBS_PER_KG).toFixed(1));
    }
    setUnit(next);
    localStorage.setItem("bodyUnit", next);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const w = weight ? Number(weight) : null;
    const res = await saveMetric({
      sleep_hours: sleep ? Math.max(0, Number(sleep)) : null,
      weight_kg: w == null ? null : Math.max(0, unit === "lbs" ? w / LBS_PER_KG : w),
      energy_level: energy,
      mood_level: mood,
      stress_level: stress,
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Today&apos;s check-in
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-sm text-muted-foreground">Sleep (hrs)</span>
            <Input type="number" step="any" min={0} max={24} value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7.5" className="bg-surface" />
          </label>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Weight</span>
              <div className="flex items-center gap-1">
                {(["kg", "lbs"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => switchUnit(u)}
                    className={cn(
                      "rounded-pill border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                      unit === u ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <Input type="number" step="any" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" className="bg-surface" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Energy</span>
            <span className="text-xs text-muted-foreground">{energy ? ENERGY[energy - 1] : ""}</span>
          </div>
          <RatingDots value={energy} labels={ENERGY} onPick={setEnergy} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Mood</span>
            <span className="text-xs text-muted-foreground">{mood ? MOOD[mood - 1] : ""}</span>
          </div>
          <RatingDots value={mood} labels={MOOD} onPick={setMood} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stress</span>
            <span className="text-xs text-muted-foreground">{stress ? STRESS[stress - 1] : ""}</span>
          </div>
          <RatingDots value={stress} labels={STRESS} onPick={setStress} />
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 pt-1">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Tap className="inline-flex">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </Tap>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── hydration ───────────────────────────────────────────────────────────── */
function Hydration({ today }: { today: BodyOverview["today"] }) {
  const router = useRouter();
  const [ml, setMl] = React.useState(today?.water_ml ?? 0);
  const [, start] = React.useTransition();

  React.useEffect(() => setMl(today?.water_ml ?? 0), [today?.water_ml]);

  function bump(delta: number) {
    setMl((m) => Math.max(0, m + delta)); // optimistic
    start(async () => {
      await addWater(delta);
      router.refresh();
    });
  }

  const glasses = Math.round(ml / GLASS_ML);
  const goalGlasses = Math.round(HYDRATION_GOAL_ML / GLASS_ML);
  const progress = Math.min(1, ml / HYDRATION_GOAL_ML);
  const size = 132;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col items-center gap-4 p-6">
        <div className="flex w-full items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Hydration
          </p>
          <span className="text-xs text-muted-foreground">{(ml / 1000).toFixed(2)}L of {(HYDRATION_GOAL_ML / 1000).toFixed(1)}L</span>
        </div>

        <div className="relative my-1" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
            <circle cx="70" cy="70" r="60" stroke="hsl(var(--muted))" strokeWidth={8} />
            <circle
              cx="70" cy="70" r="60" stroke="hsl(var(--module-calendar))" strokeWidth={8} strokeLinecap="round"
              pathLength={1000} strokeDasharray={`${Math.round(progress * 1000)} 1000`}
              transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray .5s cubic-bezier(0.2,0,0,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplet className="h-5 w-5" style={{ color: "hsl(var(--module-calendar))" }} />
            <div className="mt-1 font-serif text-2xl tabular-nums leading-none">{glasses}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">of {goalGlasses} glasses</div>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2">
          <Tap className="inline-flex">
            <Button size="icon" variant="ghost" aria-label="Remove a glass" onClick={() => bump(-GLASS_ML)} disabled={ml <= 0}>
              <Minus className="h-4 w-4" />
            </Button>
          </Tap>
          <Tap className="inline-flex">
            <Button onClick={() => bump(GLASS_ML)}>
              <Plus className="h-4 w-4" /> Glass
            </Button>
          </Tap>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── nutrition ───────────────────────────────────────────────────────────── */
const QUALITY = ["Heavy", "Meh", "Okay", "Good", "Clean"];

function Nutrition({ meals }: { meals: NutritionLog[] }) {
  const router = useRouter();
  const [label, setLabel] = React.useState("");
  const [quality, setQuality] = React.useState<number | null>(null);
  const [calories, setCalories] = React.useState("");
  const [, start] = React.useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    const payload = { label, quality, calories: calories ? Number(calories) : null };
    setLabel(""); setQuality(null); setCalories("");
    start(async () => {
      await logNutrition(payload);
      router.refresh();
    });
  }

  const totalCals = meals.reduce((s, m) => s + (m.calories ?? 0), 0);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nutrition</p>
          {totalCals > 0 && <span className="text-xs text-muted-foreground">{totalCals} kcal today</span>}
        </div>

        <form onSubmit={add} className="space-y-2">
          <div className="flex gap-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What did you eat?" className="flex-1 bg-surface" />
            <Input type="number" min={0} value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="kcal" className="w-20 bg-surface" />
          </div>
          <div className="flex items-center justify-between">
            <RatingDots value={quality} labels={QUALITY} onPick={setQuality} />
            <Button type="submit" size="sm" disabled={!label.trim()}><Plus className="h-4 w-4" />Log</Button>
          </div>
        </form>

        {meals.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">No meals logged today.</p>
        ) : (
          <div className="space-y-1">
            {meals.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-button px-1 py-1.5">
                <span className="flex-1 truncate text-sm">{m.label}</span>
                {m.quality != null && <span className="text-xs text-muted-foreground">{QUALITY[m.quality - 1]}</span>}
                {m.calories != null && <span className="text-xs text-muted-foreground">{m.calories} kcal</span>}
                <button onClick={() => start(async () => { await deleteNutrition(m.id); router.refresh(); })} className="text-muted-foreground hover:text-foreground" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── cycle (opt-in) ──────────────────────────────────────────────────────── */
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Cycle({
  cycle,
  logs,
  className,
}: {
  cycle: NonNullable<BodyOverview["cycle"]>;
  logs: PeriodLog[];
  className?: string;
}) {
  const router = useRouter();
  const today = dateKey(new Date());
  const [selected, setSelected] = React.useState(today);
  const [, start] = React.useTransition();

  const byDate = React.useMemo(() => {
    const m = new Map<string, PeriodLog>();
    for (const l of logs) m.set(l.date, l);
    return m;
  }, [logs]);

  const current = byDate.get(selected) ?? null;
  const [flow, setFlow] = React.useState<PeriodFlow | null>(current?.flow ?? null);
  const [symptoms, setSymptoms] = React.useState<string[]>(current?.symptoms ?? []);

  // Re-sync the editor when the selected day changes.
  React.useEffect(() => {
    const l = byDate.get(selected) ?? null;
    setFlow(l?.flow ?? null);
    setSymptoms(l?.symptoms ?? []);
  }, [selected, byDate]);

  // Last 14 days, oldest → newest.
  const strip = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return dateKey(d);
  });

  function toggleSymptom(s: string) {
    setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function save() {
    start(async () => {
      await savePeriodDay({ date: selected, flow, symptoms });
      router.refresh();
    });
  }
  function remove() {
    start(async () => {
      await deletePeriodDay(selected);
      router.refresh();
    });
  }

  const estimate = (() => {
    if (cycle.daysUntilNext == null || !cycle.nextEstimate) {
      return "Log a couple of cycles and a gentle estimate will appear here.";
    }
    const when = new Date(`${cycle.nextEstimate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (cycle.daysUntilNext < 0) return `Period may be a few days late. Around ${when}.`;
    if (cycle.daysUntilNext === 0) return `Period may begin around today.`;
    return `Next period around ${when}, about ${cycle.daysUntilNext} day${cycle.daysUntilNext === 1 ? "" : "s"} away.`;
  })();

  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cycle</p>
          {cycle.avgCycleLength && (
            <span className="text-xs text-muted-foreground">~{cycle.avgCycleLength}-day cycle</span>
          )}
        </div>

        <div
          className="flex items-start gap-3 rounded-card border p-3"
          style={{ background: "hsl(var(--module-goals) / 0.08)", borderColor: "hsl(var(--module-goals) / 0.2)" }}
        >
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "hsl(var(--module-goals))" }} />
          <p className="text-sm text-foreground/90">{estimate}</p>
        </div>

        {/* 14-day strip */}
        <div className="flex items-end justify-between gap-1">
          {strip.map((d) => {
            const log = byDate.get(d);
            const isSel = d === selected;
            const isToday = d === today;
            const day = new Date(`${d}T00:00:00`);
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-button py-1 transition-colors",
                  isSel ? "bg-accent" : "hover:bg-accent/60",
                )}
                title={day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              >
                <span className={cn("text-[10px]", isToday ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {day.getDate()}
                </span>
                <span
                  className="h-3.5 w-3.5 rounded-full border"
                  style={{
                    background: log?.flow ? "hsl(var(--module-goals))" : "transparent",
                    opacity: log?.flow ? flowOpacity(log.flow) : 1,
                    borderColor: log ? "hsl(var(--module-goals))" : "hsl(var(--input))",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* editor for the selected day */}
        <div className="space-y-3 rounded-card border bg-surface/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selected === today ? "Today" : new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {PERIOD_FLOWS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFlow(flow === f.id ? null : f.id)}
                  aria-pressed={flow === f.id}
                  className={cn(
                    "rounded-pill border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    flow === f.id ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground hover:bg-accent",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_SYMPTOMS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                aria-pressed={symptoms.includes(s)}
                className={cn(
                  "rounded-pill border px-2.5 py-1 text-xs transition-colors",
                  symptoms.includes(s) ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground hover:bg-accent",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            {current && (
              <Tap className="inline-flex">
                <Button size="sm" variant="ghost" onClick={remove}>Clear day</Button>
              </Tap>
            )}
            <Tap className="inline-flex">
              <Button size="sm" onClick={save} disabled={flow === null && symptoms.length === 0}>Save</Button>
            </Tap>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Informational only, not medical advice.</p>
      </CardContent>
    </Card>
  );
}

function flowOpacity(flow: PeriodFlow) {
  return flow === "spotting" ? 0.35 : flow === "light" ? 0.55 : flow === "medium" ? 0.8 : 1;
}

/* ── trends ──────────────────────────────────────────────────────────────── */
function Trends({ overview, className }: { overview: BodyOverview; className?: string }) {
  const sleep = overview.series.map((s) => s.sleep_hours).filter((v): v is number => v != null);
  const energy = overview.series.map((s) => s.energy_level).filter((v): v is number => v != null);
  const mood = overview.series.map((s) => s.mood_level).filter((v): v is number => v != null);
  const mindWeek = overview.series
    .filter((s) => s.date >= dateKey(new Date(Date.now() - 6 * 86_400_000)))
    .reduce((sum, s) => sum + (s.mindfulness_minutes ?? 0), 0);

  return (
    <Card className={className}>
      <CardContent className="p-5">
        {overview.recovery && (
          <div
            className="mb-4 flex items-start gap-3 rounded-card border p-3"
            style={{ background: "hsl(var(--module-readiness) / 0.08)", borderColor: "hsl(var(--module-readiness) / 0.2)" }}
          >
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "hsl(var(--module-readiness))" }} />
            <p className="text-sm text-foreground/90">{overview.recovery}</p>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sleep</p>
            <div className="mt-2"><Sparkline data={sleep} /></div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Energy</p>
            <div className="mt-2"><Sparkline data={energy} /></div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mood</p>
            <div className="mt-2"><Sparkline data={mood} /></div>
          </div>
          <Stat label="Focused this week" value={`${Math.round(overview.focusMinutesWeek / 60 * 10) / 10}h`} />
          <Stat label="Mindful this week" value={`${mindWeek}m`} />
          <Stat label="Active days" value={`${overview.workoutDaysWeek}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
    </div>
  );
}

/* ── workouts ────────────────────────────────────────────────────────────── */
function Workouts({ workouts, className }: { workouts: WorkoutLog[]; className?: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<WorkoutType | "">("");
  const [duration, setDuration] = React.useState("");
  const [, start] = React.useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name,
      type: (type || null) as WorkoutType | null,
      duration_minutes: duration ? Number(duration) : null,
    };
    setName(""); setType(""); setDuration("");
    start(async () => {
      await logWorkout(payload);
      router.refresh();
    });
  }

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workouts</p>
        <form onSubmit={add} className="flex flex-wrap gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="What did you do?" className="min-w-[10rem] flex-1 bg-surface" />
          <select value={type} onChange={(e) => setType(e.target.value as WorkoutType | "")} aria-label="Type" className="h-10 rounded-button border border-input bg-transparent px-2 text-sm">
            <option value="">Type</option>
            {WORKOUT_TYPES.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
          </select>
          <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="min" className="w-24 bg-surface" />
          <Button type="submit" disabled={!name.trim()}><Plus className="h-4 w-4" />Log</Button>
        </form>

        {workouts.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">No workouts logged yet.</p>
        ) : (
          <div className="space-y-1">
            {workouts.map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-button px-1 py-1.5">
                <span className="flex-1 truncate text-sm">{w.name}</span>
                {w.type && <span className="text-xs capitalize text-muted-foreground">{w.type}</span>}
                {w.duration_minutes != null && <span className="text-xs text-muted-foreground">{w.duration_minutes}m</span>}
                <span className="text-xs text-muted-foreground">{new Date(w.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <button onClick={() => start(async () => { await deleteWorkout(w.id); router.refresh(); })} className="text-muted-foreground hover:text-foreground" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
