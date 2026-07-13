import { Sparkles } from "lucide-react";

import { createClient, getUser } from "@/lib/supabase/server";
import { getMyPods, getPodDetail } from "@/lib/pods/queries";
import { getMessages } from "@/lib/pods/chat";
import { PageHeader } from "@/components/shell/page-header";
import { PodsClient } from "@/components/pods/pods-client";
import { PodDetailView } from "@/components/pods/pod-detail-view";
import { PodStatsPublisher } from "@/components/pods/pod-stats-publisher";
import { ConstellationChat } from "@/components/pods/constellation-chat";
import { Card, CardContent } from "@/components/ui/card";

export default async function ConstellationsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; pod?: string }>;
}) {
  const sp = await searchParams;
  const requested = sp.c ?? sp.pod ?? undefined;

  const user = await getUser();

  const pods = await getMyPods();
  const selectedId =
    requested && pods.some((p) => p.id === requested) ? requested : null;
  const [detail, messages] = await Promise.all([
    selectedId ? getPodDetail(selectedId) : Promise.resolve(null),
    selectedId ? getMessages(selectedId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PodStatsPublisher />

      <PageHeader
        title="Constellations"
        description="A small, private circle of 4–6 people - see everyone's progress and talk it through, live."
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <PodsClient pods={pods} selectedId={selectedId} />
        <div className="space-y-6">
          {detail ? (
            <>
              <PodDetailView pod={detail} />
              <ConstellationChat
                podId={detail.id}
                initialMessages={messages}
                currentUserId={user?.id ?? ""}
              />
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Select a constellation to see everyone&apos;s progress, or create
                one to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
