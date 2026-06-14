import { getSubjectsWithTopics } from "@/lib/study/queries";
import { HeatmapGrid } from "@/components/study/heatmap-grid";
import { PageHeader } from "@/components/shell/page-header";

export default async function HeatmapPage() {
  const subjects = await getSubjectsWithTopics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Heat map"
        description="Your whole syllabus at a glance. Tap a topic to update its mastery."
        colorVar="--module-readiness"
        mark="/brand/module-readiness.svg"
      />

      <HeatmapGrid subjects={subjects} />
    </div>
  );
}
