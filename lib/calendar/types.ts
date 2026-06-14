export type EventType = "study" | "calendar" | "goals" | "money" | "other";

export const EVENT_TYPES: { id: EventType; label: string; varName: string }[] = [
  { id: "study", label: "Study", varName: "--module-study" },
  { id: "calendar", label: "Calendar", varName: "--module-calendar" },
  { id: "goals", label: "Goals", varName: "--module-goals" },
  { id: "money", label: "Money", varName: "--module-money" },
  { id: "other", label: "Other", varName: "--primary" },
];

export function eventColorVar(type: EventType): string {
  return EVENT_TYPES.find((e) => e.id === type)?.varName ?? "--primary";
}

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string; // ISO
  end_time: string; // ISO
  all_day: boolean;
  type: EventType;
  created_at: string;
};

export type CalendarView = "day" | "week" | "month";
