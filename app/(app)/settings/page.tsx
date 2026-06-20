import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Plug, Settings as SettingsIcon } from "lucide-react";

import { ThemeControls } from "@/components/theme/theme-controls";
import { ProfileForm } from "@/components/settings/profile-form";
import { ExamModeToggle } from "@/components/settings/exam-mode-toggle";
import { PageHeader } from "@/components/shell/page-header";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your appearance and profile."
        icon={<SettingsIcon className="h-5 w-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          {/* persist=true → writes accent/palette to the profile on change */}
          <ThemeControls persist />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            examMode={profile?.exam_mode ?? false}
            initial={{
              name: profile?.name ?? "",
              exam_target: profile?.exam_target ?? "",
              exam_date: profile?.exam_date ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exam Prep</CardTitle>
        </CardHeader>
        <CardContent>
          <ExamModeToggle initial={profile?.exam_mode ?? false} />
        </CardContent>
      </Card>

      <Link href="/settings/integrations" className="block">
        <Card className="transition-colors hover:bg-accent/40">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
              <Plug className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Integrations</p>
              <p className="text-sm text-muted-foreground">
                Connect Google, Notion, Spotify and Evernote.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{user?.email}</span>.
          Use the sign-out button in the sidebar to log out.
        </CardContent>
      </Card>
    </div>
  );
}
