import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Guards the opt-in Exam Prep routes (Study, Practice, Heatmap, Voice). When the
 * signed-in user has not enabled `exam_mode`, these routes are not part of their
 * Cardinal OS, so we send them back to Today rather than exposing exam tooling
 * by direct URL. Call at the top of each exam-only page (before its server work).
 */
export async function requireExamMode(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("users")
    .select("exam_mode")
    .eq("id", user.id)
    .single<{ exam_mode: boolean }>();

  if (!data?.exam_mode) redirect("/today");
}
