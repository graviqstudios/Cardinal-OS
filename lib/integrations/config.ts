import type { ProviderId } from "@/lib/integrations/registry";

/**
 * Server-side check for whether a provider's OAuth credentials are present in
 * the environment. Used to decide whether to surface a "Connect" button or a
 * "Not configured" state. Never import into a client component.
 */
export function isProviderConfigured(id: ProviderId): boolean {
  switch (id) {
    case "google_calendar":
    case "google_gmail":
      return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    case "notion":
      return Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET);
    case "spotify":
      return Boolean(process.env.SPOTIFY_CLIENT_ID); // PKCE — no secret stored
    case "evernote":
      return Boolean(process.env.EVERNOTE_CONSUMER_KEY && process.env.EVERNOTE_CONSUMER_SECRET);
    default:
      return false;
  }
}

/** True once a server-side encryption key exists to store tokens safely. */
export function hasEncryptionKey(): boolean {
  return Boolean(process.env.INTEGRATION_ENC_KEY);
}
