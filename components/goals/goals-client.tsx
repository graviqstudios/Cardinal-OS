"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addMilestone,
  createGoal,
  deleteGoal,
  deleteMilestone,
  setGoalIdentity,
  setGoalProgress,
  toggleMilestone,
} from "@/lib/goals/actions";
import type { GoalType, GoalWithMilestones } from "@/lib/goals/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function GoalsClient({
  goals,
  streak,
  examMode,
}: {
  goals: GoalWithMilestones[];
  streak: number;
  examMode: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<GoalType>("personal");
  const [targetDate, setTargetDate] = React.useState("");
  const [pending, start] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = { title, type, target_date: targetDate || null };
    setTitle("");
    setTargetDate("");
    start(async () => {
      const res = await createGoal(payload);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Streak (exam template only) */}
      {examMode && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                backgroundColor: "hsl(var(--module-money) / 0.14)",
                color: "hsl(var(--module-money))",
              }}
            >
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold">
                {streak} day{streak === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">
                Study streak - practice today to keep it alive.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New goal */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New goal (e.g. Finish Calculus revision)"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as GoalType)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="personal">Personal</option>
              <option value="exam">Exam</option>
            </select>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-auto"
            />
            <Button type="submit" disabled={pending || !title.trim()}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {goals.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          No goals yet. Add a personal or exam goal above.
        </p>
      )}

      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} />
      ))}
    </div>
  );
}

function velocityLabel(goal: GoalWithMilestones): { text: string; ok: boolean } | null {
  if (!goal.target_date) return null;
  const created = new Date(goal.created_at).getTime();
  const target = new Date(goal.target_date).getTime();
  const total = target - created;
  if (total <= 0) return null;
  const expected = Math.max(0, Math.min(1, (Date.now() - created) / total)) * 100;
  return goal.progress + 5 >= expected
    ? { text: "On track", ok: true }
    : { text: "Keep going", ok: false };
}

function GoalCard({ goal }: { goal: GoalWithMilestones }) {
  const router = useRouter();
  const [, start] = React.useTransition();
  const [newMilestone, setNewMilestone] = React.useState("");
  const [progress, setProgress] = React.useState(goal.progress);
  const [identity, setIdentity] = React.useState(goal.identity ?? "");

  const refresh = () => router.refresh();
  const done = goal.milestones.filter((m) => m.completed).length;
  const vel = velocityLabel(goal);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{goal.title}</p>
              <Badge variant="secondary" className="capitalize">{goal.type}</Badge>
              {vel && (
                <span
                  className="rounded-pill px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: vel.ok ? "hsl(var(--module-calendar) / 0.14)" : "hsl(var(--muted))",
                    color: vel.ok ? "hsl(var(--module-calendar))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {vel.text}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="shrink-0 font-serif text-sm italic text-muted-foreground">I am someone who</span>
              <input
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                onBlur={() => {
                  if (identity !== (goal.identity ?? "")) {
                    start(async () => { await setGoalIdentity(goal.id, identity); refresh(); });
                  }
                }}
                placeholder="ships, every week…"
                className="w-full border-0 border-b border-transparent bg-transparent font-serif text-sm italic text-foreground placeholder:text-muted-foreground/60 focus:border-input focus:outline-none"
              />
            </div>
            {goal.target_date && (
              <p className="mt-1 text-xs text-muted-foreground">
                Target: {new Date(goal.target_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete goal"
            onClick={() => start(async () => { await deleteGoal(goal.id); refresh(); })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            onPointerUp={() => start(async () => { await setGoalProgress(goal.id, progress); refresh(); })}
            onKeyUp={() => start(async () => { await setGoalProgress(goal.id, progress); refresh(); })}
            className="mt-2 w-full accent-[hsl(var(--primary))]"
          />
        </div>

        {/* Milestones */}
        <div className="space-y-1.5">
          {goal.milestones.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground">
              Milestones · {done}/{goal.milestones.length}
            </p>
          )}
          {goal.milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <button
                onClick={() => start(async () => { await toggleMilestone(m.id, !m.completed); refresh(); })}
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  m.completed ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
                aria-label="Toggle milestone"
              >
                {m.completed && <Check className="h-3 w-3" />}
              </button>
              <span className={cn("flex-1 text-sm", m.completed && "text-muted-foreground line-through")}>
                {m.title}
              </span>
              <button
                onClick={() => start(async () => { await deleteMilestone(m.id); refresh(); })}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Delete milestone"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <form
            className="flex gap-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newMilestone.trim()) return;
              const t = newMilestone;
              setNewMilestone("");
              start(async () => { await addMilestone(goal.id, t); refresh(); });
            }}
          >
            <Input
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              placeholder="Add a milestone"
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" variant="secondary">Add</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
