"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Copy, Flame, LogOut, Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { leavePod } from "@/lib/pods/actions";
import type { PodDetail, PodMemberView } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tap } from "@/components/motion/tap";

type SortMetric = "readiness" | "study_minutes" | "streak";

const SORTS: { id: SortMetric; label: string }[] = [
  { id: "readiness", label: "Readiness" },
  { id: "study_minutes", label: "Minutes" },
  { id: "streak", label: "Streak" },
];

export function PodDetailView({ pod }: { pod: PodDetail }) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [sort, setSort] = React.useState<SortMetric>("readiness");

  const members = React.useMemo(
    () =>
      [...pod.members].sort(
        (a, b) => (b.stat?.[sort] ?? 0) - (a.stat?.[sort] ?? 0),
      ),
    [pod.members, sort],
  );

  // Live updates: refresh when any pod_stats / membership changes.
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pod-${pod.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pod_stats" }, () => router.refresh())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pod_members", filter: `pod_id=eq.${pod.id}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pod.id, router]);

  function copyCode() {
    void navigator.clipboard.writeText(pod.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{pod.name}</CardTitle>
            {pod.exam_target && <p className="text-sm text-muted-foreground">{pod.exam_target}</p>}
          </div>
          <Tap className="inline-flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await leavePod(pod.id);
                router.push("/constellations");
              }}
            >
              <LogOut className="h-4 w-4" />
              Leave
            </Button>
          </Tap>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Invite code</span>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs"
          >
            {pod.invite_code}
            {copied ? <Check className="h-3 w-3 text-[hsl(var(--status-strong))]" /> : <Copy className="h-3 w-3" />}
          </button>
          <span className="text-xs text-muted-foreground">· {pod.members.length}/6 members</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-end gap-1">
          <span className="mr-1 text-xs text-muted-foreground">Rank by</span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={cn(
                "rounded-button border px-2 py-0.5 text-xs font-medium transition-colors",
                sort === s.id
                  ? "border-foreground bg-foreground/10"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {members.map((m, i) => (
          <MemberRow key={m.user_id} member={m} rank={i + 1} sort={sort} />
        ))}
      </CardContent>
    </Card>
  );
}

function MemberRow({
  member: m,
  rank,
  sort,
}: {
  member: PodMemberView;
  rank: number;
  sort: SortMetric;
}) {
  const metric =
    sort === "study_minutes"
      ? { value: `${m.stat?.study_minutes ?? 0}m`, label: "this week", color: "--module-study" }
      : sort === "streak"
        ? { value: `${m.stat?.streak ?? 0}`, label: "day streak", color: "--module-money" }
        : { value: `${m.stat?.readiness ?? 0}`, label: "readiness", color: "--module-readiness" };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className="w-5 text-center text-sm font-semibold text-muted-foreground">{rank}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {(m.stat?.name ?? "?").charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {m.stat?.name ?? "Member"}
          {m.isYou && <Badge variant="secondary">You</Badge>}
        </p>
        {m.stat?.current_goal ? (
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Target className="h-3 w-3" /> {m.stat.current_goal}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No active goal</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Minutes studied this week">
        <Clock className="h-3.5 w-3.5" style={{ color: "hsl(var(--module-study))" }} />
        {m.stat?.study_minutes ?? 0}m
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Day streak">
        <Flame className="h-3.5 w-3.5" style={{ color: "hsl(var(--module-money))" }} />
        {m.stat?.streak ?? 0}
      </div>
      <div className="w-16 text-right">
        <p className="text-base font-semibold tabular-nums" style={{ color: `hsl(var(${metric.color}))` }}>
          {metric.value}
        </p>
        <p className="text-[10px] text-muted-foreground">{metric.label}</p>
      </div>
    </div>
  );
}
