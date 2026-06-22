import { HeartPulse } from "lucide-react";

import { getBodyOverview } from "@/lib/body/queries";
import { PageHeader } from "@/components/shell/page-header";
import { HealthClient } from "@/components/health/health-client";

export default async function HealthPage() {
  const overview = await getBodyOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health"
        description="Sleep, energy, mood, movement and mind. Notice the rhythm, never force it."
        colorVar="--module-readiness"
        icon={<HeartPulse className="h-5 w-5" />}
      />
      {overview && <HealthClient overview={overview} />}
    </div>
  );
}
