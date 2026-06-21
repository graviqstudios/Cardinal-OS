"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Loader2 } from "lucide-react";

import { importNotionPage, listNotionPages } from "@/lib/integrations/actions";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

/** Browse recent Notion pages and import one into the journal (second brain). */
export function NotionImport() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [pages, setPages] = React.useState<{ id: string; title: string }[] | null>(null);
  const [importingId, setImportingId] = React.useState<string | null>(null);
  const [doneId, setDoneId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await listNotionPages();
    setLoading(false);
    if (res.ok) setPages(res.data?.pages ?? []);
    else setError(res.error);
  }

  async function importPage(id: string, title: string) {
    setImportingId(id);
    setError(null);
    const res = await importNotionPage(id, title);
    setImportingId(null);
    if (res.ok) {
      setDoneId(id);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Import a page to your journal
        </p>
        <Tap className="inline-flex">
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Browse
          </Button>
        </Tap>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {pages != null && (
        pages.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No pages found. Share a page with the integration in Notion, then retry.
          </p>
        ) : (
          <div className="mt-2 space-y-1">
            {pages.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1">
                <span className="flex-1 truncate text-sm">{p.title}</span>
                {doneId === p.id ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5" /> Imported
                  </span>
                ) : (
                  <Tap className="inline-flex">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => importPage(p.id, p.title)}
                      disabled={importingId !== null}
                    >
                      {importingId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Import
                    </Button>
                  </Tap>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
