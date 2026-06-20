"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { deleteToken } from "@/lib/integrations/tokens";
import type { ProviderId } from "@/lib/integrations/registry";

type Result = { ok: true } | { ok: false; error: string };

/** Disconnect a provider: removes the stored (encrypted) tokens for this user. */
export async function disconnectProvider(provider: ProviderId): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  await deleteToken(user.id, provider);
  revalidatePath("/settings/integrations");
  return { ok: true };
}

/** Create tasks from accepted draft titles (e.g. from a Gmail scan). */
export async function importTasks(titles: string[]): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const rows = titles
    .map((t) => t.trim())
    .filter(Boolean)
    .map((title) => ({ user_id: user.id, title, status: "next" as const }));
  if (rows.length === 0) return { ok: true };

  const { error } = await supabase.from("tasks").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/today");
  return { ok: true };
}
