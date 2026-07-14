import { AccessToken } from "livekit-server-sdk";

import { createClient, getUser } from "@/lib/supabase/server";
import { liveKitConfig } from "@/lib/livekit/config";
import { checkRateLimit } from "@/lib/ratelimit";

// Node runtime — the LiveKit server SDK signs a JWT with the API secret.
export const runtime = "nodejs";

/**
 * Mint a LiveKit access token for a voice channel. The room name is the channel
 * id; membership is enforced by RLS (a non-member's channel lookup returns
 * nothing, so no token is issued).
 */
export async function GET(req: Request) {
  const { url, apiKey, apiSecret } = liveKitConfig();
  if (!url || !apiKey || !apiSecret) {
    return Response.json({ error: "Voice is not enabled." }, { status: 503 });
  }

  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "livekit-token");
  if (!rl.success) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const channelId = new URL(req.url).searchParams.get("channelId");
  if (!channelId) {
    return Response.json({ error: "Missing channelId." }, { status: 400 });
  }

  // RLS: this select only returns the channel if the caller is a pod member.
  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("id, type")
    .eq("id", channelId)
    .maybeSingle();
  if (!channel || channel.type !== "voice") {
    return Response.json({ error: "Channel not available." }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    profile?.name?.trim() || profile?.email?.split("@")[0] || "Member";

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name,
    ttl: "2h",
  });
  at.addGrant({
    roomJoin: true,
    room: channelId,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return Response.json({ token, url });
}
