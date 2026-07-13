"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";

import { completeTour } from "@/lib/tour/actions";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";
import { ProductTour } from "@/components/tour/product-tour";

const KEY = "co-whatsnew-seen";

/**
 * A calm, dismissable "what's new" banner shown once to returning users after a
 * tour version bump. Either action (take the tour or dismiss) marks the update
 * seen - in the DB via completeTour, and in localStorage so it never reappears
 * on this device even if the DB write can't persist yet.
 */
export function WhatsNew({ version }: { version: number }) {
  const [state, setState] = React.useState<"checking" | "banner" | "tour" | "hidden">("checking");

  React.useEffect(() => {
    let seen = 0;
    try {
      seen = Number(localStorage.getItem(KEY) || 0);
    } catch { /* ignore */ }
    setState(seen >= version ? "hidden" : "banner");
  }, [version]);

  function markSeen() {
    try {
      localStorage.setItem(KEY, String(version));
    } catch { /* ignore */ }
  }

  async function dismiss() {
    markSeen();
    setState("hidden");
    await completeTour();
  }

  function takeTour() {
    markSeen();
    void completeTour();
    setState("tour");
  }

  if (state === "checking" || state === "hidden") return null;
  if (state === "tour") return <ProductTour run returning />;

  return (
    <div
      className="relative flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: "hsl(var(--primary) / 0.06)",
        borderColor: "hsl(var(--primary) / 0.22)",
      }}
      role="status"
    >
      <div className="flex items-start gap-3 pr-6">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-button"
          style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="font-serif text-base leading-tight">A few new things</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Habits, tasks, projects and goals now live together in Plan, and Body is now Health.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:pr-2">
        <Tap className="inline-flex">
          <Button size="sm" onClick={takeTour}>Take a quick look</Button>
        </Tap>
        <Tap className="inline-flex">
          <Button size="sm" variant="ghost" onClick={() => void dismiss()}>Dismiss</Button>
        </Tap>
      </div>

      <button
        onClick={() => void dismiss()}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground sm:hidden"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
