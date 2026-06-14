import { categoryColor, formatMoney } from "@/lib/money/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Custom token-friendly horizontal bar chart of this month's spend by category. */
export function SpendingChart({
  byCategory,
  spent,
}: {
  byCategory: { category: string; total: number }[];
  spent: number;
}) {
  const max = Math.max(1, ...byCategory.map((c) => c.total));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Spending by category</CardTitle>
        <span className="text-sm font-medium tabular-nums">{formatMoney(spent)}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {byCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spending logged this month.</p>
        ) : (
          byCategory.map((c) => (
            <div key={c.category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor(c.category) }} />
                  {c.category}
                </span>
                <span className="tabular-nums text-muted-foreground">{formatMoney(c.total)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${(c.total / max) * 100}%`,
                    backgroundColor: categoryColor(c.category),
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
