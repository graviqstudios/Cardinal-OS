"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Flame, LogOut, Target } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { leavePod } from "@/lib/pods/actions";
import type { PodDetail } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tap } from "@/components/motion/tap";

export function PodDetailView({ pod }: { pod: PodDetail }) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);

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
                router.push("/pods");
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
        {pod.members.map((m, i) => (
          <div
            key={m.user_id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <span className="w-5 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
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
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5" style={{ color: "hsl(var(--module-money))" }} />
              {m.stat?.streak ?? 0}
            </div>
            <div className="w-16 text-right">
              <p className="text-base font-semibold tabular-nums" style={{ color: "hsl(var(--module-readiness))" }}>
                {m.stat?.readiness ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">readiness</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
