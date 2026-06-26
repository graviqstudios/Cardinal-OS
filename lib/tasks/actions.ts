"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import type { Priority, TaskStatus } from "@/lib/tasks/types";

type Result = { ok: true } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

function refresh() {
  revalidatePath("/plan");
  revalidatePath("/today");
}

export async function createTask(input: {
  title: string;
  status?: TaskStatus;
  priority?: Priority | null;
  due_date?: string | null;
  project_id?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.title.trim()) return { ok: false, error: "Title is required." };

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title: input.title.trim(),
    status: input.status ?? "today",
    priority: input.priority ?? null,
    due_date: input.due_date ?? null,
    project_id: input.project_id ?? null,
  });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Link a task to a project (or clear it with null). */
export async function setTaskProject(
  id: string,
  projectId: string | null,
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("tasks")
    .update({ project_id: projectId })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Quick toggle between done and today. */
export async function toggleTaskDone(id: string, done: boolean): Promise<Result> {
  return setTaskStatus(id, done ? "done" : "today");
}

export async function deleteTask(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
