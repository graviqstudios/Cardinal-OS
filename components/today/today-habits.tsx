"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Flame, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { toggleHabitToday } from "@/lib/habits/actions";
import type { HabitWithToday } from "@/lib/habits/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function TodayHabits({ habits }: { habits: HabitWithToday[] }) {
  const router = useRouter();
  const [, start] = React.useTransition();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Today&apos;s habits
          </p>
          <Link href="/habits" className="text-xs font-medium text-primary hover:underline">
            Manage
          </Link>
        </div>

        {habits.length === 0 ? (
          <Link
            href="/habits"
            className="flex items-center gap-2 rounded-button border border-dashed p-3 text-sm text-muted-foreground hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Add your first habit
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {habits.map((h) => (
              <Tap key={h.id} className="block">
                <button
                  onClick={() => start(async () => { await toggleHabitToday(h.id); router.refresh(); })}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-button border p-2.5 text-left transition-colors",
                    h.doneToday ? "border-primary/40 bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border",
                      h.doneToday ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {h.doneToday && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", h.doneToday && "text-muted-foreground")}>
                      {h.name}
                    </span>
                    {h.streak > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Flame className="h-3 w-3" style={{ color: "hsl(var(--module-money))" }} />
                        {h.streak}
                      </span>
                    )}
                  </span>
                </button>
              </Tap>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
