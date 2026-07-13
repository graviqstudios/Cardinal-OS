"use client";

import * as React from "react";
import {
  Loader2,
  Play,
  Square,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { createPodMeet, startPodTimer, stopPodTimer } from "@/lib/pods/rooms";
import type { PodTimer } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

type Presence = { user_id: string; name: string };

export function StudyRoom({
  podId,
  podName,
  roomName,
  currentUserId,
  currentName,
  initialTimer,
  googleConnected,
}: {
  podId: string;
  podName: string;
  roomName: string;
  currentUserId: string;
  currentName: string;
  initialTimer: PodTimer | null;
  googleConnected: boolean;
}) {
  const [present, setPresent] = React.useState<Presence[]>([]);
  const [timer, setTimer] = React.useState<PodTimer | null>(initialTimer);
  const [now, setNow] = React.useState(() => Date.now());
  const [joined, setJoined] = React.useState(false);
  const [meetPending, setMeetPending] = React.useState(false);
  const [meetError, setMeetError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Presence: who is in the room right now.
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`pod-presence-${podId}`, {
      config: { presence: { key: currentUserId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Presence>();
        const people: Presence[] = [];
        for (const key of Object.keys(state)) {
          const meta = state[key][0];
          if (meta) people.push({ user_id: meta.user_id, name: meta.name });
        }
        setPresent(people);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: currentUserId, name: currentName });
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [podId, currentUserId, currentName]);

  // Shared timer: react to pod_timer changes over Realtime.
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

  // Local tick for the countdown.
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs =
    timer?.ends_at != null ? Date.parse(timer.ends_at) - now : 0;
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

  async function makeMeet() {
    setMeetPending(true);
    setMeetError(null);
    const res = await createPodMeet(podId, podName);
    setMeetPending(false);
    if (res.ok && res.data) {
      window.open(res.data.url, "_blank", "noopener");
    } else if (!res.ok) {
      setMeetError(res.error);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Study room</CardTitle>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {present.length} here
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presence avatars */}
        {present.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {present.map((p) => (
              <span
                key={p.user_id}
                title={p.name}
                className="inline-flex items-center gap-1.5 rounded-pill border bg-muted/40 px-2 py-0.5 text-xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--status-strong))]" />
                {p.name}
              </span>
            ))}
          </div>
        )}

        {/* Shared timer */}
        <div className="flex flex-wrap items-center gap-3 rounded-card border p-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Shared timer</p>
            <p className="font-serif text-3xl tabular-nums leading-none">
              {running ? formatMs(remainingMs) : "--:--"}
            </p>
            {running && timer?.label && (
              <p className="mt-1 text-xs text-muted-foreground">{timer.label}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {running ? (
              <Tap className="inline-flex">
                <Button variant="outline" size="sm" onClick={stop} disabled={busy}>
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </Tap>
            ) : (
              <>
                <Tap className="inline-flex">
                  <Button size="sm" onClick={() => start(25)} disabled={busy}>
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    25 min
                  </Button>
                </Tap>
                <Tap className="inline-flex">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => start(50)}
                    disabled={busy}
                  >
                    50 min
                  </Button>
                </Tap>
              </>
            )}
          </div>
        </div>

        {/* Video */}
        {joined ? (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-card border">
              <iframe
                title="Study room video"
                src={`https://meet.jit.si/${encodeURIComponent(roomName)}`}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="h-[420px] w-full"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setJoined(false)}>
              <VideoOff className="h-4 w-4" />
              Leave video
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Tap className="inline-flex">
              <Button onClick={() => setJoined(true)}>
                <Video className="h-4 w-4" />
                Join video (free)
              </Button>
            </Tap>
            {googleConnected && (
              <Tap className="inline-flex">
                <Button
                  variant="outline"
                  onClick={makeMeet}
                  disabled={meetPending}
                >
                  {meetPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  Google Meet
                </Button>
              </Tap>
            )}
          </div>
        )}
        {meetError && <p className="text-xs text-destructive">{meetError}</p>}

        <p className="text-[11px] text-muted-foreground">
          Video is a private Jitsi Meet room only your constellation can reach. No
          account needed - grant camera/mic when prompted.
        </p>
      </CardContent>
    </Card>
  );
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
