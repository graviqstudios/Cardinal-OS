"use server";

import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { z } from "zod";

import { createClient, getUser } from "@/lib/supabase/server";
import { isMockAI, liteModel } from "@/lib/ai/models";
import type { ProjectStatus } from "@/lib/projects/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

function refresh() {
  revalidatePath("/plan");
  revalidatePath("/today");
}

export async function createProject(
  name: string,
  status: ProjectStatus = "active",
): Promise<Result<{ id: string }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!name.trim()) return { ok: false, error: "Name is required." };
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name: name.trim(), status })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: { id: data.id as string } };
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setProjectProgress(id: string, progress: number): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const { error } = await supabase.from("projects").update({ progress: clamped }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteProject(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** AI: break a project into 3–6 concrete next-action tasks (Gemini Flash). */
export async function generateProjectTasks(
  projectId: string,
  projectName: string,
): Promise<Result<{ added: number }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  let titles: string[];
  if (isMockAI) {
    titles = [
      `Define the goal of ${projectName}`,
      `List what's needed for ${projectName}`,
      `Do the first concrete step`,
      `Review progress on ${projectName}`,
    ];
  } else {
    try {
      const { object } = await generateObject({
        model: liteModel(),
        schema: z.object({ tasks: z.array(z.string()).min(1) }),
        system:
          "Break a project into 3–6 concrete, actionable next-step tasks. Each is a short imperative phrase (e.g. 'Draft the outline'). No numbering.",
        prompt: `Project: ${projectName}`,
      });
      titles = object.tasks.slice(0, 6).map((t) => t.trim()).filter(Boolean);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Generation failed." };
    }
  }

  if (titles.length === 0) return { ok: false, error: "No tasks generated." };
  const rows = titles.map((title) => ({
    user_id: userId,
    title,
    status: "next" as const,
    project_id: projectId,
  }));
  const { error } = await supabase.from("tasks").insert(rows);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: { added: titles.length } };
}
