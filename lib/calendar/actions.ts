"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPES, type EventType } from "@/lib/calendar/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

const VALID_TYPES = EVENT_TYPES.map((e) => e.id);

export type EventInput = {
  title: string;
  start_time: string;
  end_time: string;
  type?: EventType;
  all_day?: boolean;
  description?: string | null;
};

export async function createEvent(input: EventInput): Promise<Result<{ id: string }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  const type = input.type && VALID_TYPES.includes(input.type) ? input.type : "calendar";

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description ?? null,
      start_time: input.start_time,
      end_time: input.end_time,
      all_day: input.all_day ?? false,
      type,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true, data: { id: data.id as string } };
}

export async function deleteEvent(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  return { ok: true };
}
