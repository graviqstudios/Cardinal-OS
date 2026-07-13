import { createClient } from "@/lib/supabase/server";

/**
 * Per-user rate limiting for every AI route, keyed by `<route>:auth.uid()`.
 * Backed by a Postgres fixed-window counter (see
 * supabase/migrations/0003_rate_limit.sql) - no external service.
 *
 * Fails open: if the RPC errors (e.g. the migration hasn't run yet) the request
 * is allowed, so local dev is never blocked by rate limiting.
 */

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 20; // per user, per route, per window

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

export async function checkRateLimit(
  userId: string,
  route: string,
): Promise<RateLimitResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: `${route}:${userId}`,
      p_max: MAX_REQUESTS,
      p_window_seconds: WINDOW_SECONDS,
    });

    if (error || !data) {
      return { success: true, remaining: -1, reset: 0 }; // fail open
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      success: Boolean(row?.allowed),
      remaining: typeof row?.remaining === "number" ? row.remaining : -1,
      reset: row?.reset_at ? Date.parse(row.reset_at) : 0,
    };
  } catch {
    return { success: true, remaining: -1, reset: 0 };
  }
}
