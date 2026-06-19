"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Priority, TaskStatus } from "@/lib/tasks/types";

type Result = { ok: true } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/today");
}

export async function createTask(input: {
  title: string;
  status?: TaskStatus;
  priority?: Priority | null;
  due_date?: string | null;
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
  });
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
