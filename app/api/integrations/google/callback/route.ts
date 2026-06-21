import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  exchangeGoogleCode,
  getGoogleEmail,
  googleRedirectUri,
  type GoogleProvider,
} from "@/lib/integrations/google";
import { saveToken } from "@/lib/integrations/tokens";

export const runtime = "nodejs";

/** OAuth redirect target for both Google connections (Calendar + Gmail). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const settings = new URL("/calendar", url.origin);

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    settings.searchParams.set("error", oauthError);
    return NextResponse.redirect(settings);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const [nonce, provider] = state.split(".");
  const cookieNonce = req.cookies.get("int_oauth")?.value;

  if (
    !code ||
    !nonce ||
    nonce !== cookieNonce ||
    (provider !== "google_calendar" && provider !== "google_gmail")
  ) {
    settings.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settings);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  try {
    const tokens = await exchangeGoogleCode(code, googleRedirectUri(url.origin));
    const email = await getGoogleEmail(tokens.access_token);
    await saveToken(user.id, provider as GoogleProvider, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope ? tokens.scope.split(" ") : null,
      accountLabel: email,
    });
    settings.searchParams.set("connected", provider);
  } catch {
    settings.searchParams.set("error", "exchange_failed");
  }

  const res = NextResponse.redirect(settings);
  res.cookies.delete("int_oauth");
  return res;
}
