import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";

import { reasoningModel, isMockAI } from "@/lib/ai/models";
import { computeForUser } from "@/lib/life-score/service";

const SYSTEM = `You are Cardinal, a calm, warm companion writing someone's monthly review.
- Speak to them directly ("you"). Be honest and supportive, never gushing or judgmental. No exclamation marks.
- Reflect the shape of the month: what held steady, what grew, one gentle thing to tend next month. Reference their own reflections where useful.
- 6–9 short sentences, written like a letter, not a dashboard. No preamble, no headings.`;

function monthLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Build a personalised monthly review for a user (admin client; bypasses RLS). */
export async function generateMonthlyReview(
  admin: SupabaseClient,
  userId: string,
): Promise<{ title: string; text: string }> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const sinceDate = since.toISOString().slice(0, 10);

  const [{ data: habitLogs }, { data: tasks }, { data: focus }, { data: metrics }, { data: reflections }, score] =
    await Promise.all([
      admin.from("habit_logs").select("completed").eq("user_id", userId).gte("logged_date", sinceDate),
      admin.from("tasks").select("status").eq("user_id", userId).eq("status", "done").gte("completed_at", since.toISOString()),
      admin.from("focus_sessions").select("duration_minutes, completed").eq("user_id", userId).gte("created_at", since.toISOString()),
      admin.from("body_metrics").select("sleep_hours").eq("user_id", userId).gte("date", sinceDate),
      admin.from("journal_entries").select("date, content").eq("user_id", userId).in("type", ["daily", "weekly"]).gte("date", sinceDate).order("date", { ascending: true }),
      computeForUser(admin, userId),
    ]);

  const habitsDone = (habitLogs ?? []).filter((l) => l.completed).length;
  const tasksDone = (tasks ?? []).length;
  const focusHours = Math.round(((focus ?? []).filter((f) => f.completed).reduce((s, f) => s + (f.duration_minutes ?? 0), 0) / 60) * 10) / 10;
  const sleeps = (metrics ?? []).map((m) => m.sleep_hours).filter((s): s is number => s != null);
  const avgSleep = sleeps.length ? (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) : null;

  const facts =
    `This month: Life Score ${score.score}/1000. ${habitsDone} habit check-ins, ` +
    `${tasksDone} tasks completed, ${focusHours}h focused. ` +
    (avgSleep ? `Average sleep ${avgSleep}h.` : "Sleep not tracked.");

  const reflectionText = (reflections ?? [])
    .filter((r) => r.content?.trim())
    .map((r) => `${r.date}: ${r.content!.trim()}`)
    .join("\n")
    .slice(0, 4000);

  const title = monthLabel();

  if (isMockAI || (habitsDone === 0 && tasksDone === 0 && (reflections ?? []).length === 0)) {
    return {
      title,
      text:
        `A quiet month on the record. You logged ${habitsDone} habit check-in${habitsDone === 1 ? "" : "s"}, ` +
        `finished ${tasksDone} task${tasksDone === 1 ? "" : "s"}, and focused for ${focusHours} hours. ` +
        `Next month, a short daily note would give these reviews more of your story to work with.`,
    };
  }

  try {
    const { text } = await generateText({
      model: reasoningModel(),
      system: SYSTEM,
      prompt: reflectionText ? `${facts}\n\nYour reflections this month:\n${reflectionText}` : facts,
    });
    return { title, text: text.trim() };
  } catch {
    return { title, text: `${facts} A fuller review will return next month.` };
  }
}
