import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";

/**
 * Root entry. Signed-in users go straight to their command centre; everyone
 * else sees the public marketing landing page (served at the clean "/" URL).
 */
export default async function Home() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    // Supabase not configured yet — treat as signed out and show the landing.
  }

  // redirect() throws internally, so it must run outside the try/catch above.
  if (signedIn) redirect("/today");

  return <LandingPage />;
}
