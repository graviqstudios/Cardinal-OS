"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteBudget, setBudget } from "@/lib/money/actions";
import {
  CATEGORY_NAMES,
  formatMoney,
  type Budget,
} from "@/lib/money/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BudgetsPanel({
  budgets,
  byCategory,
}: {
  budgets: Budget[];
  byCategory: { category: string; total: number }[];
}) {
  const router = useRouter();
  const [category, setCategory] = React.useState(CATEGORY_NAMES[0]);
  const [limit, setLimit] = React.useState("");
  const [, start] = React.useTransition();

  const spentFor = (c: string) => byCategory.find((b) => b.category === c)?.total ?? 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(limit);
    if (!(n >= 0)) return;
    setLimit("");
    start(async () => {
      await setBudget(category, n);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budgets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={save} className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORY_NAMES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Input
            type="number"
            min={0}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="Monthly limit (₹)"
          />
          <Button type="submit" variant="secondary">Set</Button>
        </form>

        {budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No budgets set. Add one above.</p>
        ) : (
          budgets.map((b) => {
            const spent = spentFor(b.category);
            const pct = b.monthly_limit > 0 ? Math.min(100, (spent / b.monthly_limit) * 100) : 0;
            const over = spent > b.monthly_limit;
            return (
              <div key={b.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{b.category}</span>
                  <span className="flex items-center gap-2">
                    <span className={cn("tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
                      {formatMoney(spent)} / {formatMoney(b.monthly_limit)}
                    </span>
                    <button
                      onClick={() => start(async () => { await deleteBudget(b.id); router.refresh(); })}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Delete budget"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: over ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
