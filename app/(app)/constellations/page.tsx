import { getMyPods } from "@/lib/pods/queries";
import { ServerRail } from "@/components/pods/server-rail";
import { ConstellationsHome } from "@/components/pods/constellations-home";
import { PodStatsPublisher } from "@/components/pods/pod-stats-publisher";

export default async function ConstellationsPage() {
  const servers = await getMyPods();

  return (
    <div className="flex h-[78vh] overflow-hidden rounded-card border">
      <PodStatsPublisher />
      <ServerRail servers={servers} activeId={null} />
      <div className="flex-1 overflow-y-auto p-8">
        <ConstellationsHome servers={servers} />
      </div>
    </div>
  );
}
