import { convertToCoreMessages, streamText } from "ai";

import { createClient, getUser } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/models";
import { studyAssistantSystem, ragContext } from "@/lib/ai/prompts";
import { embedQuery } from "@/lib/ai/embeddings";
import { getBudget, recordUsage } from "@/lib/ai/usage";
import { checkRateLimit } from "@/lib/ratelimit";

// Node.js runtime - never edge (Supabase SSR + AI assume full Node).
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const rl = await checkRateLimit(user.id, "study-assistant");
  if (!rl.success) {
    return new Response("Rate limit exceeded. Try again shortly.", {
      status: 429,
    });
  }

  const budget = await getBudget(supabase, user.id);
  if (budget.remaining <= 0) {
    return new Response(
      "You've used today's AI budget. It resets tomorrow.",
      { status: 429 },
    );
  }

  const { messages, subjectId, subjectName } = await req.json();
  const coreMessages = convertToCoreMessages(messages);

  const lastUser = [...messages]
    .reverse()
    .find((m: { role: string }) => m.role === "user") as
    | { content: string }
    | undefined;

  // RAG: retrieve the most similar chunks from the user's notes for this subject.
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
      contextBlock = null;
    }
  }

  const system = studyAssistantSystem(subjectName ?? null);
  const result = streamText({
    model: chatModel(),
    system: contextBlock ? `${system}\n\n${contextBlock}` : system,
    messages: coreMessages,
    async onFinish({ usage }) {
      await recordUsage(
        supabase,
        usage?.promptTokens ?? 0,
        usage?.completionTokens ?? 0,
      );
    },
  });

  return result.toDataStreamResponse();
}
