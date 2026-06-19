"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, FolderKanban, Loader2, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  createTask,
  deleteTask,
  setTaskProject,
  setTaskStatus,
  toggleTaskDone,
} from "@/lib/tasks/actions";
import { createProject } from "@/lib/projects/actions";
import { TASK_BUCKETS, type Task, type TaskStatus } from "@/lib/tasks/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

type ProjectRef = { id: string; name: string };
const NEW = "__new__";

export function TasksClient({
  grouped,
  projects,
}: {
  grouped: Record<TaskStatus, Task[]>;
  projects: ProjectRef[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [projectSel, setProjectSel] = React.useState("");
  const [newProject, setNewProject] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [, start] = React.useTransition();
  const [optDone, setOptDone] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => setOptDone({}), [grouped]);
  const isDone = (t: Task) => optDone[t.id] ?? t.status === "done";

  const projectName = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  function toggleDone(t: Task) {
    const next = !isDone(t);
    setOptDone((o) => ({ ...o, [t.id]: next }));
    start(async () => {
      await toggleTaskDone(t.id, next);
      router.refresh();
    });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);

    let projectId: string | null = null;
    if (projectSel === NEW) {
      if (newProject.trim()) {
        const res = await createProject(newProject.trim());
        if (res.ok && res.data) projectId = res.data.id;
      }
    } else if (projectSel) {
      projectId = projectSel;
    }

    await createTask({ title: title.trim(), status: "today", project_id: projectId });
    setTitle("");
    setNewProject("");
    setProjectSel(projectId ?? "");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-4">
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a task…"
              className="min-w-[12rem] flex-1"
            />
            <select
              value={projectSel}
              onChange={(e) => setProjectSel(e.target.value)}
              aria-label="Project"
              className="h-10 rounded-button border border-input bg-transparent px-2 text-sm"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value={NEW}>+ New project…</option>
            </select>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </form>
          {projectSel === NEW && (
            <Input
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              placeholder="New project name…"
              className="h-9"
            />
          )}
        </CardContent>
      </Card>

      {TASK_BUCKETS.map((bucket) => {
        const items = grouped[bucket.id];
        if (bucket.id === "done" && items.length === 0) return null;
        return (
          <section key={bucket.id} className="space-y-1.5">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {bucket.label}{" "}
              <span className="text-muted-foreground/60">{items.length || ""}</span>
            </h2>
            {items.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground/70">—</p>
            ) : (
              <Card>
                <CardContent className="space-y-1 p-3">
                  {items.map((t) => (
                    <div key={t.id} className="flex items-center gap-2.5 rounded-button px-1 py-1.5">
                      <Tap className="inline-flex">
                        <button
                          onClick={() => toggleDone(t)}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border",
                            isDone(t)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input hover:border-primary",
                          )}
                          aria-label="Toggle done"
                        >
                          {isDone(t) && <Check className="h-3 w-3" />}
                        </button>
                      </Tap>
                      <span className={cn("flex-1 truncate text-sm", isDone(t) && "text-muted-foreground line-through")}>
                        {t.title}
                      </span>
                      {t.project_id && projectName.has(t.project_id) && (
                        <span
                          className="hidden items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium sm:inline-flex"
                          style={{
                            backgroundColor: "hsl(var(--module-projects) / 0.12)",
                            color: "hsl(var(--module-projects))",
                          }}
                        >
                          <FolderKanban className="h-3 w-3" />
                          {projectName.get(t.project_id)}
                        </span>
                      )}
                      <select
                        value={t.project_id ?? ""}
                        onChange={(e) =>
                          start(async () => {
                            await setTaskProject(t.id, e.target.value || null);
                            router.refresh();
                          })
                        }
                        className="h-7 rounded-button border border-input bg-transparent px-1.5 text-xs"
                        aria-label="Assign project"
                      >
                        <option value="">No project</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={t.status}
                        onChange={(e) =>
                          start(async () => {
                            await setTaskStatus(t.id, e.target.value as TaskStatus);
                            router.refresh();
                          })
                        }
                        className="h-7 rounded-button border border-input bg-transparent px-1.5 text-xs"
                        aria-label="Move task"
                      >
                        {TASK_BUCKETS.map((b) => (
                          <option key={b.id} value={b.id}>{b.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => start(async () => { await deleteTask(t.id); router.refresh(); })}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>
        );
      })}
    </div>
  );
}
