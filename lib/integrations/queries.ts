import { createClient } from "@/lib/supabase/server";
import type { ProviderId } from "@/lib/integrations/registry";

export type Connection = {
  provider: ProviderId;
  accountLabel: string | null;
  connectedAt: string;
};

/**
 * The current user's active integration connections (no token material). Returns
 * an empty list if the table doesn't exist yet, so the page renders pre-migration.
 */
export async function getConnections(): Promise<Connection[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("integration_tokens")
    .select("provider, account_label, connected_at")
    .eq("user_id", user.id);
  if (error || !data) return [];

  return data.map((r) => ({
    provider: r.provider as ProviderId,
    accountLabel: (r.account_label as string) ?? null,
    connectedAt: r.connected_at as string,
  }));
}
