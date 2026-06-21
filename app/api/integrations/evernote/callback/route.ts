import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { evernoteAccessToken } from "@/lib/integrations/evernote";
import { saveToken } from "@/lib/integrations/tokens";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const settings = new URL("/settings/integrations", url.origin);

  const oauthToken = url.searchParams.get("oauth_token");
  const verifier = url.searchParams.get("oauth_verifier");
  const tokenSecret = req.cookies.get("int_evernote_secret")?.value;

  if (!oauthToken || !verifier || !tokenSecret) {
    // The user may have declined; Evernote omits the verifier in that case.
    settings.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settings);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  try {
    const access = await evernoteAccessToken(oauthToken, verifier, tokenSecret);
    await saveToken(user.id, "evernote", {
      accessToken: access.oauth_token,
      refreshToken: null,
      expiresAt: access.edam_expires
        ? new Date(Number(access.edam_expires)).toISOString()
        : null,
      // Store the shard / note-store URL so a later import step can reach the API.
      scopes: access.edam_noteStoreUrl ? [access.edam_noteStoreUrl] : null,
      accountLabel: access.edam_userId ? `Evernote #${access.edam_userId}` : "Evernote",
    });
    settings.searchParams.set("connected", "evernote");
  } catch {
    settings.searchParams.set("error", "exchange_failed");
  }

  const res = NextResponse.redirect(settings);
  res.cookies.delete("int_evernote_secret");
  return res;
}
