import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/lib/calendar/queries";
import { isProviderConfigured, hasEncryptionKey } from "@/lib/integrations/config";
import { isoDate, parseLocalDate, rangeForView } from "@/lib/calendar/dates";
import type { CalendarView } from "@/lib/calendar/types";
import { CalendarView as CalendarViewComponent } from "@/components/calendar/calendar-view";
import { GoogleCalendarButton } from "@/components/calendar/google-calendar-button";
import { PageHeader } from "@/components/shell/page-header";

const VIEWS: CalendarView[] = ["day", "week", "month"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const view = (VIEWS.includes(sp.view as CalendarView) ? sp.view : "month") as CalendarView;
  const anchor = sp.date ? parseLocalDate(sp.date) : new Date();

  const [startISO, endISO] = rangeForView(view, anchor);
  const events = await getEvents(startISO, endISO);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: gcal } = user
    ? await supabase
        .from("integration_tokens")
        .select("provider")
        .eq("user_id", user.id)
        .eq("provider", "google_calendar")
        .maybeSingle()
    : { data: null };
  const googleConfigured = isProviderConfigured("google_calendar") && hasEncryptionKey();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Plan your time in plain language, and sync it with Google Calendar."
        colorVar="--module-calendar"
        mark="/brand/module-calendar.svg"
        actions={<GoogleCalendarButton connected={Boolean(gcal)} configured={googleConfigured} />}
      />

      <Suspense fallback={<div className="h-96" />}>
        <CalendarViewComponent
          events={events}
          view={view}
          anchorISO={isoDate(anchor)}
        />
      </Suspense>
    </div>
  );
}
