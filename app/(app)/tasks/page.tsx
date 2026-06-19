import { ListChecks } from "lucide-react";

import { getTasksGrouped } from "@/lib/tasks/queries";
import { getProjectsWithCounts } from "@/lib/projects/queries";
import { PageHeader } from "@/components/shell/page-header";
import { TasksClient } from "@/components/tasks/tasks-client";
import { QuickCapture } from "@/components/today/quick-capture";

export default async function TasksPage() {
  const [grouped, projects] = await Promise.all([
    getTasksGrouped(),
    getProjectsWithCounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Everything you need to do, in calm buckets. Capture fast, finish what matters."
        colorVar="--module-tasks"
        icon={<ListChecks className="h-5 w-5" />}
      />
      <TasksClient
        grouped={grouped}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
      <QuickCapture />
    </div>
  );
}
