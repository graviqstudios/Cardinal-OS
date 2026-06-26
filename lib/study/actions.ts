"use server";

import { revalidatePath } from "next/cache";
import { generateText } from "ai";

import { createClient, getUser } from "@/lib/supabase/server";
import { isMockAI, liteModel } from "@/lib/ai/models";
import { topicsSystem } from "@/lib/ai/prompts";
import type { TopicStatus } from "@/lib/study/types";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createSubject(name: string): Promise<Result<{ id: string }>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data, error } = await supabase
    .from("subjects")
    .insert({ user_id: userId, name: trimmed })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/study");
  return { ok: true, data: { id: data.id as string } };
}

export async function renameSubject(id: string, name: string): Promise<Result> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("subjects")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}

export async function addTopic(
  subjectId: string,
  name: string,
): Promise<Result> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("topics")
    .insert({ user_id: userId, subject_id: subjectId, name: trimmed });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}

export async function deleteTopic(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}

export async function setTopicStatus(
  id: string,
  status: TopicStatus,
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("topics")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/study");
  return { ok: true };
}

/** AI-generate a topic list for a subject from its name (or an exam name). */
export async function generateTopics(
  subjectId: string,
  subjectName: string,
): Promise<Result<{ added: number }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  let names: string[];
  if (isMockAI) {
    names = mockTopics(subjectName);
  } else {
    try {
      const { text } = await generateText({
        model: liteModel(),
        system: topicsSystem(subjectName),
        prompt: `Generate the topic list for: ${subjectName}`,
      });
      names = text
        .split("\n")
        .map((l) => l.replace(/^[\s\-*\d.)]+/, "").trim())
        .filter((l) => l.length > 1 && l.length < 120)
        .slice(0, 24);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Generation failed.",
      };
    }
  }

  if (names.length === 0) return { ok: false, error: "No topics generated." };

  const rows = names.map((name) => ({
    user_id: userId,
    subject_id: subjectId,
    name,
  }));
  const { error } = await supabase.from("topics").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/study");
  return { ok: true, data: { added: names.length } };
}

function mockTopics(name: string): string[] {
  const base = name.trim() || "Subject";
  return [
    `${base}: Foundations`,
    `${base}: Core concepts`,
    `${base}: Key formulas`,
    `${base}: Common problem types`,
    `${base}: Applications`,
    `${base}: Advanced topics`,
  ];
}
