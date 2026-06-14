"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { TopicStatus } from "@/lib/study/types";

type Result = { ok: true; added: number } | { ok: false; error: string };

const MAX_DAYS = 21; // don't flood the calendar
const PRIORITY: TopicStatus[] = ["weak", "untouched", "moderate"];

/**
 * Generate a simple study schedule working backward from the exam date: a daily
 * 2-hour evening block per day (up to MAX_DAYS), each assigned to the next
 * highest-priority topic (weak → untouched → moderate), round-robin.
 */
export async function generateStudySchedule(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const [{ data: profile }, { data: topics }] = await Promise.all([
    supabase.from("users").select("exam_date").eq("id", user.id).single(),
    supabase.from("topics").select("name, status").eq("user_id", user.id),
  ]);

  const allTopics = (topics ?? []) as { name: string; status: TopicStatus }[];
  if (allTopics.length === 0) {
    return { ok: false, error: "Add some topics in Study first." };
  }

  // Order topics by priority for round-robin assignment.
  const ordered = [...allTopics].sort(
    (a, b) =>
      (PRIORITY.indexOf(a.status) === -1 ? 99 : PRIORITY.indexOf(a.status)) -
      (PRIORITY.indexOf(b.status) === -1 ? 99 : PRIORITY.indexOf(b.status)),
  );

  // Determine the horizon.
  const start = new Date();
  start.setDate(start.getDate() + 1); // start tomorrow
  start.setHours(0, 0, 0, 0);

  let days = 7;
  if (profile?.exam_date) {
    const exam = new Date(profile.exam_date);
    const diff = Math.floor((exam.getTime() - start.getTime()) / 86_400_000);
    days = Math.max(1, Math.min(MAX_DAYS, diff));
  }

  const rows = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const startTime = new Date(day);
    startTime.setHours(18, 0, 0, 0);
    const endTime = new Date(day);
    endTime.setHours(20, 0, 0, 0);
    const topic = ordered[i % ordered.length];
    rows.push({
      user_id: user.id,
      title: `Study: ${topic.name}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      type: "study",
      all_day: false,
    });
  }

  const { error } = await supabase.from("events").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true, added: rows.length };
}
