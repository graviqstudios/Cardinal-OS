import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { exchangeNotionCode } from "@/lib/integrations/notion";
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
  if (!code || !nonce || nonce !== req.cookies.get("int_oauth")?.value) {
    settings.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settings);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  try {
    const token = await exchangeNotionCode(code, `${url.origin}/api/integrations/notion/callback`);
    await saveToken(user.id, "notion", {
      accessToken: token.access_token,
      refreshToken: null,
      expiresAt: null,
      scopes: null,
      accountLabel: token.workspace_name ?? "Notion",
    });
    settings.searchParams.set("connected", "notion");
  } catch {
    settings.searchParams.set("error", "exchange_failed");
  }

  const res = NextResponse.redirect(settings);
  res.cookies.delete("int_oauth");
  return res;
}
