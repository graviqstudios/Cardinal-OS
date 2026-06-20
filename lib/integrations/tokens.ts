import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { decryptToken, encryptToken } from "@/lib/integrations/crypto";
import type { ProviderId } from "@/lib/integrations/registry";

export type StoredToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[] | null;
  accountLabel: string | null;
};

/** Upsert a provider's tokens for a user, encrypting access/refresh at rest. */
export async function saveToken(
  userId: string,
  provider: ProviderId,
  token: StoredToken,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("integration_tokens").upsert(
    {
      user_id: userId,
      provider,
      access_token: encryptToken(token.accessToken),
      refresh_token: token.refreshToken ? encryptToken(token.refreshToken) : null,
      expires_at: token.expiresAt,
      scopes: token.scopes,
      account_label: token.accountLabel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
}

/** Read + decrypt a provider's tokens for a user, or null if not connected. */
export async function getToken(
  userId: string,
  provider: ProviderId,
  client?: SupabaseClient,
): Promise<StoredToken | null> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("integration_tokens")
    .select("access_token, refresh_token, expires_at, scopes, account_label")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (!data) return null;

  return {
    accessToken: decryptToken(data.access_token as string),
    refreshToken: data.refresh_token ? decryptToken(data.refresh_token as string) : null,
    expiresAt: (data.expires_at as string) ?? null,
    scopes: (data.scopes as string[]) ?? null,
    accountLabel: (data.account_label as string) ?? null,
  };
}

export async function deleteToken(userId: string, provider: ProviderId): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("integration_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
}
