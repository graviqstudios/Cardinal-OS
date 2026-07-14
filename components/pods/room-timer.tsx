"use client";

import * as React from "react";
import { Loader2, Play, Square } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { startPodTimer, stopPodTimer } from "@/lib/pods/rooms";
import type { PodTimer } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Shared, synchronized focus timer for a server's room (pod_timer + Realtime). */
export function RoomTimer({
  podId,
  initialTimer,
  compact = false,
}: {
  podId: string;
  initialTimer: PodTimer | null;
  compact?: boolean;
}) {
  const [timer, setTimer] = React.useState<PodTimer | null>(initialTimer);
  const [now, setNow] = React.useState(() => Date.now());
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pod-timer-${podId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pod_timer",
          filter: `pod_id=eq.${podId}`,
        },
        (payload) => setTimer((payload.new as PodTimer) ?? null),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [podId]);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = timer?.ends_at ? Date.parse(timer.ends_at) - now : 0;
  const running = remainingMs > 0;

  async function start(minutes: number) {
    setBusy(true);
    await startPodTimer(podId, minutes);
    setBusy(false);
  }
  async function stop() {
    setBusy(true);
    await stopPodTimer(podId);
    setBusy(false);
  }

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2 rounded-pill border bg-background/80 px-3 py-1.5 backdrop-blur"
          : "flex items-center gap-3 rounded-card border p-3"
      }
    >
      <span className="font-serif tabular-nums leading-none" style={{ fontSize: compact ? "1.1rem" : "1.75rem" }}>
        {running ? formatMs(remainingMs) : "--:--"}
      </span>
      {running ? (
        <Button variant="outline" size="sm" onClick={stop} disabled={busy}>
          <Square className="h-4 w-4" /> Stop
        </Button>
      ) : (
        <div className="flex gap-1">
          <Button size="sm" onClick={() => start(25)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            25
          </Button>
          <Button size="sm" variant="secondary" onClick={() => start(50)} disabled={busy}>
            50
          </Button>
        </div>
      )}
    </div>
  );
}
