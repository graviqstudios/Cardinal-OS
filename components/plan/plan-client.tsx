"use client";

import * as React from "react";
import { FolderKanban, ListChecks, Repeat, Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { HabitsClient } from "@/components/habits/habits-client";
import { TasksClient } from "@/components/tasks/tasks-client";
import { ProjectsClient } from "@/components/projects/projects-client";
import { GoalsClient } from "@/components/goals/goals-client";
import { SkillTree } from "@/components/skills/skill-tree";
import { CareerPanel } from "@/components/goals/career-panel";

export type PlanTab = "habits" | "tasks" | "projects" | "goals";

const TABS: { id: PlanTab; label: string; icon: typeof Repeat; colorVar: string }[] = [
  { id: "habits", label: "Habits", icon: Repeat, colorVar: "--module-habits" },
  { id: "tasks", label: "Tasks", icon: ListChecks, colorVar: "--module-tasks" },
  { id: "projects", label: "Projects", icon: FolderKanban, colorVar: "--module-projects" },
  { id: "goals", label: "Goals", icon: Target, colorVar: "--module-goals" },
];

export function PlanClient({
  initialTab,
  habits,
  tasksGrouped,
  tasksProjects,
  projects,
  goals,
  streak,
  examMode,
  skills,
  careerTargets,
}: {
  initialTab: PlanTab;
  habits: React.ComponentProps<typeof HabitsClient>["habits"];
  tasksGrouped: React.ComponentProps<typeof TasksClient>["grouped"];
  tasksProjects: React.ComponentProps<typeof TasksClient>["projects"];
  projects: React.ComponentProps<typeof ProjectsClient>["projects"];
  goals: React.ComponentProps<typeof GoalsClient>["goals"];
  streak: number;
  examMode: boolean;
  skills: React.ComponentProps<typeof SkillTree>["skills"];
  careerTargets: React.ComponentProps<typeof CareerPanel>["targets"];
}) {
  const [tab, setTab] = React.useState<PlanTab>(initialTab);

  // Keep the URL shareable without a server round trip (data is already loaded).
  function select(next: PlanTab) {
    setTab(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url);
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Plan sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => select(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-pill border px-3.5 py-2 text-sm font-medium transition-colors",
                active ? "text-foreground" : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              style={
                active
                  ? {
                      backgroundColor: `hsl(var(${t.colorVar}) / 0.12)`,
                      borderColor: `hsl(var(${t.colorVar}) / 0.4)`,
                    }
                  : undefined
              }
            >
              <Icon className="h-4 w-4" style={{ color: `hsl(var(${t.colorVar}))` }} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === "habits" && <HabitsClient habits={habits} />}
        {tab === "tasks" && <TasksClient grouped={tasksGrouped} projects={tasksProjects} />}
        {tab === "projects" && <ProjectsClient projects={projects} />}
        {tab === "goals" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <GoalsClient goals={goals} streak={streak} examMode={examMode} />
            <div className="space-y-6">
              <SkillTree skills={skills} />
              {examMode && <CareerPanel targets={careerTargets} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
