import { LayoutGrid } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getHabitsWithToday } from "@/lib/habits/queries";
import { getTasksGrouped } from "@/lib/tasks/queries";
import { getProjectsWithCounts } from "@/lib/projects/queries";
import {
  getCareerTargets,
  getGoalsWithMilestones,
  getStudyStreak,
} from "@/lib/goals/queries";
import { getSkills } from "@/lib/skills/queries";
import { PageHeader } from "@/components/shell/page-header";
import { PlanClient, type PlanTab } from "@/components/plan/plan-client";
import { QuickCapture } from "@/components/today/quick-capture";

const TABS: PlanTab[] = ["habits", "tasks", "projects", "goals"];

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: PlanTab = TABS.includes(tab as PlanTab) ? (tab as PlanTab) : "habits";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("exam_mode").eq("id", user.id).maybeSingle()
    : { data: null };
  const examMode = Boolean(profile?.exam_mode);

  const [habits, grouped, projects, goals, career, streak, skills] = await Promise.all([
    getHabitsWithToday(),
    getTasksGrouped(),
    getProjectsWithCounts(),
    getGoalsWithMilestones(),
    examMode ? getCareerTargets() : Promise.resolve([]),
    examMode ? getStudyStreak() : Promise.resolve(0),
    getSkills(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan"
        description="Habits, tasks, projects and goals, all in one place. Capture fast, follow through."
        colorVar="--module-tasks"
        icon={<LayoutGrid className="h-5 w-5" />}
      />
      <PlanClient
        initialTab={initialTab}
        habits={habits}
        tasksGrouped={grouped}
        tasksProjects={projects.map((p) => ({ id: p.id, name: p.name }))}
        projects={projects}
        goals={goals}
        streak={streak}
        examMode={examMode}
        skills={skills}
        careerTargets={career}
      />
      <QuickCapture />
    </div>
  );
}
