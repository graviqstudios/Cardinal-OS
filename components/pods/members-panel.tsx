"use client";

import * as React from "react";
import { Clock, Flame } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { PodMemberView } from "@/lib/pods/types";

type Metric = "readiness" | "study_minutes" | "streak";

const METRICS: { id: Metric; label: string }[] = [
  { id: "readiness", label: "Readiness" },
  { id: "study_minutes", label: "Minutes" },
  { id: "streak", label: "Streak" },
];

/** Right-hand members list + study leaderboard with live presence. */
export function MembersPanel({
  members,
  podId,
  currentUserId,
}: {
  members: PodMemberView[];
  podId: string;
  currentUserId: string;
}) {
  const [online, setOnline] = React.useState<Set<string>>(new Set());
  const [metric, setMetric] = React.useState<Metric>("readiness");

  // Server-wide presence: who is online in this constellation right now.
  React.useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel(`server-presence-${podId}`, {
      config: { presence: { key: currentUserId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [podId, currentUserId]);

  const ranked = React.useMemo(() => {
    const withRank = [...members].sort(
      (a, b) => (b.stat?.[metric] ?? 0) - (a.stat?.[metric] ?? 0),
    );
    // Online first, keeping metric order within each group.
    return [
      ...withRank.filter((m) => online.has(m.user_id)),
      ...withRank.filter((m) => !online.has(m.user_id)),
    ];
  }, [members, metric, online]);

  return (
    <div className="hidden w-60 shrink-0 flex-col border-l bg-muted/20 lg:flex">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">
          Members
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {members.length}
          </span>
        </p>
        <div className="mt-2 flex gap-1">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={cn(
                "rounded-button border px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                metric === m.id
                  ? "border-foreground bg-foreground/10"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {ranked.map((m, i) => {
          const isOnline = online.has(m.user_id);
          const value =
            metric === "study_minutes"
              ? `${m.stat?.study_minutes ?? 0}m`
              : metric === "streak"
                ? `${m.stat?.streak ?? 0}`
                : `${m.stat?.readiness ?? 0}`;
          return (
            <div key={m.user_id} className="flex items-center gap-2 rounded-button px-2 py-1.5">
              <span className="w-4 text-center text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {(m.stat?.name ?? "?").charAt(0).toUpperCase()}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                    isOnline ? "bg-[hsl(var(--status-strong))]" : "bg-muted-foreground/40",
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {m.stat?.name ?? "Member"}
                  {m.isYou && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5">
                    <Flame className="h-2.5 w-2.5" style={{ color: "hsl(var(--module-money))" }} />
                    {m.stat?.streak ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {m.stat?.study_minutes ?? 0}m
                  </span>
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums" style={{ color: "hsl(var(--module-readiness))" }}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
