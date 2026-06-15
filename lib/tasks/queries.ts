import { createClient } from "@/lib/supabase/server";
import type { Task, TaskStatus } from "@/lib/tasks/types";

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Task[];
}

export async function getTasksGrouped(): Promise<Record<TaskStatus, Task[]>> {
  const tasks = await getTasks();
  const grouped: Record<TaskStatus, Task[]> = {
    today: [],
    in_progress: [],
    next: [],
    weekly: [],
    done: [],
  };
  for (const t of tasks) grouped[t.status]?.push(t);
  // Cap the done list so it doesn't grow unbounded in the UI.
  grouped.done = grouped.done.slice(0, 20);
  return grouped;
}

/** Tasks that matter today: status 'today' or 'in_progress', or due today. */
export async function getTodayTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const d = new Date();
  const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

  const { data } = await supabase
    .from("tasks")
    .select("*")
    .neq("status", "done")
    .or(`status.eq.today,status.eq.in_progress,due_date.eq.${todayISO}`)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as Task[];
}
