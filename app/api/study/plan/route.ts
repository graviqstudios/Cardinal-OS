import { generateObject } from "ai";
import { z } from "zod";

import { createClient, getUser } from "@/lib/supabase/server";
import { isMockAI, reasoningModel } from "@/lib/ai/models";
import { studyPlanSystem, ragContext } from "@/lib/ai/prompts";
import { embedQuery } from "@/lib/ai/embeddings";
import { getBudget, recordUsage } from "@/lib/ai/usage";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  summary: z.string(),
  chapters: z
    .array(
      z.object({
        name: z.string(),
        topics: z.array(z.string()),
      }),
    )
    .min(1),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        dueInDays: z.number().int().min(0).max(365).nullable().optional(),
      }),
    )
    .default([]),
});

export type StudyPlanProposal = z.infer<typeof schema>;

/** Draft a structured, apply-with-confirm study plan for a subject. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "study-plan");
  if (!rl.success) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const budget = await getBudget(supabase, user.id);
  if (budget.remaining <= 0) {
    return Response.json(
      { error: "You've used today's AI budget. It resets tomorrow." },
      { status: 429 },
    );
  }

  const { subjectId, subjectName, prompt } = (await req.json()) as {
    subjectId?: string;
    subjectName?: string;
    prompt?: string;
  };
  const name = (subjectName ?? "").trim() || "this subject";
  const ask = (prompt ?? "").trim();

  if (isMockAI) {
    return Response.json({ proposal: mockPlan(name) });
  }

  // RAG: ground the plan in the student's uploaded notes for this subject.
  let contextBlock: string | null = null;
  try {
    const embedding = await embedQuery(ask || `Study plan for ${name}`);
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

  try {
    const { object, usage } = await generateObject({
      model: reasoningModel(),
      schema,
      system: contextBlock
        ? `${studyPlanSystem(name)}\n\n${contextBlock}`
        : studyPlanSystem(name),
      prompt: ask
        ? `Build a study plan for "${name}". The student asked: ${ask}`
        : `Build a study plan for "${name}".`,
    });
    await recordUsage(
      supabase,
      usage?.promptTokens ?? 0,
      usage?.completionTokens ?? 0,
    );
    return Response.json({ proposal: object });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not draft a plan." },
      { status: 500 },
    );
  }
}

function mockPlan(name: string): StudyPlanProposal {
  return {
    summary: `A starter plan for ${name} (demo mode - add a GEMINI_API_KEY for a tailored plan).`,
    chapters: [
      { name: `${name}: Foundations`, topics: ["Core concepts", "Key terms", "Notation"] },
      { name: `${name}: Methods`, topics: ["Worked techniques", "Common problem types"] },
      { name: `${name}: Applications`, topics: ["Real-world uses", "Past-paper questions"] },
    ],
    tasks: [
      { title: `Summarise the foundations of ${name}`, dueInDays: 2 },
      { title: "Do 20 practice questions", dueInDays: 5 },
      { title: "Attempt one past paper", dueInDays: 7 },
    ],
  };
}
