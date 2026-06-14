"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { createCareerTarget, deleteCareerTarget } from "@/lib/goals/actions";
import type { CareerTarget } from "@/lib/goals/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CareerPanel({ targets }: { targets: CareerTarget[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [required, setRequired] = React.useState("");
  const [current, setCurrent] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, start] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title,
      required_score: required || null,
      current_score: current || null,
      notes: notes || null,
    };
    setTitle("");
    setRequired("");
    setCurrent("");
    setNotes("");
    setOpen(false);
    start(async () => {
      const res = await createCareerTarget(payload);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Career &amp; college targets</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {open && (
          <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dream college / role" autoFocus className="sm:col-span-2" />
            <Input value={required} onChange={(e) => setRequired(e.target.value)} placeholder="Required score / rank" />
            <Input value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current tracking" />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="This week's action" className="sm:col-span-2" />
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>Save</Button>
            </div>
          </form>
        )}

        {targets.length === 0 && !open && (
          <p className="text-sm text-muted-foreground">
            Add a dream college or role to track the gap to your target.
          </p>
        )}

        {targets.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {t.required_score && <span>Required: <span className="text-foreground">{t.required_score}</span></span>}
                {t.current_score && <span>Current: <span className="text-foreground">{t.current_score}</span></span>}
              </div>
              {t.notes && <p className="mt-1 text-xs text-muted-foreground">→ {t.notes}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete target"
              onClick={() => start(async () => { await deleteCareerTarget(t.id); router.refresh(); })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
