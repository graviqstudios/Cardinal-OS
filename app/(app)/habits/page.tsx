import { Repeat } from "lucide-react";

import { getHabitsWithToday } from "@/lib/habits/queries";
import { PageHeader } from "@/components/shell/page-header";
import { HabitsClient } from "@/components/habits/habits-client";

export default async function HabitsPage() {
  const habits = await getHabitsWithToday();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habits"
        description="The small, daily things that compound. Tap to complete, build a streak."
        colorVar="--module-habits"
        icon={<Repeat className="h-5 w-5" />}
      />
      <HabitsClient habits={habits} />
    </div>
  );
}
