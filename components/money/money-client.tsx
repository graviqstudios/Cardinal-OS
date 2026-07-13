"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  createTransaction,
  deleteTransaction,
  setTransactionCategory,
} from "@/lib/money/actions";
import {
  CATEGORY_NAMES,
  categoryColor,
  formatMoney,
  type Direction,
  type Transaction,
} from "@/lib/money/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function MoneyClient({ transactions }: { transactions: Transaction[] }) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [direction, setDirection] = React.useState<Direction>("expense");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [, start] = React.useTransition();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const match = text.match(/(\d+(?:\.\d+)?)/);
    if (!match) {
      setError("Start with an amount, e.g. \"120 biryani\".");
      return;
    }
    const amount = Number(match[1]);
    const note = text.replace(match[1], "").trim();
    setError(null);
    setPending(true);
    const res = await createTransaction({ amount, note, direction });
    setPending(false);
    if (res.ok) {
      setText("");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-3">
          <form onSubmit={add} className="flex gap-2">
            <div className="flex rounded-lg border p-0.5">
              {(["expense", "income"] as Direction[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    direction === d ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='Type "120 biryani" and hit add'
            />
            <Tap className="inline-flex">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </Tap>
          </form>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <p className="mb-2 px-1 text-sm font-medium text-muted-foreground">This month</p>
          {transactions.length === 0 ? (
            <p className="px-1 py-4 text-sm text-muted-foreground">
              No transactions yet. Log your first above - 3 taps.
            </p>
          ) : (
            <div className="space-y-1">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-accent/50">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor(t.category) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{t.note || t.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.occurred_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <select
                    value={t.category}
                    onChange={(e) =>
                      start(async () => {
                        await setTransactionCategory(t.id, e.target.value);
                        router.refresh();
                      })
                    }
                    className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
                    aria-label="Category"
                  >
                    {[t.category, ...CATEGORY_NAMES.filter((c) => c !== t.category)].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span
                    className="w-20 shrink-0 text-right text-sm font-medium tabular-nums"
                    style={{
                      color: t.direction === "income" ? "hsl(var(--status-strong))" : undefined,
                    }}
                  >
                    {t.direction === "income" ? "+" : "−"}
                    {formatMoney(Number(t.amount))}
                  </span>
                  <button
                    onClick={() =>
                      start(async () => {
                        await deleteTransaction(t.id);
                        router.refresh();
                      })
                    }
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
