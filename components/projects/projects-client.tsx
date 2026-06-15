"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import {
  createProject,
  deleteProject,
  generateProjectTasks,
  setProjectProgress,
  setProjectStatus,
} from "@/lib/projects/actions";
import {
  PROJECT_STATUSES,
  type ProjectStatus,
  type ProjectWithCounts,
} from "@/lib/projects/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

export function ProjectsClient({ projects }: { projects: ProjectWithCounts[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [, start] = React.useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const n = name;
    setName("");
    start(async () => {
      await createProject(n);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={add} className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project (e.g. Launch portfolio site)" />
            <Button type="submit" disabled={!name.trim()}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {projects.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          No projects yet. A project is anything bigger than a single task.
        </p>
      )}

      {PROJECT_STATUSES.map((s) => {
        const group = projects.filter((p) => p.status === s.id);
        if (group.length === 0) return null;
        return (
          <section key={s.id} className="space-y-2">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </h2>
            <div className="space-y-2">
              {group.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectWithCounts }) {
  const router = useRouter();
  const [progress, setProgress] = React.useState(project.progress);
  const [gen, setGen] = React.useState(false);
  const [, start] = React.useTransition();

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span
            className="h-8 w-1.5 rounded-pill"
            style={{ backgroundColor: "hsl(var(--module-projects))" }}
          />
          <span className="flex-1 truncate text-sm font-medium">{project.name}</span>
          <select
            value={project.status}
            onChange={(e) => start(async () => { await setProjectStatus(project.id, e.target.value as ProjectStatus); router.refresh(); })}
            className="h-7 rounded-button border border-input bg-transparent px-1.5 text-xs"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => start(async () => { await deleteProject(project.id); router.refresh(); })}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{project.totalTasks > 0 ? `${project.openTasks} open · ${project.totalTasks} tasks` : "No tasks yet"}</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-muted">
            <div
              className="h-full rounded-pill transition-all duration-200"
              style={{ width: `${progress}%`, backgroundColor: "hsl(var(--module-projects))" }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            onPointerUp={() => start(async () => { await setProjectProgress(project.id, progress); router.refresh(); })}
            onKeyUp={() => start(async () => { await setProjectProgress(project.id, progress); router.refresh(); })}
            className="mt-2 w-full accent-[hsl(var(--module-projects))]"
          />
        </div>

        <Tap className="inline-flex">
          <Button
            variant="ghost"
            size="sm"
            disabled={gen}
            onClick={async () => {
              setGen(true);
              await generateProjectTasks(project.id, project.name);
              setGen(false);
              router.refresh();
            }}
          >
            {gen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Break into tasks
          </Button>
        </Tap>
      </CardContent>
    </Card>
  );
}
