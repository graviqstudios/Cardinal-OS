"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw } from "lucide-react";

import { syncGoogleCalendar } from "@/lib/integrations/actions";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

/** Connect / sync Google Calendar, surfaced in the Calendar page header. */
export function GoogleCalendarButton({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);

  if (!configured) return null;

  if (!connected) {
    return (
      <Tap className="inline-flex">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { window.location.href = "/api/integrations/google_calendar/start"; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/site-assets/logo-gcal.png" alt="" className="h-4 w-4" />
          Connect Google
        </Button>
      </Tap>
    );
  }

  async function sync() {
    setBusy(true);
    setDone(null);
    const res = await syncGoogleCalendar();
    setBusy(false);
    if (res.ok) {
      setDone(`Synced ${res.data?.imported ?? 0}`);
      router.refresh();
      setTimeout(() => setDone(null), 2500);
    }
  }

  return (
    <Tap className="inline-flex">
      <Button variant="secondary" size="sm" onClick={sync} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
        {done ?? "Sync Google"}
      </Button>
    </Tap>
  );
}
