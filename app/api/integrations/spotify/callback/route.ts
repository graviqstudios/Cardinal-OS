import { NextRequest, NextResponse } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import { exchangeSpotifyCode, spotifyDisplayName } from "@/lib/integrations/spotify";
import { saveToken } from "@/lib/integrations/tokens";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const settings = new URL("/settings/integrations", url.origin);

  const error = url.searchParams.get("error");
  if (error) {
    settings.searchParams.set("error", error);
    return NextResponse.redirect(settings);
  }

  const code = url.searchParams.get("code");
  const [nonce] = (url.searchParams.get("state") ?? "").split(".");
  const verifier = req.cookies.get("int_pkce")?.value;
  if (!code || !verifier || !nonce || nonce !== req.cookies.get("int_oauth")?.value) {
    settings.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settings);
  }

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  try {
    const redirectUri = `${url.origin}/api/integrations/spotify/callback`;
    const tokens = await exchangeSpotifyCode(code, redirectUri, verifier);
    const name = await spotifyDisplayName(tokens.access_token);
    await saveToken(user.id, "spotify", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: null,
      accountLabel: name,
    });
    settings.searchParams.set("connected", "spotify");
  } catch {
    settings.searchParams.set("error", "exchange_failed");
  }

  const res = NextResponse.redirect(settings);
  res.cookies.delete("int_oauth");
  res.cookies.delete("int_pkce");
  return res;
}
