import { generateObject } from "ai";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isMockAI, liteModel } from "@/lib/ai/models";
import { quizSystem } from "@/lib/ai/prompts";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  questions: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .min(1),
});

/** Generate 5 questions for a topic. Returns questions + reference answers. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "quiz");
  if (!rl.success) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { topicName } = (await req.json()) as { topicName?: string };
  const name = (topicName ?? "").trim() || "this topic";

  if (!isMockAI) {
    try {
      const { object } = await generateObject({
        model: liteModel(),
        schema,
        system: quizSystem(name),
        prompt: `Write 5 questions on "${name}".`,
      });
      return Response.json({ questions: object.questions.slice(0, 5) });
    } catch {
      // fall through to canned questions
    }
  }

  return Response.json({ questions: mockQuestions(name) });
}

function mockQuestions(name: string) {
  return [
    { question: `Define the core idea behind ${name}.`, answer: `The central concept of ${name}.` },
    { question: `Give one real-world application of ${name}.`, answer: `An applied example of ${name}.` },
    { question: `What is a common mistake students make with ${name}?`, answer: `A frequent misconception about ${name}.` },
    { question: `State a key formula or rule in ${name}.`, answer: `A key rule of ${name}.` },
    { question: `Explain ${name} to a beginner in one sentence.`, answer: `A simple explanation of ${name}.` },
  ];
}
