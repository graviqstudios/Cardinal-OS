"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/study/types";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createStudyTask(input: {
  subjectId: string;
  title: string;
  chapterId?: string | null;
  topicId?: string | null;
  dueDate?: string | null;
}): Promise<Result<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data, error } = await supabase
    .from("study_tasks")
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      chapter_id: input.chapterId ?? null,
      topic_id: input.topicId ?? null,
      title,
      due_date: input.dueDate ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/study");
  return { ok: true, data: { id: data.id as string } };
}

export async function setStudyTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("study_tasks")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}

export async function deleteStudyTask(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("study_tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}
