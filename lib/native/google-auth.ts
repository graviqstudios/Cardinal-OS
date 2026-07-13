import { createClient } from "@/lib/supabase/client";

/**
 * Native Google sign-in for the Android shell.
 *
 * Google blocks its OAuth flow inside embedded WebViews ("disallowed_useragent"),
 * so the web redirect flow can't be used in the app. Instead we use the native
 * Google credential picker (@capgo/capacitor-social-login), get a Google ID
 * token, and exchange it for a Supabase session via signInWithIdToken.
 *
 * Requires NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID (the Google **Web** OAuth client id -
 * its value is the audience Supabase validates, so it must also be listed in the
 * Supabase Google provider's allowed client ids).
 */
const WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let initialized = false;

export async function signInWithGoogleNative(): Promise<void> {
  if (!WEB_CLIENT_ID) {
    throw new Error("Google sign-in isn't configured for the app yet.");
  }

  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  if (!initialized) {
    await SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID } });
    initialized = true;
  }

  const res = await SocialLogin.login({ provider: "google", options: {} });
  // The Google result carries the ID token Supabase needs.
  const result = res.result as { idToken?: string | null };
  const idToken = result?.idToken;
  if (!idToken) {
    throw new Error("Google didn't return an ID token. Please try again.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
}
