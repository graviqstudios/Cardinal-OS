import { createHash, randomBytes } from "crypto";

import { getToken, saveToken } from "@/lib/integrations/tokens";

/** Spotify OAuth (PKCE — no client secret) + a couple of Web API helpers. */

const SCOPES = ["playlist-read-private", "playlist-read-collaborative"];

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function makePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function spotifyAuthUrl(
  redirectUri: string,
  state: string,
  challenge: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SCOPES.join(" "),
    redirect_uri: redirectUri,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

type SpotifyTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export async function exchangeSpotifyCode(
  code: string,
  redirectUri: string,
  verifier: string,
): Promise<SpotifyTokenResponse> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokenResponse> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  return res.json();
}

export async function spotifyAccessToken(userId: string): Promise<string | null> {
  const token = await getToken(userId, "spotify");
  if (!token) return null;
  const expired = token.expiresAt ? Date.parse(token.expiresAt) - 60_000 < Date.now() : false;
  if (!expired) return token.accessToken;
  if (!token.refreshToken) return token.accessToken;

  const refreshed = await refreshSpotifyToken(token.refreshToken);
  await saveToken(userId, "spotify", {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    scopes: token.scopes,
    accountLabel: token.accountLabel,
  });
  return refreshed.access_token;
}

export async function spotifyDisplayName(accessToken: string): Promise<string | null> {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string; id?: string };
  return data.display_name ?? data.id ?? null;
}

export async function spotifyPlaylists(
  accessToken: string,
): Promise<{ id: string; name: string }[]> {
  const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=40", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Spotify playlists failed: ${res.status}`);
  const data = (await res.json()) as { items?: { id: string; name: string }[] };
  return (data.items ?? []).map((p) => ({ id: p.id, name: p.name }));
}
