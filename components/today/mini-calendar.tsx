"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/calendar/dates";
import type { CalendarEvent } from "@/lib/calendar/types";
import { Card, CardContent } from "@/components/ui/card";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Compact current-month calendar with event dots, plus today's events. */
export function MiniCalendar({
  events,
  todayEvents,
}: {
  events: CalendarEvent[];
  todayEvents: CalendarEvent[];
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayK = dayKey(now);

  // Days that have at least one event.
  const eventDays = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(dayKey(new Date(e.start_time)));
    return set;
  }, [events]);

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <Link href="/calendar" className="text-xs font-medium text-primary hover:underline">
            Open calendar
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[10px] font-medium text-muted-foreground/70">
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day == null) return <span key={`b${i}`} />;
            const isToday = dayKey(new Date(year, month, day)) === todayK;
            const hasEvent = eventDays.has(dayKey(new Date(year, month, day)));
            return (
              <Link
                key={day}
                href="/calendar"
                className="flex flex-col items-center justify-center py-0.5"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-pill text-xs tabular-nums transition-colors",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  {day}
                </span>
                <span
                  className={cn(
                    "mt-0.5 h-1 w-1 rounded-pill",
                    hasEvent && !isToday ? "bg-[hsl(var(--module-calendar))]" : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
        </div>

        <div className="border-t pt-2">
          {todayEvents.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">Nothing scheduled today.</p>
          ) : (
            <div className="space-y-1.5">
              {todayEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-2.5 text-sm">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-button"
                    style={{
                      backgroundColor: "hsl(var(--module-calendar) / 0.12)",
                      color: "hsl(var(--module-calendar))",
                    }}
                  >
                    <CalendarDays className="h-3 w-3" />
                  </span>
                  <span className="flex-1 truncate">{e.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.all_day ? "All day" : fmtTime(e.start_time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
