export type BodyMetric = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  sleep_hours: number | null;
  energy_level: number | null;
  mood_level: number | null;
  stress_level: number | null;
  water_ml: number | null;
  mindfulness_minutes: number | null;
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

export type NutritionLog = {
  id: string;
  user_id: string;
  date: string;
  label: string;
  quality: number | null;
  calories: number | null;
  created_at: string;
};

export type PeriodFlow = "spotting" | "light" | "medium" | "heavy";

export const PERIOD_FLOWS: { id: PeriodFlow; label: string }[] = [
  { id: "spotting", label: "Spotting" },
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "heavy", label: "Heavy" },
];

export const PERIOD_SYMPTOMS = [
  "Cramps",
  "Headache",
  "Fatigue",
  "Bloating",
  "Mood",
  "Back pain",
  "Cravings",
  "Tender",
] as const;

export type PeriodLog = {
  id: string;
  user_id: string;
  date: string;
  flow: PeriodFlow | null;
  symptoms: string[] | null;
  note: string | null;
  created_at: string;
};

/** Derived cycle insight: last period start and a gentle next-period estimate. */
export type CycleSummary = {
  /** ISO date of the most recent period's first day, if any. */
  lastStart: string | null;
  /** Whether a period is logged for today. */
  activeToday: boolean;
  /** Average cycle length in days across recent cycles (null until two starts). */
  avgCycleLength: number | null;
  /** ISO date of the gentle next-period estimate, if predictable. */
  nextEstimate: string | null;
  /** Days until the next estimate (can be negative if overdue). */
  daysUntilNext: number | null;
};

export type WorkoutType = "strength" | "cardio" | "flexibility" | "sport";

export const WORKOUT_TYPES: { id: WorkoutType; label: string }[] = [
  { id: "strength", label: "Strength" },
  { id: "cardio", label: "Cardio" },
  { id: "flexibility", label: "Flexibility" },
  { id: "sport", label: "Sport" },
];

/** Daily hydration target in millilitres (≈ 8 glasses of 250ml). */
export const HYDRATION_GOAL_ML = 2000;
export const GLASS_ML = 250;

export type BodyOverview = {
  today: BodyMetric | null;
  series: BodyMetric[];
  workouts: WorkoutLog[];
  nutritionToday: NutritionLog[];
  focusMinutesWeek: number;
  workoutDaysWeek: number;
  recovery: string | null;
  /** Whether cycle tracking is offered for this user (users.sex = 'female'). */
  cycleEnabled: boolean;
  cycle: CycleSummary | null;
  periodLogs: PeriodLog[];
};
