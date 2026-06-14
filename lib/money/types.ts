export type Direction = "expense" | "income";

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  direction: Direction;
  category: string;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
};

export type SavingsGoal = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  target_date: string | null;
  created_at: string;
};

/** Fixed expense categories with a stable hue for chart/legend colouring. */
export const CATEGORIES: { name: string; hue: number }[] = [
  { name: "Food", hue: 25 },
  { name: "Transport", hue: 200 },
  { name: "Shopping", hue: 330 },
  { name: "Bills", hue: 260 },
  { name: "Entertainment", hue: 160 },
  { name: "Health", hue: 0 },
  { name: "Education", hue: 243 },
  { name: "Other", hue: 220 },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export function categoryColor(name: string): string {
  const c = CATEGORIES.find((x) => x.name === name);
  return `hsl(${c?.hue ?? 220} 65% 55%)`;
}

/** ₹ formatting (Indian locale, no decimals for whole amounts). */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
