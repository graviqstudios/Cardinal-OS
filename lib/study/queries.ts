import { createClient, getUser } from "@/lib/supabase/server";
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

/** One subject with its topics (RLS-scoped), or null if not found/owned. */
export async function getSubjectWithTopics(
  subjectId: string,
): Promise<SubjectWithTopics | null> {
  const supabase = await createClient();

  const [{ data: subject }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", subjectId).maybeSingle(),
    supabase
      .from("topics")
      .select("*")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: true }),
  ]);

  if (!subject) return null;
  return { ...(subject as Subject), topics: (topics ?? []) as Topic[] };
}

/** The signed-in user's exam target (name, date, optional target score). */
export async function getStudyTarget(): Promise<{
  exam_target: string | null;
  exam_date: string | null;
  exam_target_score: number | null;
} | null> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("exam_target, exam_date, exam_target_score")
    .eq("id", user.id)
    .maybeSingle();

  return {
    exam_target: (data?.exam_target as string | null) ?? null,
    exam_date: (data?.exam_date as string | null) ?? null,
    exam_target_score: (data?.exam_target_score as number | null) ?? null,
  };
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
  const user = await getUser();
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
