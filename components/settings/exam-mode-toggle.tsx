"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, GraduationCap, Loader2 } from "lucide-react";

import { updateProfile } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

export function ExamModeToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setPending(true);
    setError(null);
    setSaved(false);
    const res = await updateProfile({ exam_mode: next });
    setPending(false);
    if (res.ok) {
      setEnabled(next);
      setSaved(true);
      // Refresh so the sidebar adds/removes the exam tools immediately.
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: "hsl(var(--module-study) / 0.12)",
            color: "hsl(var(--module-study))",
          }}
        >
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {enabled ? "Exam Prep is installed" : "Add Exam Prep"}
          </p>
          <p className="text-sm text-muted-foreground">
            Studying for an exam? Add the prep tools — Study, Practice, Heat map
            and Voice — to your sidebar. You can remove them any time.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tap className="inline-block">
        <Button
          type="button"
          variant={enabled ? "outline" : "default"}
          onClick={toggle}
          disabled={pending}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved && !pending && <Check className="h-4 w-4" />}
          {enabled ? "Remove Exam Prep" : "Install Exam Prep"}
        </Button>
      </Tap>
    </div>
  );
}
