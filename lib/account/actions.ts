"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Permanently delete the signed-in user's account. Removing the auth user
 * cascades to public.users and every owned table (all FK'd to auth.users with
 * ON DELETE CASCADE), so all of their data is erased (DPDP right to erasure).
 */
export async function deleteAccount(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!hasServiceRole()) {
    return { ok: false, error: "Account deletion is temporarily unavailable. Please contact support." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
