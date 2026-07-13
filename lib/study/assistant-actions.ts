"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import { getBudget, type BudgetStatus, DAILY_TOKEN_BUDGET } from "@/lib/ai/usage";

/** Read the signed-in user's AI token budget for today (for the assistant UI). */
export async function getAiBudget(): Promise<BudgetStatus> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) {
    return { limit: DAILY_TOKEN_BUDGET, used: 0, remaining: DAILY_TOKEN_BUDGET };
  }
  return getBudget(supabase, user.id);
}
