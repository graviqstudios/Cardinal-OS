"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import type { ChannelType } from "@/lib/pods/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createCategory(
  podId: string,
  name: string,
): Promise<Result<{ id: string }>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data: last } = await supabase
    .from("channel_categories")
    .select("position")
    .eq("pod_id", podId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("channel_categories")
    .insert({ pod_id: podId, name: trimmed, position })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/constellations/${podId}`);
  return { ok: true, data: { id: data.id as string } };
}

export async function createChannel(input: {
  podId: string;
  name: string;
  type: ChannelType;
  categoryId?: string | null;
}): Promise<Result<{ id: string }>> {
  const trimmed = input.name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data: last } = await supabase
    .from("channels")
    .select("position")
    .eq("pod_id", input.podId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("channels")
    .insert({
      pod_id: input.podId,
      category_id: input.categoryId ?? null,
      name: trimmed,
      type: input.type,
      position,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/constellations/${input.podId}`);
  return { ok: true, data: { id: data.id as string } };
}

export async function renameChannel(
  podId: string,
  channelId: string,
  name: string,
): Promise<Result> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("channels")
    .update({ name: trimmed })
    .eq("id", channelId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/constellations/${podId}`);
  return { ok: true };
}

export async function deleteChannel(
  podId: string,
  channelId: string,
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("channels").delete().eq("id", channelId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/constellations/${podId}`);
  return { ok: true };
}

export async function deleteCategory(
  podId: string,
  categoryId: string,
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  // Channels in the category keep existing (category_id set null via FK).
  const { error } = await supabase
    .from("channel_categories")
    .delete()
    .eq("id", categoryId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/constellations/${podId}`);
  return { ok: true };
}
