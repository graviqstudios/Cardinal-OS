import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isOnboarded, type Profile } from "@/lib/types";
import { getReadinessSnapshot } from "@/lib/readiness/service";
import { Sidebar } from "@/components/nav/sidebar";
import { AppHeader } from "@/components/shell/app-header";
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
  if (onboarded && onOnboarding) redirect("/dashboard");

  // Onboarding is a focused, full-screen flow — no sidebar shell.
  if (onOnboarding) {
    return <>{children}</>;
  }

  const displayName =
    profile?.name?.trim() || user.email?.split("@")[0] || "there";

  const readiness = await getReadinessSnapshot();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar displayName={displayName} email={user.email ?? ""} />
      <main className="flex-1">
        <AppHeader score={readiness?.score ?? 0} previous={readiness?.previous ?? null} />
        <PageTransition className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
