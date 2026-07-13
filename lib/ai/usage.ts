import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Daily AI token budget for the study assistant. Metered as real input+output
 * tokens per user per day in the `ai_usage` table (see 0031_ai_usage.sql).
 * Everything fails open: if the table/RPC isn't there yet, budget checks pass
 * so local dev is never blocked.
 */
export const DAILY_TOKEN_BUDGET = 150_000;

export type BudgetStatus = {
  limit: number;
  used: number;
  remaining: number;
};

/** Today's usage → remaining budget. Fails open (full budget) on any error. */
export async function getBudget(
  supabase: SupabaseClient,
  userId: string,
): Promise<BudgetStatus> {
  const full: BudgetStatus = {
    limit: DAILY_TOKEN_BUDGET,
    used: 0,
    remaining: DAILY_TOKEN_BUDGET,
  };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("ai_usage")
      .select("input_tokens, output_tokens")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();
    if (error || !data) return full;
    const used =
      (data.input_tokens as number) + (data.output_tokens as number);
    return {
      limit: DAILY_TOKEN_BUDGET,
      used,
      remaining: Math.max(0, DAILY_TOKEN_BUDGET - used),
    };
  } catch {
    return full;
  }
}

/** Record token usage for today. Best-effort; errors are swallowed. */
export async function recordUsage(
  supabase: SupabaseClient,
  input: number,
  output: number,
): Promise<void> {
  try {
    await supabase.rpc("record_ai_usage", {
      p_in: Math.max(0, Math.round(input || 0)),
      p_out: Math.max(0, Math.round(output || 0)),
    });
  } catch {
    // best-effort metering; never block the response on it.
  }
}
