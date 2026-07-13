import { convertToCoreMessages, streamText } from "ai";

import { createClient, getUser } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/models";
import { CHAT_SYSTEM, ragContext } from "@/lib/ai/prompts";
import { embedQuery } from "@/lib/ai/embeddings";
import { checkRateLimit } from "@/lib/ratelimit";

// Node.js runtime - never edge (Supabase SSR + AI assume full Node).
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const rl = await checkRateLimit(user.id, "chat");
  if (!rl.success) {
    return new Response("Rate limit exceeded. Try again shortly.", {
      status: 429,
    });
  }

  const { messages, subjectId } = await req.json();
  const coreMessages = convertToCoreMessages(messages);

  const lastUser = [...messages]
    .reverse()
    .find((m: { role: string }) => m.role === "user") as
    | { content: string }
    | undefined;

  // RAG: retrieve the most similar chunks from the user's notes.
  let contextBlock: string | null = null;
  if (lastUser?.content) {
    try {
      const embedding = await embedQuery(lastUser.content);
      const { data: chunks } = await supabase.rpc("match_document_chunks", {
        query_embedding: embedding,
        p_user_id: user.id,
        match_count: 5,
        p_subject_id: subjectId ?? null,
      });
      contextBlock = ragContext((chunks ?? []) as { content: string }[]);
    } catch {
      // Embedding/search failed (e.g. bad AI key) - answer without retrieval.
      contextBlock = null;
    }
  }

  // Persistence is client-owned (saveSessionMessages) so edit/regenerate stay
  // consistent - the route only streams the reply.
  const result = streamText({
    model: chatModel(),
    system: contextBlock ? `${CHAT_SYSTEM}\n\n${contextBlock}` : CHAT_SYSTEM,
    messages: coreMessages,
  });

  return result.toDataStreamResponse();
}
