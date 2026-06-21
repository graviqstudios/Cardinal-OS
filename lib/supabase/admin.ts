import { createClient } from "@supabase/supabase-js";

/** True when the service-role key is configured (required for admin jobs). */
export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Service-role Supabase client — bypasses RLS. Server-only, for trusted
 * background jobs (e.g. the monthly-review cron) that operate across all users.
 * Never import into client code or expose the service key.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
