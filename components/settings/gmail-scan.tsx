"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { importTasks } from "@/lib/integrations/actions";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

/** Inbox scan → draft tasks, accept/reject, then create the chosen ones. */
export function GmailScan() {
  const router = useRouter();
  const [scanning, setScanning] = React.useState(false);
  const [drafts, setDrafts] = React.useState<string[] | null>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [importing, setImporting] = React.useState(false);
  const [added, setAdded] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function scan() {
    setScanning(true);
    setError(null);
    setAdded(null);
    try {
      const res = await fetch("/api/integrations/gmail/scan", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not scan your inbox.");
      } else {
        const list: string[] = json.tasks ?? [];
        setDrafts(list);
        setSelected(new Set(list.map((_, i) => i)));
      }
    } catch {
      setError("Could not scan your inbox.");
    } finally {
      setScanning(false);
    }
  }

  function toggle(i: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function add() {
    if (!drafts) return;
    const titles = [...selected].map((i) => drafts[i]).filter(Boolean);
    if (titles.length === 0) return;
    setImporting(true);
    const res = await importTasks(titles);
    setImporting(false);
    if (res.ok) {
      setAdded(titles.length);
      setDrafts(null);
      setSelected(new Set());
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Scan inbox for tasks
        </p>
        <Tap className="inline-flex">
          <Button size="sm" variant="secondary" onClick={scan} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Scan
          </Button>
        </Tap>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {added != null && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5" /> Added {added} task{added === 1 ? "" : "s"}.
        </p>
      )}

      {drafts != null && (
        drafts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No action items found right now.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {drafts.map((d, i) => {
              const on = selected.has(i);
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className="flex w-full items-start gap-2.5 rounded-button px-1 py-1 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 text-sm">{d}</span>
                </button>
              );
            })}
            <div className="flex justify-end pt-1">
              <Tap className="inline-flex">
                <Button size="sm" onClick={add} disabled={importing || selected.size === 0}>
                  {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add {selected.size} task{selected.size === 1 ? "" : "s"}
                </Button>
              </Tap>
            </div>
          </div>
        )
      )}
    </div>
  );
}
