import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getMyPods, getPodTimer, getServerDetail } from "@/lib/pods/queries";
import { getMessages } from "@/lib/pods/chat";
import { isLiveKitConfigured } from "@/lib/livekit/config";
import { ServerShell } from "@/components/pods/server-shell";
import { ConstellationChat } from "@/components/pods/constellation-chat";
import { VoiceRoom } from "@/components/pods/voice-room";
import { PodStatsPublisher } from "@/components/pods/pod-stats-publisher";

export default async function ServerPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId?: string[] }>;
}) {
  const { serverId, channelId } = await params;
  const user = await getUser();

  const [servers, server] = await Promise.all([
    getMyPods(),
    getServerDetail(serverId),
  ]);
  // RLS returns private servers only to members; public servers are visible to
  // everyone, so require membership here and send non-members to Discover.
  if (!server) redirect("/constellations");
  if (!server.members.some((m) => m.isYou)) redirect("/constellations/discover");

  const active =
    (channelId?.[0]
      ? server.channels.find((c) => c.id === channelId[0])
      : undefined) ??
    server.channels.find((c) => c.type === "text") ??
    server.channels[0] ??
    null;

  const messages =
    active && active.type === "text" ? await getMessages(active.id) : [];
  const timer =
    active && active.type === "voice" ? await getPodTimer(server.id) : null;

  return (
    <div className="space-y-4">
      <PodStatsPublisher />
      <ServerShell
        servers={servers}
        server={server}
        activeChannelId={active?.id ?? null}
      >
        {!active ? (
          <EmptyPane />
        ) : active.type === "text" ? (
          <ConstellationChat
            channelId={active.id}
            channelName={active.name}
            podId={server.id}
            initialMessages={messages}
            currentUserId={user?.id ?? ""}
          />
        ) : (
          <VoiceRoom
            channelId={active.id}
            channelName={active.name}
            podId={server.id}
            configured={isLiveKitConfigured}
            initialTimer={timer}
          />
        )}
      </ServerShell>
    </div>
  );
}

function EmptyPane() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
      No channels yet. Owners can add text and voice channels from the sidebar.
    </div>
  );
}
