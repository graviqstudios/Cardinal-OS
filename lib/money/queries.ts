import { createClient } from "@/lib/supabase/server";
import type { Budget, SavingsGoal, Transaction } from "@/lib/money/types";

export type MoneyOverview = {
  transactions: Transaction[]; // recent (this month)
  byCategory: { category: string; total: number }[]; // this month expenses
  spent: number; // this month expenses
  income: number; // this month income
  net: number; // all-time income − expense
  budgets: Budget[];
  savings: SavingsGoal[];
};

export async function getMoneyOverview(): Promise<MoneyOverview> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: monthTx }, { data: allTx }, { data: budgets }, { data: savings }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .gte("occurred_at", monthStart)
        .order("occurred_at", { ascending: false }),
      supabase.from("transactions").select("amount, direction").limit(5000),
      supabase.from("budgets").select("*").order("category", { ascending: true }),
      supabase.from("savings_goals").select("*").order("created_at", { ascending: true }),
    ]);

  const transactions = (monthTx ?? []) as Transaction[];

  const catMap = new Map<string, number>();
  let spent = 0;
  let income = 0;
  for (const t of transactions) {
    if (t.direction === "expense") {
      spent += Number(t.amount);
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount));
    } else {
      income += Number(t.amount);
    }
  }
  const byCategory = [...catMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  let net = 0;
  for (const t of (allTx ?? []) as { amount: number; direction: string }[]) {
    net += t.direction === "income" ? Number(t.amount) : -Number(t.amount);
  }

  return {
    transactions,
    byCategory,
    spent,
    income,
    net,
    budgets: (budgets ?? []) as Budget[],
    savings: (savings ?? []) as SavingsGoal[],
  };
}
