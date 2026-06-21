import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TABLES = [
  "habits", "habit_logs", "tasks", "projects", "skills", "goals", "milestones",
  "career_targets", "journal_entries", "body_metrics", "workout_logs",
  "focus_sessions", "events", "transactions", "budgets", "savings_goals",
  "life_scores", "constellation_messages",
];

/** Download all of the signed-in user's data as JSON (DPDP export right). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  out.profile = profile ?? null;

  for (const table of TABLES) {
    const { data } = await supabase.from(table).select("*").eq("user_id", user.id);
    out[table] = data ?? [];
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cardinal-export-${date}.json"`,
    },
  });
}
