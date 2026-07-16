import { createClient, getUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Plug } from "lucide-react";
import Link from "next/link";

import { ThemeControls } from "@/components/theme/theme-controls";
import { ProfileForm } from "@/components/settings/profile-form";
import { ExamModeToggle } from "@/components/settings/exam-mode-toggle";
import { AccountActions } from "@/components/settings/account-actions";
import { ChangePassword } from "@/components/settings/change-password";
import { BiometricLockToggle } from "@/components/settings/biometric-lock-toggle";
import { FeedbackForm } from "@/components/settings/feedback-form";
import { PageHeader } from "@/components/shell/page-header";

export default async function SettingsPage() {
  const user = await getUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance, connected apps and account."
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
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect Google Calendar, Notion, and Spotify - or disconnect one you no
            longer want linked.
          </p>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Plug className="h-4 w-4" />
            Manage connected apps
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedback &amp; reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cardinal is free during beta and shaped by the people using it. Tell us
            what&apos;s working, leave a review, or report a bug.
          </p>
          <FeedbackForm />
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
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePassword email={user!.email!} />
        </CardContent>
      </Card>

      {/* App lock - only renders inside the native app. */}
      <BiometricLockToggle />

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
