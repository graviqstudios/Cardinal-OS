import { Activity } from "lucide-react";

import { getBodyOverview } from "@/lib/body/queries";
import { PageHeader } from "@/components/shell/page-header";
import { BodyClient } from "@/components/body/body-client";

export default async function BodyPage() {
  const overview = await getBodyOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Body"
        description="Sleep, energy, movement and focus. Notice the rhythm, never force it."
        colorVar="--module-readiness"
        icon={<Activity className="h-5 w-5" />}
      />
      {overview && <BodyClient overview={overview} />}
    </div>
  );
}
