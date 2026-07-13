"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createChapter(
  subjectId: string,
  name: string,
): Promise<Result<{ id: string }>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  // Append to the end of the subject's chapter order.
  const { data: last } = await supabase
    .from("chapters")
    .select("order_index")
    .eq("subject_id", subjectId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextIndex = ((last?.order_index as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("chapters")
    .insert({
      user_id: userId,
      subject_id: subjectId,
      name: trimmed,
      order_index: nextIndex,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/study");
  return { ok: true, data: { id: data.id as string } };
}

export async function renameChapter(id: string, name: string): Promise<Result> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("chapters")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}

/** Delete a chapter. Its topics survive with chapter_id nulled (FK set null). */
export async function deleteChapter(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}

/** File a topic under a chapter, or pass null to unfile it. */
export async function setTopicChapter(
  topicId: string,
  chapterId: string | null,
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("topics")
    .update({ chapter_id: chapterId })
    .eq("id", topicId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}
