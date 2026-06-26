import { createClient, getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Register (upsert) the calling user's FCM device token. Called from the native
 * shell after the OS grants push permission and returns a registration token.
 */
export async function POST(request: Request) {
  const user = await getUser();
  const supabase = await createClient();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: { token?: string; platform?: string };
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) return new Response("Missing token", { status: 400 });

  const { error } = await supabase
    .from("device_tokens")
    .upsert(
      {
        user_id: user.id,
        token,
        platform: body.platform ?? "android",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" },
    );

  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true });
}
