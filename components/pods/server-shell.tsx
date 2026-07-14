"use client";

import { ServerRail } from "@/components/pods/server-rail";
import { ChannelSidebar } from "@/components/pods/channel-sidebar";
import type { PodSummary, ServerDetail } from "@/lib/pods/types";

/** Discord-style three-pane server view: rail · channel sidebar · main pane. */
export function ServerShell({
  servers,
  server,
  activeChannelId,
  children,
}: {
  servers: PodSummary[];
  server: ServerDetail;
  activeChannelId: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[78vh] overflow-hidden rounded-card border">
      <ServerRail servers={servers} activeId={server.id} />
      <ChannelSidebar server={server} activeChannelId={activeChannelId} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
