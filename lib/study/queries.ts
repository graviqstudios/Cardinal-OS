import { createClient } from "@/lib/supabase/server";
import type {
  ChatMessageRow,
  DocumentRow,
  Subject,
  SubjectWithTopics,
  Topic,
} from "@/lib/study/types";

/** All subjects for the signed-in user, each with its topics (RLS-scoped). */
export async function getSubjectsWithTopics(): Promise<SubjectWithTopics[]> {
  const supabase = await createClient();

  const [{ data: subjects }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("*").order("created_at", { ascending: true }),
    supabase.from("topics").select("*").order("created_at", { ascending: true }),
  ]);

  const bySubject = new Map<string, Topic[]>();
  for (const t of (topics ?? []) as Topic[]) {
    const list = bySubject.get(t.subject_id) ?? [];
    list.push(t);
    bySubject.set(t.subject_id, list);
  }

  return ((subjects ?? []) as Subject[]).map((s) => ({
    ...s,
    topics: bySubject.get(s.id) ?? [],
  }));
}

export async function getDocuments(): Promise<DocumentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as DocumentRow[];
}

/** Returns the user's chat session id, creating one on first use. */
export async function getOrCreateChatSession(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("chat_sessions")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id, title: "Study chat" })
    .select("id")
    .single();

  return (created?.id as string) ?? null;
}

export async function getChatMessages(
  sessionId: string,
): Promise<ChatMessageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_session_id", sessionId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ChatMessageRow[];
}
