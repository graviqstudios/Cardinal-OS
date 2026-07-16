import { generateText } from "ai";

import { createClient, getUser } from "@/lib/supabase/server";
import { chatModel, isMockAI } from "@/lib/ai/models";
import { computeForUser } from "@/lib/life-score/service";
import { getInsights } from "@/lib/insights/service";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** A calm 2–3 sentence morning briefing for the Today screen (Gemini Flash). */
export async function POST() {
  const supabase = await createClient();
  const user = await getUser();
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

  const insights = await getInsights();

  const facts =
    `Life Score ${score.score}/1000. ` +
    `Habits ${habitDone}/${habitTotal} done today. ` +
    `${openTasks} open tasks. ` +
    (nextEvent
      ? `Next event: ${nextEvent.title} at ${new Date(nextEvent.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}. `
      : "Nothing scheduled. ") +
    (insights.length ? `Patterns we've noticed: ${insights.join(" ")}` : "");

  if (isMockAI || (habitTotal === 0 && openTasks === 0)) {
    return Response.json({ text: mockBriefing(habitDone, habitTotal, openTasks) });
  }

  try {
    const { text } = await generateText({
      model: chatModel(),
      system:
        "You are Cardinal, a calm, warm life companion. Write ONE short sentence (max ~16 words) for the user based on the facts - a gentle nudge toward the one thing worth doing today. Never gushing, no exclamation marks, no 'Great job'. No preamble.",
      prompt: facts,
    });
    return Response.json({ text: text.trim() });
  } catch {
    return Response.json({ text: mockBriefing(habitDone, habitTotal, openTasks) });
  }
}

function mockBriefing(done: number, total: number, openTasks: number) {
  if (total === 0 && openTasks === 0) {
    return "A clean slate - add your first habit or task to get going.";
  }
  if (openTasks > 0) {
    return `Pick the one task that matters most and start there.`;
  }
  return `${done} of ${total} habits done - a steady day ahead.`;
}
