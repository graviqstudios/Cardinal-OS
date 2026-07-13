/**
 * A warm, progress-aware greeting for the Today page - chosen from the user's
 * actual state rather than the clock (server time made time-of-day greetings
 * wrong). Voice: calm, supportive, never anxiety-driven (BRAND §Voice).
 *
 * The line is stable for a given day (seeded by the date) so it doesn't flicker
 * on refresh, but rotates day to day so it stays fresh.
 */
export type GreetingSignals = {
  name: string;
  /** False for a brand-new account with nothing tracked yet. */
  hasData: boolean;
  habitsDone: number;
  habitsTotal: number;
  taskCount: number;
  /** Life Score direction vs. the previous recorded day. */
  trend: "up" | "down" | "flat" | null;
  /** Longest current habit streak, in days. */
  topStreak: number;
  /** Stable per-day seed (e.g. day number) so the pick is consistent today. */
  daySeed: number;
};

function pick(candidates: string[], seed: number): string {
  return candidates[((seed % candidates.length) + candidates.length) % candidates.length];
}

export function buildGreeting(s: GreetingSignals): string {
  const { name, daySeed } = s;

  if (!s.hasData) {
    return pick(
      [
        `Welcome in, ${name}.`,
        `Glad you're here, ${name}.`,
        `Let's shape your day, ${name}.`,
      ],
      daySeed,
    );
  }

  // Every habit already done today - the strongest signal, so lead with it.
  if (s.habitsTotal > 0 && s.habitsDone === s.habitsTotal) {
    return pick(
      [
        `Every habit's done already, ${name}. Lovely.`,
        `You've cleared your habits, ${name}. Strong start.`,
        `All checked off, ${name} - that rhythm suits you.`,
      ],
      daySeed,
    );
  }

  if (s.topStreak >= 3) {
    return pick(
      [
        `${s.topStreak} days in a row, ${name}. Keep it gentle.`,
        `You're ${s.topStreak} days into a streak, ${name}.`,
        `${s.topStreak} steady days, ${name}. Nicely done.`,
      ],
      daySeed,
    );
  }

  if (s.trend === "up") {
    return pick(
      [
        `You're on an upswing, ${name}.`,
        `Nice momentum lately, ${name}.`,
        `Things are trending up, ${name}.`,
      ],
      daySeed,
    );
  }

  if (s.habitsTotal > 0 && s.habitsDone > 0) {
    return `${s.habitsDone} of ${s.habitsTotal} habits done, ${name}. Good going.`;
  }

  if (s.taskCount > 0) {
    return pick(
      [
        `${s.taskCount} thing${s.taskCount === 1 ? "" : "s"} lined up today, ${name}. One at a time.`,
        `A focused day ahead, ${name}.`,
        `Let's take today step by step, ${name}.`,
      ],
      daySeed,
    );
  }

  return pick(
    [
      `A calm, open day, ${name}.`,
      `Good to see you, ${name}.`,
      `Here's your day, ${name}.`,
    ],
    daySeed,
  );
}
