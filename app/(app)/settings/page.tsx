import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

import { ThemeControls } from "@/components/theme/theme-controls";
import { ProfileForm } from "@/components/settings/profile-form";
import { ExamModeToggle } from "@/components/settings/exam-mode-toggle";
import { AccountActions } from "@/components/settings/account-actions";
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
              sex: profile?.sex ?? "",
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

      <Card>
        <CardHeader>
          <CardTitle>Legal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Privacy Policy
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Terms &amp; Conditions
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{user?.email}</span>.
          </p>
          <AccountActions />
        </CardContent>
      </Card>
    </div>
  );
}
