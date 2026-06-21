"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { acceptTerms } from "@/lib/legal/actions";
import { Needle } from "@/components/shell/brand";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

/**
 * Blocking, one-time consent gate. Rendered by the app layout until the user has
 * accepted the Terms & Privacy Policy. Cannot be dismissed without agreeing.
 */
export function ConsentGate() {
  const router = useRouter();
  const [agreed, setAgreed] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Lock background scroll while the gate is up.
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function accept() {
    if (!agreed) return;
    setPending(true);
    setError(null);
    const res = await acceptTerms();
    if (res.ok) {
      setDone(true); // close immediately; don't wait on the refresh round-trip
      router.refresh();
    } else {
      setPending(false);
      setError("Couldn't save your agreement. Please try again.");
    }
  }

  if (done) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-card border bg-card p-6 shadow-xl sm:p-8">
        <Needle size={30} />
        <h2 className="mt-4 font-serif text-2xl tracking-tight">Welcome to Cardinal OS</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Before you begin, please review and accept how we handle your data. In
          short: your data is yours, it is never sold, and it is never used to
          train AI models. Cardinal is a cloud service (not end-to-end encrypted),
          so we can access your data only to run and support the service.
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={agreed}
            onClick={() => setAgreed((a) => !a)}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
              agreed ? "border-primary bg-primary text-primary-foreground" : "border-input"
            }`}
          >
            {agreed && <Check className="h-3.5 w-3.5" />}
          </button>
          <span className="text-sm text-foreground/90">
            I have read and agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">Terms &amp; Conditions</a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Privacy Policy</a>,
            and I am at least 16 years old.
          </span>
        </label>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <Tap className="mt-6 block">
          <Button className="w-full" onClick={accept} disabled={!agreed || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Agree and continue
          </Button>
        </Tap>
      </div>
    </div>
  );
}
