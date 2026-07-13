import { getToken, saveToken } from "@/lib/integrations/tokens";

/**
 * Google OAuth + API helpers for the Calendar and Gmail integrations. One OAuth
 * client (GOOGLE_CLIENT_ID/SECRET) backs both connections; each requests only
 * its own scope. All calls run on the Node runtime.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export type GoogleProvider = "google_calendar" | "google_gmail";

const SCOPES: Record<GoogleProvider, string[]> = {
  google_calendar: [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar",
  ],
  google_gmail: [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
};

/** The single redirect URI both flows use (must match what's registered). */
export function googleRedirectUri(origin: string): string {
  return `${origin}/api/integrations/google/callback`;
}

export function buildGoogleAuthUrl(
  provider: GoogleProvider,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES[provider].join(" "),
    access_type: "offline", // ask for a refresh token
    include_granted_scopes: "true",
    prompt: "consent", // force a refresh token on reconnect
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshGoogleToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  return res.json();
}

export async function getGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

/**
 * Return a valid access token for a connected Google provider, transparently
 * refreshing it (and persisting the new one) when it has expired. Null if the
 * user hasn't connected this provider.
 */
export async function freshAccessToken(
  userId: string,
  provider: GoogleProvider,
): Promise<string | null> {
  const token = await getToken(userId, provider);
  if (!token) return null;

  const expired = token.expiresAt ? Date.parse(token.expiresAt) - 60_000 < Date.now() : false;
  if (!expired) return token.accessToken;
  if (!token.refreshToken) return token.accessToken; // best effort

  const refreshed = await refreshGoogleToken(token.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await saveToken(userId, provider, {
    accessToken: refreshed.access_token,
    refreshToken: token.refreshToken, // Google omits it on refresh; keep ours
    expiresAt,
    scopes: token.scopes,
    accountLabel: token.accountLabel,
  });
  return refreshed.access_token;
}

/* ── Gmail ─────────────────────────────────────────────────────────────────── */
export type GmailDigestItem = { subject: string; from: string; snippet: string };

/** Recent inbox messages (metadata + snippet only) for action-item extraction. */
export async function fetchGmailDigest(
  accessToken: string,
  max = 15,
): Promise<GmailDigestItem[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=in:inbox -category:promotions -category:social`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
  const list = (await listRes.json()) as { messages?: { id: string }[] };
  const ids = (list.messages ?? []).map((m) => m.id);

  const items = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return null;
      const msg = (await res.json()) as {
        snippet?: string;
        payload?: { headers?: { name: string; value: string }[] };
      };
      const header = (n: string) =>
        msg.payload?.headers?.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? "";
      return {
        subject: header("Subject"),
        from: header("From"),
        snippet: msg.snippet ?? "",
      } satisfies GmailDigestItem;
    }),
  );
  return items.filter((i): i is GmailDigestItem => i != null);
}

/* ── Calendar ──────────────────────────────────────────────────────────────── */
export type GoogleEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

/** Upcoming events from the user's primary calendar (next `days` days). */
export async function fetchGoogleEvents(
  accessToken: string,
  days = 30,
): Promise<GoogleEvent[]> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 86_400_000).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=100`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Calendar list failed: ${res.status}`);
  const data = (await res.json()) as { items?: GoogleEvent[] };
  return data.items ?? [];
}

/** Create an event on the user's primary Google calendar; returns its id. */
export async function insertGoogleEvent(
  accessToken: string,
  ev: { summary: string; startISO: string; endISO: string; allDay: boolean },
): Promise<string> {
  const body = ev.allDay
    ? { summary: ev.summary, start: { date: ev.startISO.slice(0, 10) }, end: { date: ev.endISO.slice(0, 10) } }
    : { summary: ev.summary, start: { dateTime: ev.startISO }, end: { dateTime: ev.endISO } };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`Calendar insert failed: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Create a Google Calendar event with a Google Meet conference attached, and
 * return the join link. Used by Constellation study rooms as a free video
 * option for members who've connected Google Calendar.
 */
export async function createGoogleMeet(
  accessToken: string,
  opts: { summary: string; minutes?: number },
): Promise<string | null> {
  const start = new Date();
  const end = new Date(Date.now() + (opts.minutes ?? 60) * 60_000);
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: opts.summary,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `cardinal-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Meet create failed: ${res.status}`);
  const data = (await res.json()) as {
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { uri?: string }[] };
  };
  return (
    data.hangoutLink ??
    data.conferenceData?.entryPoints?.find((e) => e.uri)?.uri ??
    null
  );
}
