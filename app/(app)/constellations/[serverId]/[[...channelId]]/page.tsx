import { redirect } from "next/navigation";
import { Volume2 } from "lucide-react";

import { getUser } from "@/lib/supabase/server";
import { getMyPods, getServerDetail } from "@/lib/pods/queries";
import { getMessages } from "@/lib/pods/chat";
import { ServerShell } from "@/components/pods/server-shell";
import { ConstellationChat } from "@/components/pods/constellation-chat";
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
          <VoicePane channelName={active.name} />
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

function VoicePane({ channelName }: { channelName: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Volume2 className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium">{channelName}</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Live voice &amp; video rooms are coming to this channel. For now, use a
        text channel to chat.
      </p>
    </div>
  );
}
