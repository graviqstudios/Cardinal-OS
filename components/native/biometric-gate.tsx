"use client";

import * as React from "react";
import { Lock } from "lucide-react";

import { isNative } from "@/lib/native";
import { isBiometricLockEnabled, verifyIdentity } from "@/lib/native/biometric";
import { Button } from "@/components/ui/button";

/**
 * App-lock overlay for the native shell. When the user has enabled the lock, a
 * full-screen brand cover is shown on cold start and again on every resume,
 * cleared only after a successful biometric / device-passcode check. Inert on
 * the web (renders nothing).
 */
export function BiometricGate() {
  const [locked, setLocked] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const attemptUnlock = React.useCallback(async () => {
    setChecking(true);
    const ok = await verifyIdentity();
    setChecking(false);
    if (ok) setLocked(false);
  }, []);

  // Cold start: lock if enabled, then prompt.
  React.useEffect(() => {
    if (!isNative() || !isBiometricLockEnabled()) return;
    setLocked(true);
    void attemptUnlock();
  }, [attemptUnlock]);

  // Re-lock whenever the app returns to the foreground.
  React.useEffect(() => {
    if (!isNative() || !isBiometricLockEnabled()) return;
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("resume", () => {
          setLocked(true);
          void attemptUnlock();
        });
        remove = () => handle.remove();
      } catch {
        /* ignore */
      }
    })();
    return () => remove?.();
  }, [attemptUnlock]);

  if (!locked) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-surface px-6 text-center"
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h1 className="font-serif text-2xl">Cardinal OS is locked</h1>
        <p className="text-sm text-muted-foreground">
          Unlock with your fingerprint, face, or device passcode.
        </p>
      </div>
      <Button onClick={attemptUnlock} disabled={checking}>
        {checking ? "Waiting…" : "Unlock"}
      </Button>
    </div>
  );
}
