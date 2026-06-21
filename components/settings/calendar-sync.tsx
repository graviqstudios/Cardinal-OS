"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw } from "lucide-react";

import { syncGoogleCalendar } from "@/lib/integrations/actions";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

/** Pull the next 30 days of Google Calendar events into Cardinal on demand. */
export function CalendarSync() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await syncGoogleCalendar();
    setBusy(false);
    if (res.ok) {
      setResult(`Synced ${res.data?.imported ?? 0} event${res.data?.imported === 1 ? "" : "s"}.`);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
      <div className="min-w-0 text-xs text-muted-foreground">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : result ? (
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" /> {result}
          </span>
        ) : (
          "Pull your next 30 days from Google. New Cardinal events sync up automatically."
        )}
      </div>
      <Tap className="inline-flex">
        <Button size="sm" variant="secondary" onClick={sync} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync now
        </Button>
      </Tap>
    </div>
  );
}
