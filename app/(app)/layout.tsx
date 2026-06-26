import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isOnboarded, type Profile } from "@/lib/types";
import { LEGAL } from "@/lib/legal/content";
import { getLifeScoreSnapshot } from "@/lib/life-score/service";
import { Sidebar } from "@/components/nav/sidebar";
import { AppHeader } from "@/components/shell/app-header";
import { Aurora } from "@/components/shell/aurora";
import { ConsentGate } from "@/components/legal/consent-gate";
import { PushRegistrar } from "@/components/native/push-registrar";
import { PageTransition } from "@/components/motion/page-transition";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const pathname = (await headers()).get("x-pathname") ?? "";
  const onOnboarding = pathname.startsWith("/onboarding");
  const onboarded = profile ? isOnboarded(profile) : false;

  // Gate: unfinished onboarding must complete it first; finished users skip it.
  if (!onboarded && !onOnboarding) redirect("/onboarding");
  if (onboarded && onOnboarding) redirect("/today");

  // Consent gate: blocks everything (onboarding included) until the *current*
  // Terms are accepted. Re-prompts once when the policy's effective date moves.
  const needsConsent =
    Boolean(profile) &&
    (!profile?.terms_accepted_at ||
      new Date(profile.terms_accepted_at) < new Date(LEGAL.effectiveISO));

  // Onboarding is a focused, full-screen flow — no sidebar shell.
  if (onOnboarding) {
    return (
      <>
        {needsConsent && <ConsentGate />}
        {children}
      </>
    );
  }

  const displayName =
    profile?.name?.trim() || user.email?.split("@")[0] || "there";

  const life = await getLifeScoreSnapshot();

  return (
    <>
      {needsConsent && <ConsentGate />}
      <PushRegistrar />
      <Aurora />
      <div className="relative z-10 flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        displayName={displayName}
        email={user.email ?? ""}
        examMode={profile?.exam_mode ?? false}
      />
      <main className="flex-1">
        <AppHeader score={life?.score ?? 0} previous={life?.previous ?? null} />
        <PageTransition className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </PageTransition>
      </main>
      </div>
    </>
  );
}
