import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Root entry — bounce to the dashboard if signed in, otherwise to login. */
export default async function Home() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    // Supabase not configured yet — treat as signed out.
  }

  redirect(signedIn ? "/today" : "/login");
}
