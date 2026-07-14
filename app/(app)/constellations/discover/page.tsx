import { getMyPods } from "@/lib/pods/queries";
import { ServerRail } from "@/components/pods/server-rail";
import { Card, CardContent } from "@/components/ui/card";

// Placeholder until Phase 2 builds the public directory.
export default async function DiscoverPage() {
  const servers = await getMyPods();
  return (
    <div className="flex h-[78vh] overflow-hidden rounded-card border">
      <ServerRail servers={servers} activeId={null} />
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="font-serif text-2xl tracking-tight">Discover</h1>
        <Card className="mt-4">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            A public directory of study servers is coming soon.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
