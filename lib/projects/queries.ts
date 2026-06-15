import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectWithCounts } from "@/lib/projects/types";

export async function getProjectsWithCounts(): Promise<ProjectWithCounts[]> {
  const supabase = await createClient();
  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: true }),
    supabase.from("tasks").select("project_id, status"),
  ]);

  const counts = new Map<string, { open: number; total: number }>();
  for (const t of tasks ?? []) {
    if (!t.project_id) continue;
    const e = counts.get(t.project_id as string) ?? { open: 0, total: 0 };
    e.total += 1;
    if (t.status !== "done") e.open += 1;
    counts.set(t.project_id as string, e);
  }

  return ((projects ?? []) as Project[]).map((p) => ({
    ...p,
    openTasks: counts.get(p.id)?.open ?? 0,
    totalTasks: counts.get(p.id)?.total ?? 0,
  }));
}
