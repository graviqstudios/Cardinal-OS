"use client";

import { ServerRail } from "@/components/pods/server-rail";
import { ChannelSidebar } from "@/components/pods/channel-sidebar";
import { MembersPanel } from "@/components/pods/members-panel";
import type { PodSummary, ServerDetail } from "@/lib/pods/types";

/** Discord-style panes: rail · channel sidebar · main pane · members list. */
export function ServerShell({
  servers,
  server,
  activeChannelId,
  currentUserId,
  children,
}: {
  servers: PodSummary[];
  server: ServerDetail;
  activeChannelId: string | null;
  currentUserId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[78vh] overflow-hidden rounded-card border">
      <ServerRail servers={servers} activeId={server.id} />
      <ChannelSidebar server={server} activeChannelId={activeChannelId} />
      <main className="min-w-0 flex-1">{children}</main>
      <MembersPanel
        members={server.members}
        podId={server.id}
        currentUserId={currentUserId}
      />
    </div>
  );
}
