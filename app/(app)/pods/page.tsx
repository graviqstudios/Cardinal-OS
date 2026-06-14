import { Users } from "lucide-react";

import { getMyPods, getPodDetail } from "@/lib/pods/queries";
import { PageHeader } from "@/components/shell/page-header";
import { PodsClient } from "@/components/pods/pods-client";
import { PodDetailView } from "@/components/pods/pod-detail-view";
import { PodStatsPublisher } from "@/components/pods/pod-stats-publisher";
import { Card, CardContent } from "@/components/ui/card";

export default async function PodsPage({
  searchParams,
}: {
  searchParams: Promise<{ pod?: string }>;
}) {
  const sp = await searchParams;
  const pods = await getMyPods();
  const selectedId = sp.pod && pods.some((p) => p.id === sp.pod) ? sp.pod : null;
  const detail = selectedId ? await getPodDetail(selectedId) : null;

  return (
    <div className="space-y-6">
      <PodStatsPublisher />

      <PageHeader
        title="Study pods"
        description="A quiet, shared dashboard with 4–6 students. No feed, no chat — just everyone's progress, live."
        icon={<Users className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <PodsClient pods={pods} selectedId={selectedId} />
        <div>
          {detail ? (
            <PodDetailView pod={detail} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Select a pod to see your shared dashboard, or create one to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
