import { generateObject } from "ai";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isMockAI, liteModel } from "@/lib/ai/models";
import { checkRateLimit } from "@/lib/ratelimit";
import { EVENT_TYPES, type EventType } from "@/lib/calendar/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const VALID_TYPES = EVENT_TYPES.map((e) => e.id) as [EventType, ...EventType[]];

const schema = z.object({
  events: z
    .array(
      z.object({
        title: z.string(),
        start_time: z.string(),
        end_time: z.string(),
        type: z.enum(VALID_TYPES).optional(),
      }),
    )
    .min(1),
});

/** Parse a natural-language scheduling request into calendar events. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "schedule");
  if (!rl.success) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { text } = (await req.json()) as { text?: string };
  const prompt = (text ?? "").trim();
  if (!prompt) return Response.json({ error: "Describe what to schedule." }, { status: 400 });

  const now = new Date();
  let parsed: z.infer<typeof schema>["events"];

  if (!isMockAI) {
    try {
      const { object } = await generateObject({
        model: liteModel(),
        schema,
        system: `You convert a student's natural-language scheduling request into calendar events.
The current date-time is ${now.toISOString()} (treat times as the user's local timezone).
Resolve relative phrases ("this week", "every evening", "tomorrow 5pm") into concrete events.
Output ISO 8601 datetimes. Default event length 1 hour if unspecified. type is one of study|calendar|goals|money|other (default calendar). Expand recurring phrases into individual events for the stated range.`,
        prompt,
      });
      parsed = object.events;
    } catch {
      parsed = [mockEvent(prompt, now)];
    }
  } else {
    parsed = [mockEvent(prompt, now)];
  }

  // Validate / clamp and insert.
  const rows = parsed.slice(0, 40).map((e) => {
    let start = new Date(e.start_time);
    let end = new Date(e.end_time);
    if (isNaN(start.getTime())) start = new Date(now.getTime() + 86_400_000);
    if (isNaN(end.getTime()) || end <= start)
      end = new Date(start.getTime() + 3_600_000);
    const type =
      e.type && (VALID_TYPES as string[]).includes(e.type) ? e.type : "calendar";
    return {
      user_id: user.id,
      title: e.title.slice(0, 200),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      type,
      all_day: false,
    };
  });

  const { data, error } = await supabase.from("events").insert(rows).select("*");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ events: data, count: rows.length });
}

function mockEvent(text: string, now: Date) {
  const start = new Date(now);
  start.setDate(now.getDate() + 1);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start.getTime() + 3_600_000);
  return {
    title: text.slice(0, 80),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    type: "calendar" as EventType,
  };
}
