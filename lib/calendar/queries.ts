import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/lib/calendar/types";

/** Events overlapping [startISO, endISO). */
export async function getEvents(
  startISO: string,
  endISO: string,
): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .lt("start_time", endISO)
    .gt("end_time", startISO)
    .order("start_time", { ascending: true });
  return (data ?? []) as CalendarEvent[];
}
