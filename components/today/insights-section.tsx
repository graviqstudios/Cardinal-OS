import { getInsights } from "@/lib/insights/service";
import { TodayInsights } from "@/components/today/today-insights";

/**
 * Self-fetching wrapper so the cross-domain insights (a slower, multi-table
 * scan) can stream in behind a Suspense boundary instead of blocking the whole
 * Today page render.
 */
export async function InsightsSection() {
  const insights = await getInsights();
  return <TodayInsights insights={insights} />;
}
