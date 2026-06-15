import { CalendarDays } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { getLifeScoreSnapshot } from "@/lib/life-score/service";
import { getHabitsWithToday } from "@/lib/habits/queries";
import { getTodayTasks } from "@/lib/tasks/queries";
import { getTodayReflection } from "@/lib/journal/queries";
import { getEvents } from "@/lib/calendar/queries";
import { fmtTime } from "@/lib/calendar/dates";
import { Card, CardContent } from "@/components/ui/card";
import { LifeScoreRecorder } from "@/components/life-score/life-score-recorder";
import { LifeScoreHero } from "@/components/today/life-score-hero";
import { TodayIntention } from "@/components/today/today-intention";
import { TodayHabits } from "@/components/today/today-habits";
import { TodayTasks } from "@/components/today/today-tasks";
import { TodayBriefing } from "@/components/today/today-briefing";
import { DailyReflection } from "@/components/today/daily-reflection";
import { QuickCapture } from "@/components/today/quick-capture";

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [{ data: profile }, life, habits, tasks, events, reflection] = await Promise.all([
    supabase.from("users").select("name, email").eq("id", user!.id).single<Pick<Profile, "name" | "email">>(),
    getLifeScoreSnapshot(),
    getHabitsWithToday(),
    getTodayTasks(),
    getEvents(dayStart, dayEnd),
    getTodayReflection(),
  ]);

  const name = profile?.name?.trim() || profile?.email?.split("@")[0] || "there";
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const upcoming = events
    .filter((e) => new Date(e.end_time) >= now)
    .slice(0, 3);

  const hasData =
    habits.length > 0 || tasks.length > 0 || (life?.breakdown.velocity ?? null) != null;

  return (
    <div className="space-y-6">
      <LifeScoreRecorder />

      {/* Greeting + intention */}
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {dateLabel}
          </p>
          <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            {greeting(now)}, {name}.
          </h1>
        </div>
        <TodayIntention />
      </header>

      {/* Life Score hero */}
      <LifeScoreHero
        score={life?.score ?? 0}
        previous={life?.previous ?? null}
        history={life?.history ?? []}
        hasData={hasData}
      />

      <TodayBriefing />

      <div className="grid gap-6 lg:grid-cols-2">
        <TodayHabits habits={habits} />
        <TodayTasks tasks={tasks} />
      </div>

      {/* Calendar strip */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              On your calendar
            </p>
            <a href="/calendar" className="text-xs font-medium text-primary hover:underline">
              Open calendar
            </a>
          </div>
          {upcoming.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">Nothing scheduled today.</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((e) => (
                <div key={e.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-button"
                    style={{
                      backgroundColor: "hsl(var(--module-calendar) / 0.12)",
                      color: "hsl(var(--module-calendar))",
                    }}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{e.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.all_day ? "All day" : fmtTime(e.start_time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily reflection */}
      <DailyReflection initial={reflection} />

      <QuickCapture />
    </div>
  );
}
