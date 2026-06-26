import { generateObject } from "ai";
import { z } from "zod";

import { createClient, getUser } from "@/lib/supabase/server";
import { isMockAI, liteModel } from "@/lib/ai/models";
import { gradeSystem } from "@/lib/ai/prompts";
import { checkRateLimit } from "@/lib/ratelimit";
import { recordReadinessSnapshot } from "@/lib/readiness/service";
import type { TopicStatus } from "@/lib/study/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const itemSchema = z.object({
  question: z.string(),
  reference: z.string(),
  userAnswer: z.string(),
});

const gradeSchema = z.object({
  results: z.array(
    z.object({
      verdict: z.enum(["full", "partial", "none"]),
      feedback: z.string(),
    }),
  ),
});

const CREDIT = { full: 1, partial: 0.5, none: 0 } as const;

function statusForFraction(f: number): TopicStatus {
  if (f >= 0.75) return "strong";
  if (f >= 0.45) return "moderate";
  return "weak";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "quiz-grade");
  if (!rl.success) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const body = (await req.json()) as {
    topicId?: string;
    topicName?: string;
    items?: unknown;
  };
  const parsed = z.array(itemSchema).safeParse(body.items);
  if (!parsed.success || parsed.data.length === 0) {
    return Response.json({ error: "No answers submitted." }, { status: 400 });
  }
  const items = parsed.data;
  const name = (body.topicName ?? "").trim() || "this topic";

  let results: { verdict: "full" | "partial" | "none"; feedback: string }[];

  if (!isMockAI) {
    try {
      const { object } = await generateObject({
        model: liteModel(),
        schema: gradeSchema,
        system: gradeSystem(name),
        prompt: JSON.stringify(items),
      });
      results = object.results.slice(0, items.length);
    } catch {
      results = mockGrade(items);
    }
  } else {
    results = mockGrade(items);
  }

  // Pad if the model returned fewer results than questions.
  while (results.length < items.length) {
    results.push({ verdict: "none", feedback: "Not graded." });
  }

  const earned = results.reduce((s, r) => s + CREDIT[r.verdict], 0);
  const fraction = earned / items.length;
  const status = statusForFraction(fraction);

  // Log the practice session and update topic status.
  await supabase.from("practice_sessions").insert({
    user_id: user.id,
    topic_id: body.topicId ?? null,
    score: earned,
    max_score: items.length,
    duration_minutes: null,
  });
  if (body.topicId) {
    await supabase.from("topics").update({ status }).eq("id", body.topicId);
  }

  // Recompute + store readiness so the score and heat map update live.
  await recordReadinessSnapshot(supabase, user.id);

  return Response.json({
    results,
    score: earned,
    total: items.length,
    fraction,
    status,
  });
}

function mockGrade(items: { reference: string; userAnswer: string }[]) {
  return items.map((it) => {
    const answered = it.userAnswer.trim().length > 0;
    return {
      verdict: (answered ? "partial" : "none") as "partial" | "none",
      feedback: answered
        ? `(Demo grading) Reference answer: ${it.reference}`
        : `No answer given. Reference answer: ${it.reference}`,
    };
  });
}
