export type BodyMetric = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  sleep_hours: number | null;
  energy_level: number | null;
  notes: string | null;
  created_at: string;
};

export type WorkoutLog = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  type: WorkoutType | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
};

export type FocusSession = {
  id: string;
  user_id: string;
  task_id: string | null;
  duration_minutes: number;
  completed: boolean;
  note: string | null;
  created_at: string;
};

export type WorkoutType = "strength" | "cardio" | "flexibility" | "sport";

export const WORKOUT_TYPES: { id: WorkoutType; label: string }[] = [
  { id: "strength", label: "Strength" },
  { id: "cardio", label: "Cardio" },
  { id: "flexibility", label: "Flexibility" },
  { id: "sport", label: "Sport" },
];

export type BodyOverview = {
  today: BodyMetric | null;
  series: BodyMetric[];
  workouts: WorkoutLog[];
  focusMinutesWeek: number;
  workoutDaysWeek: number;
  recovery: string | null;
};
