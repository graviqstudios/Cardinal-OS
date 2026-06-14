"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, TrendingUp } from "lucide-react";

import { logMockExam, deleteMockExam } from "@/lib/intelligence/actions";
import type { MockExam, Prediction } from "@/lib/intelligence/predictive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PredictiveCard({
  mocks,
  prediction,
}: {
  mocks: MockExam[];
  prediction: Prediction;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [score, setScore] = React.useState("");
  const [max, setMax] = React.useState("");
  const [date, setDate] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [, start] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = Number(score);
    const m = Number(max);
    if (!label.trim() || !(m > 0)) {
      setError("Add a label and a max score.");
      return;
    }
    const payload = { label, score: s, max_score: m, taken_at: date || null };
    setLabel(""); setScore(""); setMax(""); setDate(""); setError(null); setOpen(false);
    start(async () => {
      const res = await logMockExam(payload);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Mock exams &amp; projection</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4" />
          Log mock
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {prediction.hasProjection ? (
          <div className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: "hsl(var(--module-readiness) / 0.4)" }}>
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(var(--module-readiness))" }} />
            <p className="text-sm">{prediction.text}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Log 3+ mock exams and a projected score range will appear here.
          </p>
        )}

        {open && (
          <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. NEET Mock 4)" autoFocus className="sm:col-span-2" />
            <Input type="number" min={0} value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" />
            <Input type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Out of" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:col-span-2" />
            {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}

        {mocks.length > 0 && (
          <div className="space-y-1">
            {mocks.map((m) => (
              <div key={m.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{m.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {m.score}/{m.max_score}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.taken_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <button
                  onClick={() => start(async () => { await deleteMockExam(m.id); router.refresh(); })}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Delete mock"
                >
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
