/**
 * Self-hosted LiveKit config for Constellation voice/video rooms. Mirrors the
 * isMockAI pattern: when the env isn't set, the app builds and every non-voice
 * feature works — voice rooms just show a "not enabled" placeholder. Set
 * LIVEKIT_URL (wss://…), LIVEKIT_API_KEY and LIVEKIT_API_SECRET to switch it on.
 * Server-only (never expose the API secret to the client).
 */
export function liveKitConfig() {
  return {
    url: process.env.LIVEKIT_URL ?? null,
    apiKey: process.env.LIVEKIT_API_KEY ?? null,
    apiSecret: process.env.LIVEKIT_API_SECRET ?? null,
  };
}

export const isLiveKitConfigured = Boolean(
  process.env.LIVEKIT_URL &&
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET,
);
