import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Whether the signed-in user has ever submitted feedback. Used to permanently
 * suppress the in-app feedback prompt once they've responded - across every
 * device, not just the one where they dismissed it (localStorage can't do that).
 */
export async function hasSubmittedFeedback(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const supabase = await createClient();
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (count ?? 0) > 0;
}
