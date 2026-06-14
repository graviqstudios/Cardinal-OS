"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { createSavingsGoal, deleteSavingsGoal } from "@/lib/money/actions";
import { formatMoney, type SavingsGoal } from "@/lib/money/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SavingsPanel({
  goals,
  net,
}: {
  goals: SavingsGoal[];
  net: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [date, setDate] = React.useState("");
  const [, start] = React.useTransition();

  const saved = Math.max(0, net); // net savings pool

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(target);
    if (!title.trim() || !(amount > 0)) return;
    const payload = { title, target_amount: amount, target_date: date || null };
    setTitle(""); setTarget(""); setDate(""); setOpen(false);
    start(async () => {
      const res = await createSavingsGoal(payload);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Savings goals</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Net savings pool (all income − expenses):{" "}
          <span className="font-medium text-foreground">{formatMoney(saved)}</span>
        </p>

        {open && (
          <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal (e.g. New laptop)" autoFocus className="sm:col-span-2" />
            <Input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target (₹)" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}

        {goals.length === 0 && !open && (
          <p className="text-sm text-muted-foreground">No savings goals yet.</p>
        )}

        {goals.map((g) => {
          const pct = Math.min(100, (saved / Number(g.target_amount)) * 100);
          return (
            <div key={g.id}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{g.title}</span>
                <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                  {formatMoney(saved)} / {formatMoney(Number(g.target_amount))}
                  <button
                    onClick={() => start(async () => { await deleteSavingsGoal(g.id); router.refresh(); })}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {g.target_date && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  by {new Date(g.target_date).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
