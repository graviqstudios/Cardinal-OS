"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteWorkout, logWorkout, saveMetric } from "@/lib/body/actions";
import {
  WORKOUT_TYPES,
  type BodyOverview,
  type WorkoutLog,
  type WorkoutType,
} from "@/lib/body/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkline } from "@/components/readiness/sparkline";
import { Tap } from "@/components/motion/tap";

const ENERGY = ["Drained", "Low", "Okay", "Good", "Strong"];
const LBS_PER_KG = 2.2046226218;

export function BodyClient({ overview }: { overview: BodyOverview }) {
  return (
    <div className="space-y-6">
      <CheckIn today={overview.today} />
      <Trends overview={overview} />
      <Workouts workouts={overview.workouts} />
    </div>
  );
}

function EnergyDots({
  value,
  onPick,
}: {
  value: number | null;
  onPick: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {ENERGY.map((label, i) => {
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

function CheckIn({ today }: { today: BodyOverview["today"] }) {
  const router = useRouter();
  const [sleep, setSleep] = React.useState(today?.sleep_hours?.toString() ?? "");
  const [energy, setEnergy] = React.useState<number | null>(today?.energy_level ?? null);
  const [unit, setUnit] = React.useState<"kg" | "lbs">("kg");
  const [weight, setWeight] = React.useState(today?.weight_kg?.toString() ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Restore the preferred unit after mount (avoids a hydration mismatch).
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
          <span className="text-sm text-muted-foreground">Energy</span>
          <EnergyDots value={energy} onPick={setEnergy} />
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

function Trends({ overview }: { overview: BodyOverview }) {
  const sleep = overview.series.map((s) => s.sleep_hours).filter((v): v is number => v != null);
  const energy = overview.series.map((s) => s.energy_level).filter((v): v is number => v != null);

  return (
    <Card>
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sleep</p>
            <div className="mt-2"><Sparkline data={sleep} /></div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Energy</p>
            <div className="mt-2"><Sparkline data={energy} /></div>
          </div>
          <Stat label="Focused this week" value={`${Math.round(overview.focusMinutesWeek / 60 * 10) / 10}h`} />
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

function Workouts({ workouts }: { workouts: WorkoutLog[] }) {
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
    <Card>
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
