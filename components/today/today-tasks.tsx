"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createTask, toggleTaskDone } from "@/lib/tasks/actions";
import type { Task } from "@/lib/tasks/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

export function TodayTasks({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [, start] = React.useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const t = title;
    setTitle("");
    start(async () => {
      await createTask({ title: t, status: "today" });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Today&apos;s tasks
          </p>
          <Link href="/tasks" className="text-xs font-medium text-primary hover:underline">
            All tasks
          </Link>
        </div>

        <div className="space-y-1">
          {tasks.length === 0 && (
            <p className="px-1 py-1 text-sm text-muted-foreground">
              Nothing for today yet. Add the one thing that matters most.
            </p>
          )}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 rounded-button px-1 py-1.5">
              <Tap className="inline-flex">
                <button
                  onClick={() => start(async () => { await toggleTaskDone(t.id, true); router.refresh(); })}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border border-input hover:border-primary"
                  aria-label="Complete task"
                />
              </Tap>
              <span className="flex-1 truncate text-sm">{t.title}</span>
              {t.priority === "p1" && (
                <span
                  className="rounded-pill px-1.5 text-[10px] font-medium uppercase"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}
                >
                  Top
                </span>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={add} className="mt-2 flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task for today…"
            className="h-9"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!title.trim()}>
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
