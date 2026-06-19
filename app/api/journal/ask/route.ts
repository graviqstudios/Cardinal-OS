import { convertToCoreMessages, streamText } from "ai";

import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/models";
import { JOURNAL_ASK_SYSTEM, journalContext } from "@/lib/ai/prompts";
import { embedQuery } from "@/lib/ai/embeddings";
import { checkRateLimit } from "@/lib/ratelimit";

// Node.js runtime — never edge (Supabase SSR + AI assume full Node).
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const rl = await checkRateLimit(user.id, "journal-ask");
  if (!rl.success) {
    return new Response("Rate limit exceeded. Try again shortly.", { status: 429 });
  }

  const { messages } = await req.json();
  const coreMessages = convertToCoreMessages(messages);

  const lastUser = [...messages]
    .reverse()
    .find((m: { role: string }) => m.role === "user") as
    | { content: string }
    | undefined;

  // RAG: retrieve the most similar chunks from the user's own journal.
  let contextBlock: string | null = null;
  if (lastUser?.content) {
    try {
      const embedding = await embedQuery(lastUser.content);
      const { data: chunks } = await supabase.rpc("match_journal_chunks", {
        query_embedding: embedding,
        p_user_id: user.id,
        match_count: 6,
      });
      contextBlock = journalContext((chunks ?? []) as { content: string }[]);
    } catch {
      contextBlock = null;
    }
  }

  const result = streamText({
    model: chatModel(),
    system: contextBlock
      ? `${JOURNAL_ASK_SYSTEM}\n\n${contextBlock}`
      : `${JOURNAL_ASK_SYSTEM}\n\n(No matching journal entries were found for this question.)`,
    messages: coreMessages,
  });

  return result.toDataStreamResponse();
}
