import { generateText } from "ai";

import { createClient } from "@/lib/supabase/server";
import { chatModel, isMockAI } from "@/lib/ai/models";
import { computeForUser } from "@/lib/life-score/service";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** A calm 2–3 sentence morning briefing for the Today screen (Gemini Flash). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "today");
  if (!rl.success) return Response.json({ error: "Rate limit" }, { status: 429 });

  const todayISO = new Date().toISOString().slice(0, 10);
  const [{ data: habits }, { data: habitLogs }, { data: tasks }, { data: events }, score] =
    await Promise.all([
      supabase.from("habits").select("id").eq("user_id", user.id).eq("archived", false),
      supabase.from("habit_logs").select("completed").eq("user_id", user.id).eq("logged_date", todayISO),
      supabase.from("tasks").select("status").eq("user_id", user.id).neq("status", "done"),
      supabase
        .from("events")
        .select("title, start_time")
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1),
      computeForUser(supabase, user.id),
    ]);

  const habitTotal = (habits ?? []).length;
  const habitDone = (habitLogs ?? []).filter((l) => l.completed).length;
  const openTasks = (tasks ?? []).length;
  const nextEvent = (events ?? [])[0];

  const facts =
    `Life Score ${score.score}/1000. ` +
    `Habits ${habitDone}/${habitTotal} done today. ` +
    `${openTasks} open tasks. ` +
    (nextEvent
      ? `Next event: ${nextEvent.title} at ${new Date(nextEvent.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`
      : "Nothing scheduled.");

  if (isMockAI || (habitTotal === 0 && openTasks === 0)) {
    return Response.json({ text: mockBriefing(habitDone, habitTotal, openTasks, score.score) });
  }

  try {
    const { text } = await generateText({
      model: chatModel(),
      system:
        "You are Cardinal, a calm, warm life companion. Write a 2–3 sentence morning briefing for the user based on the facts. Be encouraging but never gushing, never use exclamation marks or 'Great job'. Point to one concrete thing worth doing today. No preamble.",
      prompt: facts,
    });
    return Response.json({ text });
  } catch {
    return Response.json({ text: mockBriefing(habitDone, habitTotal, openTasks, score.score) });
  }
}

function mockBriefing(done: number, total: number, openTasks: number, score: number) {
  if (total === 0 && openTasks === 0) {
    return "A clean slate this morning. Add a habit or two and your first task — your Life Score grows as your days take shape.";
  }
  const habitLine =
    total > 0
      ? `${done} of ${total} habits done so far`
      : "no habits set up yet";
  return `Your Life Score is ${score}. You have ${habitLine} and ${openTasks} task${openTasks === 1 ? "" : "s"} waiting. Pick the one that matters most and start there.`;
}
