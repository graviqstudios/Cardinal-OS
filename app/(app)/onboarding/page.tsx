import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("exam_target, exam_date")
    .eq("id", user!.id)
    .single<Pick<Profile, "exam_target" | "exam_date">>();

  return (
    <OnboardingFlow
      initial={{
        exam_target: profile?.exam_target ?? "",
        exam_date: profile?.exam_date ?? "",
      }}
    />
  );
}
