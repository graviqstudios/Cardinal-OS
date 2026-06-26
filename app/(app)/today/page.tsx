import { Suspense } from "react";

import { createClient, getUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { getLifeScoreSnapshot } from "@/lib/life-score/service";
import { getHabitsWithToday } from "@/lib/habits/queries";
import { getTodayTasks } from "@/lib/tasks/queries";
import { getEvents } from "@/lib/calendar/queries";
import { buildGreeting } from "@/lib/today/greeting";
import { TOUR_VERSION } from "@/lib/tour/version";
import { LifeScoreRecorder } from "@/components/life-score/life-score-recorder";
import { LifeScoreHero } from "@/components/today/life-score-hero";
import { TodayIntention } from "@/components/today/today-intention";
import { TodayHabits } from "@/components/today/today-habits";
import { TodayTasks } from "@/components/today/today-tasks";
import { TodayBriefing } from "@/components/today/today-briefing";
import { MiniCalendar } from "@/components/today/mini-calendar";
import { InsightsSection } from "@/components/today/insights-section";
import { ReflectionSection } from "@/components/today/reflection-section";
import { FocusTimer } from "@/components/body/focus-timer";
import { QuickCapture } from "@/components/today/quick-capture";
import { ProductTour } from "@/components/tour/product-tour";
import { WhatsNew } from "@/components/tour/whats-new";

export default async function TodayPage() {
  const user = await getUser();
  const supabase = await createClient();

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  // Primary, above-the-fold data blocks the render. The slower secondary
  // sections (insights, reflection) stream in via Suspense below.
  const [{ data: profile }, life, habits, tasks, monthEvents] =
    await Promise.all([
      supabase
        .from("users")
        .select("name, email, tour_completed_at, tour_version")
        .eq("id", user!.id)
        .single<Pick<Profile, "name" | "email" | "tour_completed_at" | "tour_version">>(),
      getLifeScoreSnapshot(),
      getHabitsWithToday(),
      getTodayTasks(),
      getEvents(monthStart, monthEnd),
    ]);

  // First-run users get the full guided tour; returning users who predate this
  // tour version get a calm, dismissable "what's new" banner instead.
  const needsTour = (profile?.tour_version ?? 0) < TOUR_VERSION;
  const isNewUser = !profile?.tour_completed_at;

  const name = profile?.name?.trim() || profile?.email?.split("@")[0] || "there";
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const todayEvents = monthEvents
    .filter((e) => e.start_time < dayEnd && e.end_time > dayStart && new Date(e.end_time) >= now)
    .slice(0, 4);

  const hasData =
    habits.length > 0 || tasks.length > 0 || (life?.breakdown.velocity ?? null) != null;

  const habitsDone = habits.filter((h) => h.doneToday).length;
  const topStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
  const trend: "up" | "down" | "flat" | null =
    life?.previous == null
      ? null
      : life.score > life.previous
        ? "up"
        : life.score < life.previous
          ? "down"
          : "flat";

  const greetingText = buildGreeting({
    name,
    hasData,
    habitsDone,
    habitsTotal: habits.length,
    taskCount: tasks.length,
    trend,
    topStreak,
    daySeed: Math.floor(now.getTime() / 86_400_000),
  });

  return (
    <div className="space-y-6">
      <LifeScoreRecorder />
      {needsTour && (isNewUser
        ? <ProductTour run returning={false} onceKey={`co-tour-${TOUR_VERSION}`} />
        : <WhatsNew version={TOUR_VERSION} />)}

      {/* Greeting + daily message + intention */}
      <header className="space-y-3">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {dateLabel}
          </p>
          <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            {greetingText}
          </h1>
          <TodayBriefing />
        </div>
        <TodayIntention />
      </header>

      {/* Left: Life Score + calendar · Right: habits, tasks, focus */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <LifeScoreHero
            score={life?.score ?? 0}
            previous={life?.previous ?? null}
            history={life?.history ?? []}
            hasData={hasData}
          />
          <MiniCalendar events={monthEvents} todayEvents={todayEvents} />
        </div>
        <div className="space-y-6">
          <TodayHabits habits={habits} />
          <TodayTasks tasks={tasks} />
          <FocusTimer
            tasks={tasks.map((t) => ({ id: t.id, name: t.title }))}
            habits={habits.map((h) => ({ id: h.id, name: h.name }))}
          />
        </div>
      </div>

      {/* Cross-domain patterns ("we noticed") — streamed */}
      <Suspense fallback={<div className="h-24 animate-pulse rounded-card border bg-muted/50" />}>
        <InsightsSection />
      </Suspense>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-card border bg-muted/50" />}>
        <ReflectionSection />
      </Suspense>

      <QuickCapture />
    </div>
  );
}
