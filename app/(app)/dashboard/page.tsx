import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { NAV_ITEMS } from "@/lib/nav";
import { getSubjectsWithTopics } from "@/lib/study/queries";
import { recommendTopics, type RecoTopic } from "@/lib/study/recommendations";
import { getReadinessSnapshot } from "@/lib/readiness/service";
import { getIntelligence } from "@/lib/intelligence/service";
import { Card, CardContent } from "@/components/ui/card";
import { ReadinessScore } from "@/components/readiness/readiness-score";
import { ReadinessRecorder } from "@/components/readiness/readiness-recorder";
import { TodayCard } from "@/components/dashboard/today-card";
import { PanicBanner } from "@/components/intelligence/panic-banner";
import { InsightCard } from "@/components/intelligence/insight-card";
import { PredictiveCard } from "@/components/intelligence/predictive-card";
import { Tap } from "@/components/motion/tap";

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function daysBetween(from: Date, to: Date) {
  const ms = to.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, subjects, readiness, intelligence] = await Promise.all([
    supabase.from("users").select("*").eq("id", user!.id).single<Profile>(),
    getSubjectsWithTopics(),
    getReadinessSnapshot(),
    getIntelligence(),
  ]);

  const name = profile?.name?.trim() || user?.email?.split("@")[0] || "there";

  const now = new Date();
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  let examCountdown: { label: string; days: number } | null = null;
  if (profile?.exam_date) {
    const days = daysBetween(new Date(), new Date(profile.exam_date));
    if (days >= 0) examCountdown = { label: profile.exam_target ?? "Your exam", days };
  }

  let trialDaysLeft: number | null = null;
  if (profile && !profile.is_pro && profile.trial_started_at) {
    const elapsed = daysBetween(new Date(profile.trial_started_at), new Date());
    trialDaysLeft = Math.max(0, 30 - elapsed);
  }

  const recoTopics: RecoTopic[] = subjects.flatMap((s) =>
    s.topics.map((t) => ({ id: t.id, name: t.name, subjectName: s.name, status: t.status })),
  );
  const recommendations = recommendTopics(recoTopics);
  const modules = NAV_ITEMS.filter((i) => i.mark);

  return (
    <div className="space-y-8">
      <ReadinessRecorder />

      {/* ── Editorial greeting ───────────────────────────────────── */}
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {todayLabel}
        </p>
        <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
          {greeting(now)}, {name}.
        </h1>
        {examCountdown && (
          <p className="text-sm text-muted-foreground">
            {examCountdown.label} ·{" "}
            <span className="text-foreground">
              {examCountdown.days === 0 ? "exam today" : `${examCountdown.days} days left`}
            </span>
          </p>
        )}
      </header>

      {intelligence && <PanicBanner panic={intelligence.panic} />}

      {/* ── Readiness hero ───────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 sm:p-7">
          {readiness && readiness.breakdown.topicCount > 0 ? (
            <ReadinessScore
              score={readiness.score}
              previous={readiness.previous}
              history={readiness.history}
            />
          ) : (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Readiness
              </p>
              <p className="mt-1 font-serif text-3xl">Add topics to begin</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Build your syllabus in Study — your score appears once you have topics.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── "We noticed" + gentle nudges ─────────────────────────── */}
      {intelligence && (
        <InsightCard timing={intelligence.timing} burnout={intelligence.burnout} />
      )}

      {/* ── Context row ──────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <span
              className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-button"
              style={{
                backgroundColor: "hsl(var(--module-calendar) / 0.12)",
                color: "hsl(var(--module-calendar))",
              }}
            >
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {examCountdown ? examCountdown.label : "Exam date"}
              </p>
              <p className="font-serif text-2xl leading-tight">
                {examCountdown
                  ? examCountdown.days === 0
                    ? "Today"
                    : `${examCountdown.days} days`
                  : "Not set"}
              </p>
              <p className="text-xs text-muted-foreground">
                {examCountdown ? "until your exam" : "Add one in Settings."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-button bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Plan</p>
              <p className="font-serif text-2xl leading-tight">
                {profile?.is_pro
                  ? "Pro"
                  : trialDaysLeft !== null
                    ? `${trialDaysLeft} days`
                    : "Free trial"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.is_pro ? "Thanks for being Pro." : "left in your free trial."}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── What to study today ──────────────────────────────────── */}
      <TodayCard items={recommendations} />

      {/* ── Mocks & predictive projection ────────────────────────── */}
      {intelligence && (
        <PredictiveCard mocks={intelligence.mocks} prediction={intelligence.predictive} />
      )}

      {/* ── Modules (navigation) ─────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your modules
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {modules.map((m) => (
            <Tap key={m.href} className="block">
              <Link href={m.href}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button border"
                      style={{
                        backgroundColor: `hsl(var(${m.colorVar}) / 0.12)`,
                        borderColor: `hsl(var(${m.colorVar}) / 0.24)`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.mark} alt="" className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium">{m.label}</p>
                  </CardContent>
                </Card>
              </Link>
            </Tap>
          ))}
        </div>
      </section>
    </div>
  );
}
