"use server";

import { revalidatePath } from "next/cache";
import { generateObject, generateText } from "ai";
import { z } from "zod";

import { createClient, getUser } from "@/lib/supabase/server";
import { isMockAI, liteModel, reasoningModel } from "@/lib/ai/models";
import {
  CATEGORY_NAMES,
  formatMoney,
  type Direction,
} from "@/lib/money/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function uid() {
  const supabase = await createClient();
  const user = await getUser();
  return { supabase, userId: user?.id ?? null };
}

// ── Categorisation (AI with keyword fallback) ────────────────────────────────
const KEYWORDS: Record<string, string> = {
  food: "Food", lunch: "Food", dinner: "Food", biryani: "Food", coffee: "Food",
  snack: "Food", grocery: "Food", restaurant: "Food", pizza: "Food", tea: "Food",
  bus: "Transport", train: "Transport", uber: "Transport", ola: "Transport",
  fuel: "Transport", petrol: "Transport", auto: "Transport", cab: "Transport",
  shirt: "Shopping", clothes: "Shopping", amazon: "Shopping", shopping: "Shopping",
  rent: "Bills", electricity: "Bills", wifi: "Bills", recharge: "Bills", bill: "Bills",
  movie: "Entertainment", game: "Entertainment", netflix: "Entertainment", concert: "Entertainment",
  medicine: "Health", doctor: "Health", gym: "Health", pharmacy: "Health",
  book: "Education", course: "Education", tuition: "Education", exam: "Education",
};

function keywordCategory(note: string): string {
  const lower = note.toLowerCase();
  for (const [k, v] of Object.entries(KEYWORDS)) {
    if (lower.includes(k)) return v;
  }
  return "Other";
}

async function categorize(note: string): Promise<string> {
  if (!note.trim()) return "Other";
  if (isMockAI) return keywordCategory(note);
  try {
    const { object } = await generateObject({
      model: liteModel(),
      schema: z.object({ category: z.enum(CATEGORY_NAMES as [string, ...string[]]) }),
      system: `Classify a student's expense note into exactly one category: ${CATEGORY_NAMES.join(", ")}.`,
      prompt: note,
    });
    return object.category;
  } catch {
    return keywordCategory(note);
  }
}

// ── Transactions ──────────────────────────────────────────────────────────────
export async function createTransaction(input: {
  amount: number;
  note?: string | null;
  category?: string;
  direction?: Direction;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!(input.amount > 0)) return { ok: false, error: "Enter an amount." };

  const direction: Direction = input.direction === "income" ? "income" : "expense";
  const note = input.note?.trim() || null;
  let category = input.category;
  if (!category) {
    category = direction === "income" ? "Income" : await categorize(note ?? "");
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    amount: input.amount,
    direction,
    category,
    note,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/money");
  return { ok: true };
}

export async function setTransactionCategory(id: string, category: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("transactions").update({ category }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/money");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/money");
  return { ok: true };
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export async function setBudget(category: string, monthlyLimit: number): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!(monthlyLimit >= 0)) return { ok: false, error: "Enter a limit." };
  const { error } = await supabase
    .from("budgets")
    .upsert({ user_id: userId, category, monthly_limit: monthlyLimit }, { onConflict: "user_id,category" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/money");
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/money");
  return { ok: true };
}

// ── Savings goals ───────────────────────────────────────────────────────────
export async function createSavingsGoal(input: {
  title: string;
  target_amount: number;
  target_date?: string | null;
}): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (!(input.target_amount > 0)) return { ok: false, error: "Enter a target amount." };
  const { error } = await supabase.from("savings_goals").insert({
    user_id: userId,
    title: input.title.trim(),
    target_amount: input.target_amount,
    target_date: input.target_date || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/money");
  return { ok: true };
}

export async function deleteSavingsGoal(id: string): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/money");
  return { ok: true };
}

// ── Weekly AI prose summary (shown in-app; email delivery deferred) ──────────
export async function generateWeeklySummary(): Promise<Result<{ text: string }>> {
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("transactions")
    .select("amount, direction, category, note, occurred_at")
    .gte("occurred_at", weekAgo)
    .order("occurred_at", { ascending: false });

  const tx = (data ?? []) as { amount: number; direction: string; category: string }[];
  if (tx.length === 0) {
    return { ok: true, data: { text: "No transactions in the last 7 days. Log a few and check back for your summary." } };
  }

  const spent = tx.filter((t) => t.direction === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const byCat = new Map<string, number>();
  for (const t of tx) {
    if (t.direction === "expense") byCat.set(t.category, (byCat.get(t.category) ?? 0) + Number(t.amount));
  }
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (isMockAI) {
    const list = top.map(([c, a]) => `${c} (${formatMoney(a)})`).join(", ");
    return {
      ok: true,
      data: { text: `This week you spent ${formatMoney(spent)} across ${tx.length} transactions. Your biggest categories were ${list}. Keep an eye on the top one next week.` },
    };
  }

  try {
    const { text } = await generateText({
      model: reasoningModel(),
      system: "You are a friendly, concise money coach for a student. Write a short, warm 2–3 sentence prose summary of their week's spending. No bullet points, no preamble. Encourage gently.",
      prompt: `This week: total spent ${formatMoney(spent)} over ${tx.length} transactions. Top categories: ${top
        .map(([c, a]) => `${c} ${formatMoney(a)}`)
        .join(", ")}.`,
    });
    return { ok: true, data: { text } };
  } catch {
    const list = top.map(([c, a]) => `${c} (${formatMoney(a)})`).join(", ");
    return { ok: true, data: { text: `This week you spent ${formatMoney(spent)} across ${tx.length} transactions, mostly on ${list}.` } };
  }
}
