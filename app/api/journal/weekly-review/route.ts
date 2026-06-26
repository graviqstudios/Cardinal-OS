import { generateText } from "ai";

import { createClient, getUser } from "@/lib/supabase/server";
import { reasoningModel, isMockAI } from "@/lib/ai/models";
import { computeForUser } from "@/lib/life-score/service";
import { reindexJournalEntry } from "@/lib/journal/embed";
import { checkRateLimit } from "@/lib/ratelimit";

// Node.js runtime — never edge (Supabase SSR + AI assume full Node).
export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are Cardinal, a calm, warm companion writing someone's weekly review.
- Speak to them directly ("you"). Be supportive and honest, never gushing or judgmental. No exclamation marks.
- Notice what went well and one gentle thing to tend to next week. Reference their own reflections where relevant.
- 4–6 short sentences. No preamble, no headings.`;

function weekLabel(): string {
  const now = new Date();
  const monday = new Date(now);
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(now.getDate() - day);
  return `Week of ${monday.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
}

export async function POST() {
  const user = await getUser();
  const supabase = await createClient();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "journal-weekly");
  if (!rl.success) return Response.json({ error: "Rate limit" }, { status: 429 });

  const since = new Date(Date.now() - 7 * 86_400_000);
  const sinceDate = since.toISOString().slice(0, 10);

  const [{ data: habitLogs }, { data: tasks }, { data: reflections }, score] =
    await Promise.all([
      supabase
        .from("habit_logs")
        .select("completed")
        .eq("user_id", user.id)
        .gte("logged_date", sinceDate),
      supabase
        .from("tasks")
        .select("status, updated_at")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("updated_at", since.toISOString()),
      supabase
        .from("journal_entries")
        .select("date, mood, content")
        .eq("user_id", user.id)
        .eq("type", "daily")
        .gte("date", sinceDate)
        .order("date", { ascending: true }),
      computeForUser(supabase, user.id),
    ]);

  const habitsDone = (habitLogs ?? []).filter((l) => l.completed).length;
  const tasksDone = (tasks ?? []).length;
  const refls = (reflections ?? []) as { date: string; mood: number | null; content: string | null }[];
  const moods = refls.map((r) => r.mood).filter((m): m is number => m != null);
  const avgMood = moods.length ? moods.reduce((s, m) => s + m, 0) / moods.length : null;

  const facts =
    `This week: Life Score ${score.score}/1000. ` +
    `${habitsDone} habit check-ins. ${tasksDone} tasks completed. ` +
    (avgMood != null ? `Average mood ${avgMood.toFixed(1)}/5 across ${moods.length} reflections.` : "No mood logged.");

  const reflectionText = refls
    .filter((r) => r.content?.trim())
    .map((r) => `${r.date}: ${r.content!.trim()}`)
    .join("\n");

  let text: string;
  if (isMockAI || (habitsDone === 0 && tasksDone === 0 && refls.length === 0)) {
    text = mockReview(habitsDone, tasksDone, score.score, refls.length);
  } else {
    try {
      const res = await generateText({
        model: reasoningModel(),
        system: SYSTEM,
        prompt: reflectionText ? `${facts}\n\nYour reflections this week:\n${reflectionText}` : facts,
      });
      text = res.text;
    } catch {
      text = mockReview(habitsDone, tasksDone, score.score, refls.length);
    }
  }

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      type: "weekly",
      title: weekLabel(),
      content: text,
      date: new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await reindexJournalEntry(supabase, user.id, entry.id as string, text);

  return Response.json({ entry });
}

function mockReview(habits: number, tasks: number, score: number, reflections: number): string {
  return (
    `A steady week. You logged ${habits} habit check-in${habits === 1 ? "" : "s"} and ` +
    `finished ${tasks} task${tasks === 1 ? "" : "s"}, with your Life Score at ${score}. ` +
    (reflections > 0
      ? `You took time to reflect ${reflections} day${reflections === 1 ? "" : "s"}, which is worth keeping up. `
      : `Adding a short daily reflection next week would give these reviews more to work with. `) +
    `Pick one small thing to carry forward, and let the rest be.`
  );
}
