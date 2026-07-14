import { getMyPods, listPublicServers } from "@/lib/pods/queries";
import { ServerRail } from "@/components/pods/server-rail";
import { Discover } from "@/components/pods/discover";

export default async function DiscoverPage() {
  const [servers, publicServers] = await Promise.all([
    getMyPods(),
    listPublicServers(),
  ]);

  return (
    <div className="flex h-[78vh] overflow-hidden rounded-card border">
      <ServerRail servers={servers} activeId={null} />
      <div className="flex-1 overflow-y-auto p-8">
        <Discover initial={publicServers} myServerIds={servers.map((s) => s.id)} />
      </div>
    </div>
  );
}
