import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side FCM sender (HTTP v1). Trusted background jobs (crons, reminders)
 * call this to push to a user's devices.
 *
 * Auth: a Firebase service-account JSON in FIREBASE_SERVICE_ACCOUNT (stringified)
 * is used to mint a short-lived OAuth2 access token scoped to FCM. Tokens that
 * FCM reports as unregistered are pruned from device_tokens.
 *
 * No-ops (returns { sent: 0 }) when FIREBASE_SERVICE_ACCOUNT isn't configured,
 * so callers don't need to guard.
 */

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type PushMessage = {
  title: string;
  body: string;
  /** Optional data payload (e.g. a deep-link path). Values must be strings. */
  data?: Record<string, string>;
};

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const { JWT } = await import("google-auth-library");
  const client = new JWT({
    email: account.client_email,
    key: account.private_key,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const { access_token } = await client.authorize();
  if (!access_token) throw new Error("Failed to obtain FCM access token.");
  return access_token;
}

/** Send a notification to every registered device of a user. */
export async function sendPushToUser(
  userId: string,
  message: PushMessage,
): Promise<{ sent: number; pruned: number }> {
  const account = getServiceAccount();
  if (!account) return { sent: 0, pruned: 0 };

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", userId);

  const tokens = (rows ?? []).map((r) => r.token as string);
  if (tokens.length === 0) return { sent: 0, pruned: 0 };

  const accessToken = await getAccessToken(account);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;

  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    tokens.map(async (token) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body },
            ...(message.data ? { data: message.data } : {}),
            android: { priority: "high" },
          },
        }),
      });

      if (res.ok) {
        sent += 1;
        return;
      }
      // 404 UNREGISTERED / 400 invalid token → drop it so we stop sending to it.
      if (res.status === 404 || res.status === 400) {
        stale.push(token);
      }
    }),
  );

  if (stale.length > 0) {
    await supabase.from("device_tokens").delete().in("token", stale);
  }

  return { sent, pruned: stale.length };
}
