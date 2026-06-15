export type Routine = "morning" | "evening" | "any";

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  routine: Routine;
  archived: boolean;
  created_at: string;
};

export type HabitWithToday = Habit & {
  doneToday: boolean;
  streak: number;
  /** Completed date keys (YYYY-MM-DD) over the recent window, for the grid. */
  completedDates: string[];
};

export const ROUTINES: { id: Routine; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "evening", label: "Evening" },
  { id: "any", label: "Anytime" },
];
