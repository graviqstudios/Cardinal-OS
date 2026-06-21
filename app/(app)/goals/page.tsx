import { createClient } from "@/lib/supabase/server";
import {
  getCareerTargets,
  getGoalsWithMilestones,
  getStudyStreak,
} from "@/lib/goals/queries";
import { getSkills } from "@/lib/skills/queries";
import { GoalsClient } from "@/components/goals/goals-client";
import { CareerPanel } from "@/components/goals/career-panel";
import { SkillTree } from "@/components/skills/skill-tree";
import { PageHeader } from "@/components/shell/page-header";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("exam_mode").eq("id", user.id).maybeSingle()
    : { data: null };
  const examMode = Boolean(profile?.exam_mode);

  const [goals, career, streak, skills] = await Promise.all([
    getGoalsWithMilestones(),
    examMode ? getCareerTargets() : Promise.resolve([]),
    examMode ? getStudyStreak() : Promise.resolve(0),
    getSkills(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Become the person, hit the milestones, and level up the skills that get you there."
        colorVar="--module-goals"
        mark="/brand/module-goals.svg"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GoalsClient goals={goals} streak={streak} examMode={examMode} />
        <div className="space-y-6">
          <SkillTree skills={skills} />
          {examMode && <CareerPanel targets={career} />}
        </div>
      </div>
    </div>
  );
}
