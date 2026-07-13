"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type CalendarEvent,
  type CalendarView,
  EVENT_TYPES,
  type EventType,
  eventColorVar,
} from "@/lib/calendar/types";
import {
  addDays,
  fmtTime,
  isoDate,
  monthGrid,
  parseLocalDate,
  sameDay,
  shiftAnchor,
  startOfDay,
  viewTitle,
  weekDays,
} from "@/lib/calendar/dates";
import { createEvent, deleteEvent } from "@/lib/calendar/actions";
import { generateStudySchedule } from "@/lib/calendar/auto-schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

const VIEWS: CalendarView[] = ["day", "week", "month"];

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const start = startOfDay(day).getTime();
  const end = addDays(startOfDay(day), 1).getTime();
  return events
    .filter((e) => {
      const s = new Date(e.start_time).getTime();
      const en = new Date(e.end_time).getTime();
      return s < end && en > start;
    })
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
}

export function CalendarView({
  events,
  view,
  anchorISO,
}: {
  events: CalendarEvent[];
  view: CalendarView;
  anchorISO: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const anchor = parseLocalDate(anchorISO);

  const [selected, setSelected] = React.useState<CalendarEvent | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [nl, setNl] = React.useState("");
  const [busy, setBusy] = React.useState<"nl" | "auto" | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  function navigate(next: { view?: CalendarView; date?: Date }) {
    const sp = new URLSearchParams(searchParams.toString());
    if (next.view) sp.set("view", next.view);
    if (next.date) sp.set("date", isoDate(next.date));
    router.push(`${pathname}?${sp.toString()}`);
  }

  async function runNL(e: React.FormEvent) {
    e.preventDefault();
    if (!nl.trim()) return;
    setBusy("nl");
    setMsg(null);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not schedule.");
      setNl("");
      setMsg(`Added ${json.count} event${json.count === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not schedule.");
    } finally {
      setBusy(null);
    }
  }

  async function autoSchedule() {
    setBusy("auto");
    setMsg(null);
    const res = await generateStudySchedule();
    setBusy(null);
    if (res.ok) {
      setMsg(`Generated ${res.added} study blocks.`);
      router.refresh();
    } else {
      setMsg(res.error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous" onClick={() => navigate({ date: shiftAnchor(view, anchor, -1) })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next" onClick={() => navigate({ date: shiftAnchor(view, anchor, 1) })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate({ date: new Date() })}>
            Today
          </Button>
        </div>

        <h2 className="text-base font-semibold">{viewTitle(view, anchor)}</h2>

        <div className="ml-auto flex items-center gap-2">
          {/* View switcher */}
          <div className="flex rounded-lg border p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => navigate({ view: v })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Tap className="inline-flex">
            <Button size="sm" onClick={() => setShowCreate((s) => !s)}>
              <CalendarPlus className="h-4 w-4" />
              New
            </Button>
          </Tap>
        </div>
      </div>

      {/* Natural-language + auto schedule */}
      <Card>
        <CardContent className="space-y-2 p-3">
          <form onSubmit={runNL} className="flex gap-2">
            <Input
              value={nl}
              onChange={(e) => setNl(e.target.value)}
              placeholder='Try: "block 2 hours of Maths every evening this week"'
            />
            <Button type="submit" variant="secondary" disabled={busy !== null}>
              {busy === "nl" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Schedule
            </Button>
            <Tap className="inline-flex">
              <Button type="button" variant="ghost" disabled={busy !== null} onClick={autoSchedule}>
                Auto-plan
              </Button>
            </Tap>
          </form>
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      {showCreate && (
        <CreateEventForm
          anchor={anchor}
          onDone={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {selected && (
        <SelectedEvent
          event={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}

      {/* Body */}
      {view === "month" && <MonthView events={events} anchor={anchor} onPickDay={(d) => navigate({ view: "day", date: d })} onPickEvent={setSelected} />}
      {view === "week" && <WeekView events={events} anchor={anchor} onPickDay={(d) => navigate({ view: "day", date: d })} onPickEvent={setSelected} />}
      {view === "day" && <DayView events={events} anchor={anchor} onPickEvent={setSelected} />}
    </div>
  );
}

function EventChip({ ev, onClick, withTime = true }: { ev: CalendarEvent; onClick: () => void; withTime?: boolean }) {
  const v = eventColorVar(ev.type);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight"
      style={{ backgroundColor: `hsl(var(${v}) / 0.16)`, color: `hsl(var(${v}))` }}
      title={ev.title}
    >
      {withTime && !ev.all_day && <span className="mr-1 opacity-80">{fmtTime(ev.start_time)}</span>}
      {ev.title}
    </button>
  );
}

function MonthView({ events, anchor, onPickDay, onPickEvent }: { events: CalendarEvent[]; anchor: Date; onPickDay: (d: Date) => void; onPickEvent: (e: CalendarEvent) => void }) {
  const days = monthGrid(anchor);
  const today = new Date();
  const month = anchor.getMonth();
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {labels.map((l) => (
          <div key={l} className="py-2">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const dayEvents = eventsForDay(events, d);
          const outside = d.getMonth() !== month;
          const isToday = sameDay(d, today);
          return (
            <button
              key={i}
              onClick={() => onPickDay(d)}
              className={cn(
                "min-h-[84px] border-b border-r p-1 text-left align-top transition-colors hover:bg-accent/50",
                (i + 1) % 7 === 0 && "border-r-0",
                outside && "bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary font-semibold text-primary-foreground",
                  outside && !isToday && "text-muted-foreground",
                )}
              >
                {d.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventChip key={ev.id} ev={ev} onClick={() => onPickEvent(ev)} withTime={false} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({ events, anchor, onPickDay, onPickEvent }: { events: CalendarEvent[]; anchor: Date; onPickDay: (d: Date) => void; onPickEvent: (e: CalendarEvent) => void }) {
  const days = weekDays(anchor);
  const today = new Date();
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((d) => {
        const dayEvents = eventsForDay(events, d);
        const isToday = sameDay(d, today);
        return (
          <Card key={+d} className={cn("flex flex-col", isToday && "ring-1 ring-primary")}>
            <button onClick={() => onPickDay(d)} className="border-b px-2 py-1.5 text-left">
              <p className="text-xs font-medium">{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
              <p className={cn("text-sm", isToday && "font-semibold text-primary")}>{d.getDate()}</p>
            </button>
            <div className="flex-1 space-y-1 p-1.5">
              {dayEvents.length === 0 ? (
                <p className="px-1 py-2 text-[11px] text-muted-foreground">-</p>
              ) : (
                dayEvents.map((ev) => <EventChip key={ev.id} ev={ev} onClick={() => onPickEvent(ev)} />)
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DayView({ events, anchor, onPickEvent }: { events: CalendarEvent[]; anchor: Date; onPickEvent: (e: CalendarEvent) => void }) {
  const dayEvents = eventsForDay(events, anchor);
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        {dayEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing scheduled. Add an event or use the planner above.</p>
        ) : (
          dayEvents.map((ev) => {
            const v = eventColorVar(ev.type);
            return (
              <button
                key={ev.id}
                onClick={() => onPickEvent(ev)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                <span className="h-10 w-1 rounded-full" style={{ backgroundColor: `hsl(var(${v}))` }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.all_day ? "All day" : `${fmtTime(ev.start_time)} – ${fmtTime(ev.end_time)}`}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function SelectedEvent({ event, onClose, onDeleted }: { event: CalendarEvent; onClose: () => void; onDeleted: () => void }) {
  const [pending, setPending] = React.useState(false);
  const v = eventColorVar(event.type);
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: `hsl(var(${v}))` }} />
        <div className="flex-1">
          <p className="text-sm font-medium">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(event.start_time).toLocaleDateString()} ·{" "}
            {event.all_day ? "All day" : `${fmtTime(event.start_time)} – ${fmtTime(event.end_time)}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete event"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await deleteEvent(event.id);
            onDeleted();
          }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateEventForm({ anchor, onDone }: { anchor: Date; onDone: () => void }) {
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState(isoDate(anchor));
  const [start, setStart] = React.useState("18:00");
  const [end, setEnd] = React.useState("19:00");
  const [type, setType] = React.useState<EventType>("calendar");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    setError(null);
    const startISO = new Date(`${date}T${start}`).toISOString();
    let endISO = new Date(`${date}T${end}`).toISOString();
    if (new Date(endISO) <= new Date(startISO)) {
      endISO = new Date(new Date(startISO).getTime() + 3_600_000).toISOString();
    }
    const res = await createEvent({ title, start_time: startISO, end_time: endISO, type });
    setPending(false);
    if (res.ok) onDone();
    else setError(res.error);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Maths revision" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Start</label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">End</label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add event
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
