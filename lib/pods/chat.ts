"use server";

import { createClient, getUser } from "@/lib/supabase/server";

export type ConstellationMessage = {
  id: string;
  pod_id: string;
  user_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** Recent messages for a constellation, oldest first (RLS limits to members). */
export async function getMessages(podId: string): Promise<ConstellationMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("constellation_messages")
    .select("*")
    .eq("pod_id", podId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as ConstellationMessage[];
}

/** Post a message to a constellation. RLS guarantees the user is a member. */
export async function sendMessage(
  podId: string,
  body: string,
): Promise<Result<ConstellationMessage>> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const text = body.trim();
  if (!text) return { ok: false, error: "Message is empty." };
  if (text.length > 2000) return { ok: false, error: "Message is too long." };

  const { data: profile } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .single();
  const authorName =
    profile?.name?.trim() || profile?.email?.split("@")[0] || "Member";

  const { data, error } = await supabase
    .from("constellation_messages")
    .insert({ pod_id: podId, user_id: user.id, author_name: authorName, body: text })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as ConstellationMessage };
}
