import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import { isProviderConfigured, hasEncryptionKey } from "@/lib/integrations/config";
import type { ProviderId } from "@/lib/integrations/registry";
import { buildGoogleAuthUrl, googleRedirectUri, type GoogleProvider } from "@/lib/integrations/google";
import { notionAuthUrl } from "@/lib/integrations/notion";
import { makePkcePair, spotifyAuthUrl } from "@/lib/integrations/spotify";
import { evernoteRequestToken, evernoteAuthorizeUrl } from "@/lib/integrations/evernote";

export const runtime = "nodejs";

const VALID: ProviderId[] = ["google_calendar", "google_gmail", "notion", "spotify", "evernote"];

const cookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 600,
};

/** Begin an OAuth connect flow for any provider. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const origin = new URL(req.url).origin;
  const settings = new URL("/settings/integrations", origin);

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  if (!VALID.includes(provider as ProviderId)) {
    settings.searchParams.set("error", "unsupported");
    return NextResponse.redirect(settings);
  }
  if (!isProviderConfigured(provider as ProviderId) || !hasEncryptionKey()) {
    settings.searchParams.set("error", "not_configured");
    return NextResponse.redirect(settings);
  }

  const nonce = randomBytes(16).toString("hex");
  const callback = (p: string) => `${origin}/api/integrations/${p}/callback`;

  try {
    if (provider === "google_calendar" || provider === "google_gmail") {
      const url = buildGoogleAuthUrl(
        provider as GoogleProvider,
        googleRedirectUri(origin),
        `${nonce}.${provider}`,
      );
      const res = NextResponse.redirect(url);
      res.cookies.set("int_oauth", nonce, cookieOpts);
      return res;
    }

    if (provider === "notion") {
      const url = notionAuthUrl(callback("notion"), `${nonce}.notion`);
      const res = NextResponse.redirect(url);
      res.cookies.set("int_oauth", nonce, cookieOpts);
      return res;
    }

    if (provider === "spotify") {
      const { verifier, challenge } = makePkcePair();
      const url = spotifyAuthUrl(callback("spotify"), `${nonce}.spotify`, challenge);
      const res = NextResponse.redirect(url);
      res.cookies.set("int_oauth", nonce, cookieOpts);
      res.cookies.set("int_pkce", verifier, cookieOpts);
      return res;
    }

    // evernote — OAuth 1.0a: fetch a request token, then redirect to authorize.
    const reqToken = await evernoteRequestToken(callback("evernote"));
    const res = NextResponse.redirect(evernoteAuthorizeUrl(reqToken.oauth_token));
    res.cookies.set("int_evernote_secret", reqToken.oauth_token_secret, cookieOpts);
    return res;
  } catch {
    settings.searchParams.set("error", "start_failed");
    return NextResponse.redirect(settings);
  }
}
