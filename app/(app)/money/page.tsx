import { getMoneyOverview } from "@/lib/money/queries";
import { formatMoney } from "@/lib/money/types";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyClient } from "@/components/money/money-client";
import { SpendingChart } from "@/components/money/spending-chart";
import { BudgetsPanel } from "@/components/money/budgets-panel";
import { SavingsPanel } from "@/components/money/savings-panel";
import { WeeklySummary } from "@/components/money/weekly-summary";
import { PageHeader } from "@/components/shell/page-header";

export default async function MoneyPage() {
  const o = await getMoneyOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money"
        description="Log expenses in 3 taps, track budgets, and watch your savings grow."
        colorVar="--module-money"
        mark="/brand/module-money.svg"
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Spent this month" value={formatMoney(o.spent)} varName="--module-money" />
        <Stat label="Income this month" value={formatMoney(o.income)} varName="--status-strong" />
        <Stat label="Net savings" value={formatMoney(Math.max(0, o.net))} varName="--module-goals" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <MoneyClient transactions={o.transactions} />
          <WeeklySummary />
        </div>
        <div className="space-y-6">
          <SpendingChart byCategory={o.byCategory} spent={o.spent} />
          <BudgetsPanel budgets={o.budgets} byCategory={o.byCategory} />
          <SavingsPanel goals={o.savings} net={o.net} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, varName }: { label: string; value: string; varName: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: `hsl(var(${varName}))` }}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
