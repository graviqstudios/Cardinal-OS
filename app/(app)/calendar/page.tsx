import { Suspense } from "react";

import { getEvents } from "@/lib/calendar/queries";
import { isoDate, parseLocalDate, rangeForView } from "@/lib/calendar/dates";
import type { CalendarView } from "@/lib/calendar/types";
import { CalendarView as CalendarViewComponent } from "@/components/calendar/calendar-view";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Plan your time. Type a request, or auto-generate a study plan from your exam date."
        colorVar="--module-calendar"
        mark="/brand/module-calendar.svg"
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
