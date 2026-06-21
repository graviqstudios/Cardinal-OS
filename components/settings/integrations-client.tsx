"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { disconnectProvider } from "@/lib/integrations/actions";
import type { Connection } from "@/lib/integrations/queries";
import type { ProviderId } from "@/lib/integrations/registry";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";
import { CalendarSync } from "@/components/settings/calendar-sync";
import { NotionImport } from "@/components/settings/notion-import";
import { SpotifyFocus } from "@/components/settings/spotify-focus";

type ProviderRow = {
  id: ProviderId;
  name: string;
  blurb: string;
  logo: string;
  configured: boolean;
  connected: Connection | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function IntegrationsClient({
  providers,
  encKeyMissing,
  spotifyFocus,
}: {
  providers: ProviderRow[];
  encKeyMissing: boolean;
  spotifyFocus: { id: string; name: string } | null;
}) {
  return (
    <div className="space-y-4">
      {encKeyMissing && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Integrations are dormant until a server encryption key is set. Add{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">INTEGRATION_ENC_KEY</code>{" "}
            (run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">openssl rand -base64 32</code>)
            and each provider&apos;s OAuth credentials to your environment.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((p) => (
          <ProviderCard key={p.id} provider={p} spotifyFocus={spotifyFocus} />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider: p,
  spotifyFocus,
}: {
  provider: ProviderRow;
  spotifyFocus: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function disconnect() {
    setBusy(true);
    const res = await disconnectProvider(p.id);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  function connect() {
    window.location.href = `/api/integrations/${p.id}/start`;
  }

  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt="" className="h-5 w-5 object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{p.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{p.blurb}</p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {p.connected ? (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--module-calendar))" }} />
              <span className="truncate">
                {p.connected.accountLabel ?? "Connected"} · {fmtDate(p.connected.connectedAt)}
              </span>
            </span>
          ) : p.configured ? (
            <span className="text-xs text-muted-foreground">Not connected</span>
          ) : (
            <span className="rounded-pill bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Not configured
            </span>
          )}

          {p.connected ? (
            <Tap className="inline-flex">
              <Button size="sm" variant="ghost" onClick={disconnect} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Disconnect
              </Button>
            </Tap>
          ) : (
            <Tap className="inline-flex">
              <Button size="sm" onClick={connect} disabled={!p.configured}>
                Connect
              </Button>
            </Tap>
          )}
        </div>

        {p.id === "google_calendar" && p.connected && <CalendarSync />}
        {p.id === "notion" && p.connected && <NotionImport />}
        {p.id === "spotify" && p.connected && <SpotifyFocus current={spotifyFocus} />}
      </CardContent>
    </Card>
  );
}
