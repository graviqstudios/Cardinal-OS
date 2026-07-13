"use server";

import { createClient, getUser } from "@/lib/supabase/server";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

export type ChatSessionSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export type ChatTurn = { id: string; role: "user" | "assistant"; content: string };

/** Start a fresh chat session and return its id. */
export async function createChatSession(): Promise<Result<{ id: string }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, title: "New chat" })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id as string } };
}

/** The user's chat sessions, most recently updated first. */
export async function listChatSessions(): Promise<Result<ChatSessionSummary[]>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as ChatSessionSummary[] };
}

/** All messages of a session (oldest first), for switching threads. */
export async function getSessionMessages(
  sessionId: string,
): Promise<Result<ChatTurn[]>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content")
    .eq("chat_session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const turns = ((data ?? []) as { id: string; role: string; content: string }[])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }));
  return { ok: true, data: turns };
}

export async function renameChatSession(
  sessionId: string,
  title: string,
): Promise<Result> {
  const trimmed = title.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Title is required." };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("chat_sessions")
    .update({ title: trimmed })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteChatSession(sessionId: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  // chat_messages cascade-delete via FK (0002_study.sql).
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Persist a session's full transcript. Replaces the stored messages with the
 * provided list so the client owns edit/regenerate/branch semantics: the
 * client sends the exact conversation state and we mirror it. Also derives the
 * session title from the first user message and bumps updated_at.
 */
export async function saveSessionMessages(
  sessionId: string,
  turns: ChatTurn[],
): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  await supabase.from("chat_messages").delete().eq("chat_session_id", sessionId);

  const base = Date.now();
  const rows = turns
    .filter((t) => t.role === "user" || t.role === "assistant")
    .map((t, i) => ({
      user_id: userId,
      chat_session_id: sessionId,
      role: t.role,
      content: t.content,
      // Monotonic timestamps keep the load order stable.
      created_at: new Date(base + i * 1000).toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("chat_messages").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  const firstUser = turns.find((t) => t.role === "user")?.content;
  const title = firstUser ? firstUser.trim().slice(0, 80) : "New chat";
  await supabase
    .from("chat_sessions")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  return { ok: true };
}
