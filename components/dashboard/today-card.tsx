import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { STATUS_META } from "@/lib/study/types";
import type { Recommendation } from "@/lib/study/recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** "What to study today" - 3 topics ranked by impact ÷ time. */
export function TodayCard({ items }: { items: Recommendation[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">What to study today</CardTitle>
        <Link
          href="/study"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Study <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add topics in Study and your top picks will appear here each day.
          </p>
        ) : (
          items.map((t, i) => (
            <div key={t.id} className="flex items-start gap-3 rounded-lg border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.reason}</p>
              </div>
              <span
                className="mt-0.5 shrink-0 text-[10px] font-medium uppercase tracking-wide"
                style={{ color: `hsl(var(${STATUS_META[t.status].varName}))` }}
              >
                {STATUS_META[t.status].label}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
