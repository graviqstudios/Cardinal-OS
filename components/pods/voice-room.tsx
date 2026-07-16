"use client";

import "@livekit/components-styles";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2, Video, Volume2 } from "lucide-react";

import type { PodTimer } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";
import { RoomTimer } from "@/components/pods/room-timer";

/**
 * The LiveKit SDK is ~170kB and only matters once you actually join a call, so
 * it's loaded on demand. Statically importing it put the whole SDK in the
 * Constellations bundle even for people just reading a text channel.
 * ssr:false is safe — these components are browser-only anyway.
 */
const LiveKitRoom = dynamic(
  () => import("@livekit/components-react").then((m) => m.LiveKitRoom),
  { ssr: false },
);
const VideoConference = dynamic(
  () => import("@livekit/components-react").then((m) => m.VideoConference),
  { ssr: false },
);

export function VoiceRoom({
  channelId,
  channelName,
  podId,
  configured,
  initialTimer,
}: {
  channelId: string;
  channelName: string;
  podId: string;
  configured: boolean;
  initialTimer: PodTimer | null;
}) {
  const [conn, setConn] = React.useState<{ token: string; url: string } | null>(
    null,
  );
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function join() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/livekit/token?channelId=${encodeURIComponent(channelId)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not join the room.");
      setConn({ token: json.token, url: json.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join the room.");
    } finally {
      setConnecting(false);
    }
  }

  // Connected: full LiveKit conference with the shared timer overlaid.
  if (conn) {
    return (
      <div className="relative h-full" data-lk-theme="default">
        <LiveKitRoom
          serverUrl={conn.url}
          token={conn.token}
          connect
          audio
          video={false}
          onDisconnected={() => setConn(null)}
          className="h-full"
        >
          <VideoConference />
        </LiveKitRoom>
        <div className="absolute right-3 top-3 z-10">
          <RoomTimer podId={podId} initialTimer={initialTimer} compact />
        </div>
      </div>
    );
  }

  // Lobby: channel name + shared timer (works even without LiveKit) + join.
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Volume2 className="h-6 w-6" />
      </span>
      <div>
        <p className="text-lg font-medium">{channelName}</p>
        <p className="text-sm text-muted-foreground">Voice &amp; video study room</p>
      </div>

      <RoomTimer podId={podId} initialTimer={initialTimer} />

      {configured ? (
        <>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Tap className="inline-flex">
            <Button onClick={join} disabled={connecting}>
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              Join voice
            </Button>
          </Tap>
          <p className="max-w-xs text-[11px] text-muted-foreground">
            Grant camera/mic when prompted. Unlimited, in-app, no time limit.
          </p>
        </>
      ) : (
        <p className="max-w-xs text-sm text-muted-foreground">
          Live voice/video isn&apos;t enabled on this deployment yet. The shared
          timer above still works — set up a LiveKit server to turn on rooms.
        </p>
      )}
    </div>
  );
}
