"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Pencil, Target } from "lucide-react";

import { updateProfile } from "@/lib/profile/actions";
import { ReadinessScore } from "@/components/readiness/readiness-score";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export type StudyTarget = {
  exam_target: string | null;
  exam_date: string | null;
  exam_target_score: number | null;
};

/** Days from today until `date` (local), or null if no/invalid date. */
function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function TargetBanner({
  target,
  score,
  previous,
  history,
}: {
  target: StudyTarget;
  score: number;
  previous: number | null;
  history: { day: string; score: number }[];
}) {
  const [editing, setEditing] = React.useState(false);

  const days = daysUntil(target.exam_date);
  const hasTarget =
    target.exam_target || target.exam_date || target.exam_target_score != null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <ReadinessScore score={score} previous={previous} history={history} />

        <div className="flex items-start gap-4">
          {hasTarget && !editing && (
            <div className="space-y-1.5 text-sm">
              {target.exam_target && (
                <div className="flex items-center gap-2 font-medium">
                  <Target
                    className="h-4 w-4"
                    style={{ color: "hsl(var(--module-study))" }}
                  />
                  {target.exam_target}
                </div>
              )}
              {days != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  {days > 0 ? (
                    <span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {days}
                      </span>{" "}
                      day{days === 1 ? "" : "s"} to go
                    </span>
                  ) : days === 0 ? (
                    <span className="font-semibold text-foreground">
                      Exam is today
                    </span>
                  ) : (
                    <span>Exam date passed</span>
                  )}
                </div>
              )}
              {target.exam_target_score != null && (
                <div className="text-muted-foreground">
                  Aiming for{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {target.exam_target_score}
                  </span>{" "}
                  / 1000
                </div>
              )}
            </div>
          )}

          {!editing && (
            <Tap className="inline-flex">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                {hasTarget ? "Edit target" : "Set target"}
              </Button>
            </Tap>
          )}
        </div>
      </div>

      {editing && (
        <TargetForm target={target} onDone={() => setEditing(false)} />
      )}
    </Card>
  );
}

function TargetForm({
  target,
  onDone,
}: {
  target: StudyTarget;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(target.exam_target ?? "");
  const [date, setDate] = React.useState(target.exam_date ?? "");
  const [score, setScore] = React.useState(
    target.exam_target_score != null ? String(target.exam_target_score) : "",
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const parsedScore = score.trim() === "" ? null : Number(score);
    const res = await updateProfile({
      exam_target: name.trim() || null,
      exam_date: date || null,
      exam_target_score: parsedScore,
    });
    setPending(false);
    if (res.ok) {
      onDone();
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3 border-t pt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Exam / target
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. NEET 2026"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Exam date
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Target score (0–1000)
          <Input
            type="number"
            min={0}
            max={1000}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="800"
          />
        </label>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Tap className="inline-flex">
          <Button type="submit" size="sm" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save target
          </Button>
        </Tap>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
