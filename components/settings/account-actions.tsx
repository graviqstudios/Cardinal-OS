"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Trash2 } from "lucide-react";

import { deleteAccount } from "@/lib/account/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tap } from "@/components/motion/tap";

export function AccountActions() {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    const res = await deleteAccount();
    if (res.ok) {
      // Session is now invalid — clear cookies and leave.
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } else {
      setPending(false);
      setError(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Export your data</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Download everything Cardinal holds for you as a JSON file.
        </p>
        <a href="/api/account/export" className="mt-2 inline-block">
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4" /> Export
          </Button>
        </a>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium">Delete your account</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Permanently erase your account and all of your data. This can&apos;t be undone.
        </p>

        {!confirming ? (
          <Tap className="mt-2 inline-flex">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" /> Delete account
            </Button>
          </Tap>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm.
            </p>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" className="max-w-xs" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <Tap className="inline-flex">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={remove}
                  disabled={confirmText !== "DELETE" || pending}
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Permanently delete
                </Button>
              </Tap>
              <Button size="sm" variant="ghost" onClick={() => { setConfirming(false); setConfirmText(""); setError(null); }} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
