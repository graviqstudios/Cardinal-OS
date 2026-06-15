import { FolderKanban } from "lucide-react";

import { getProjectsWithCounts } from "@/lib/projects/queries";
import { PageHeader } from "@/components/shell/page-header";
import { ProjectsClient } from "@/components/projects/projects-client";

export default async function ProjectsPage() {
  const projects = await getProjectsWithCounts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="The bigger things you're moving forward. Track progress, break them into next actions."
        colorVar="--module-projects"
        icon={<FolderKanban className="h-5 w-5" />}
      />
      <ProjectsClient projects={projects} />
    </div>
  );
}
