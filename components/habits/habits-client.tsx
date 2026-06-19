"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { createHabit, deleteHabit, toggleHabitToday } from "@/lib/habits/actions";
import { ROUTINES, type HabitWithToday, type Routine } from "@/lib/habits/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";
import { HabitGrid } from "@/components/habits/habit-grid";

export function HabitsClient({ habits }: { habits: HabitWithToday[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [routine, setRoutine] = React.useState<Routine>("any");
  const [, start] = React.useTransition();
  const [optimistic, setOptimistic] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => setOptimistic({}), [habits]);

  function toggle(h: HabitWithToday) {
    const next = optimistic[h.id] ?? h.doneToday;
    setOptimistic((o) => ({ ...o, [h.id]: !next }));
    start(async () => {
      await toggleHabitToday(h.id);
      router.refresh();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const n = name;
    setName("");
    start(async () => {
      await createHabit(n, routine);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New habit (e.g. Read 20 minutes)"
              className="min-w-[12rem] flex-1"
            />
            <select
              value={routine}
              onChange={(e) => setRoutine(e.target.value as Routine)}
              className="h-9 rounded-button border border-input bg-transparent px-3 text-sm"
            >
              {ROUTINES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <Button type="submit" disabled={!name.trim()}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {habits.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          No habits yet. Start with one or two you can do daily.
        </p>
      )}

      {ROUTINES.map((r) => {
        const group = habits.filter((h) => h.routine === r.id);
        if (group.length === 0) return null;
        return (
          <section key={r.id} className="space-y-2">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {r.label}
            </h2>
            <div className="space-y-2">
              {group.map((h) => (
                <Card key={h.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Tap className="inline-flex">
                        <button
                          onClick={() => toggle(h)}
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border",
                            (optimistic[h.id] ?? h.doneToday)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input",
                          )}
                          aria-label="Toggle today"
                        >
                          {(optimistic[h.id] ?? h.doneToday) && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </Tap>
                      <span className="flex-1 truncate text-sm font-medium">{h.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3.5 w-3.5" style={{ color: "hsl(var(--module-money))" }} />
                        {h.streak}
                      </span>
                      <button
                        onClick={() => start(async () => { await deleteHabit(h.id); router.refresh(); })}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Delete habit"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="overflow-x-auto pb-1">
                      <HabitGrid completedDates={h.completedDates} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
