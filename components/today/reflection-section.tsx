import { getTodayReflection } from "@/lib/journal/queries";
import { DailyReflection } from "@/components/today/daily-reflection";

/**
 * Self-fetching wrapper so the daily reflection streams in behind a Suspense
 * boundary rather than holding up the primary Today render.
 */
export async function ReflectionSection() {
  const reflection = await getTodayReflection();
  return <DailyReflection initial={reflection} />;
}
