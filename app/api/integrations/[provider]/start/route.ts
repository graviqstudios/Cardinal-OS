import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl, googleRedirectUri, type GoogleProvider } from "@/lib/integrations/google";

export const runtime = "nodejs";

const GOOGLE_PROVIDERS = ["google_calendar", "google_gmail"];

/** Begin an OAuth connect flow for a provider. (Google only, for now.) */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const origin = new URL(req.url).origin;
  const settings = new URL("/settings/integrations", origin);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  if (!GOOGLE_PROVIDERS.includes(provider)) {
    settings.searchParams.set("error", "unsupported");
    return NextResponse.redirect(settings);
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    settings.searchParams.set("error", "not_configured");
    return NextResponse.redirect(settings);
  }

  const nonce = randomBytes(16).toString("hex");
  const state = `${nonce}.${provider}`;
  const authUrl = buildGoogleAuthUrl(
    provider as GoogleProvider,
    googleRedirectUri(origin),
    state,
  );

  const res = NextResponse.redirect(authUrl);
  // Short-lived CSRF cookie tying this browser to the state we sent Google.
  res.cookies.set("int_oauth", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
