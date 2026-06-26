import { generateObject } from "ai";
import { z } from "zod";

import { createClient, getUser } from "@/lib/supabase/server";
import { isMockAI, liteModel } from "@/lib/ai/models";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 20;

const schema = z.object({
  title: z.string(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(["p1", "p2", "p3"]).nullable().optional(),
});

/** Quick capture: parse "call Anuj tomorrow 5pm" into a task and create it. */
export async function POST(req: Request) {
  const user = await getUser();
  const supabase = await createClient();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "tasks-parse");
  if (!rl.success) return Response.json({ error: "Rate limit" }, { status: 429 });

  const { text } = (await req.json()) as { text?: string };
  const raw = (text ?? "").trim();
  if (!raw) return Response.json({ error: "Empty." }, { status: 400 });

  let title = raw;
  let due: string | null = null;
  let priority: "p1" | "p2" | "p3" | null = null;

  if (!isMockAI) {
    try {
      const { object } = await generateObject({
        model: liteModel(),
        schema,
        system: `Parse a quick task note into fields. Current date-time: ${new Date().toISOString()} (user's local time).
Extract a clean title (strip the date/time words), a due_date as YYYY-MM-DD if a day is implied (else null), and priority p1 only if the user signals urgency/importance (else null).`,
        prompt: raw,
      });
      title = object.title.trim() || raw;
      const d = object.due_date ? new Date(object.due_date) : null;
      due = d && !isNaN(d.getTime()) ? object.due_date! : null;
      priority = object.priority ?? null;
    } catch {
      /* fall back to raw title */
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: title.slice(0, 300),
      status: "today",
      due_date: due,
      priority,
    })
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ task: data });
}
