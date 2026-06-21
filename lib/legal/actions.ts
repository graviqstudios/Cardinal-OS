"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Record that the signed-in user has accepted the Terms & Privacy Policy. */
export async function acceptTerms(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("users")
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { ok: false };

  revalidatePath("/", "layout");
  return { ok: true };
}
