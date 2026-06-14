import {
  getCareerTargets,
  getGoalsWithMilestones,
  getStudyStreak,
} from "@/lib/goals/queries";
import { GoalsClient } from "@/components/goals/goals-client";
import { CareerPanel } from "@/components/goals/career-panel";
import { PageHeader } from "@/components/shell/page-header";

export default async function GoalsPage() {
  const [goals, career, streak] = await Promise.all([
    getGoalsWithMilestones(),
    getCareerTargets(),
    getStudyStreak(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Track personal and exam goals, milestones, and your career targets."
        colorVar="--module-goals"
        mark="/brand/module-goals.svg"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GoalsClient goals={goals} streak={streak} />
        <div className="space-y-6">
          <CareerPanel targets={career} />
        </div>
      </div>
    </div>
  );
}
