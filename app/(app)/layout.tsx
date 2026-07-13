import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient, getUser } from "@/lib/supabase/server";
import { isOnboarded, type Profile } from "@/lib/types";
import { LEGAL } from "@/lib/legal/content";
import { getLifeScoreSnapshot } from "@/lib/life-score/service";
import { Sidebar } from "@/components/nav/sidebar";
import { AppHeader } from "@/components/shell/app-header";
import { Aurora } from "@/components/shell/aurora";
import { ConsentGate } from "@/components/legal/consent-gate";
import { PushRegistrar } from "@/components/native/push-registrar";
import { BiometricGate } from "@/components/native/biometric-gate";
import { PageTransition } from "@/components/motion/page-transition";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) redirect("/login");

  // Profile, the request pathname, and the Life Score all fetch in parallel.
  // The score feeds the header on every normal page; computing it alongside the
  // profile removes a serial round-trip from each navigation. (On the rare
  // onboarding early-return path it goes unused, which is an acceptable trade.)
  const [{ data: profile }, pathname, life] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single<Profile>(),
    headers().then((h) => h.get("x-pathname") ?? ""),
    getLifeScoreSnapshot(),
  ]);

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

  // Onboarding is a focused, full-screen flow - no sidebar shell.
  if (onOnboarding) {
    return (
      <>
        <BiometricGate />
        {needsConsent && <ConsentGate />}
        {children}
      </>
    );
  }

  const displayName =
    profile?.name?.trim() || user.email?.split("@")[0] || "there";

  return (
    <>
      <BiometricGate />
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
        <PageTransition className="mx-auto w-full max-w-6xl px-4 py-6 md:px-10 md:py-10 lg:px-12">
          {children}
        </PageTransition>
      </main>
      </div>
    </>
  );
}
