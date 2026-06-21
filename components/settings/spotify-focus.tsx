"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Music } from "lucide-react";

import { cn } from "@/lib/utils";
import { listSpotifyPlaylists, setFocusPlaylist } from "@/lib/integrations/actions";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

/** Pick a focus playlist from the user's Spotify playlists. */
export function SpotifyFocus({ current }: { current: { id: string; name: string } | null }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [playlists, setPlaylists] = React.useState<{ id: string; name: string }[] | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState(current);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await listSpotifyPlaylists();
    setLoading(false);
    if (res.ok) setPlaylists(res.data?.playlists ?? []);
    else setError(res.error);
  }

  async function choose(id: string, name: string) {
    setSavingId(id);
    const res = await setFocusPlaylist(id, name);
    setSavingId(null);
    if (res.ok) {
      setSelected({ id, name });
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Focus playlist
        </p>
        <Tap className="inline-flex">
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
            {playlists ? "Refresh" : "Choose"}
          </Button>
        </Tap>
      </div>

      {selected && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5" /> {selected.name}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {playlists != null && (
        playlists.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No playlists found.</p>
        ) : (
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {playlists.map((p) => {
              const on = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => choose(p.id, p.name)}
                  disabled={savingId !== null}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-button px-2 py-1.5 text-left text-sm",
                    on ? "bg-primary/10 text-foreground" : "hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {savingId === p.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : on ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                  </span>
                  <span className="flex-1 truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
