"use client";

import * as React from "react";
import { Lock } from "lucide-react";

import { isNative } from "@/lib/native";
import { isBiometricLockEnabled, verifyIdentity } from "@/lib/native/biometric";
import { Button } from "@/components/ui/button";

/**
 * App-lock overlay for the native shell. When the user has enabled the lock, a
 * full-screen brand cover is shown on cold start and again on every real resume,
 * cleared only after a successful biometric / device-passcode check. Inert on
 * the web (renders nothing).
 *
 * The biometric prompt itself briefly backgrounds the app, which would fire the
 * resume handler and re-lock immediately after a successful unlock. Two guards
 * prevent that loop: `unlocking` (a check is in flight) and a short grace window
 * after a successful unlock (ignore the resume the prompt itself caused).
 */
export function BiometricGate() {
  const [locked, setLocked] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const unlockingRef = React.useRef(false);
  const lastUnlockRef = React.useRef(0);

  const attemptUnlock = React.useCallback(async () => {
    if (unlockingRef.current) return;
    unlockingRef.current = true;
    setChecking(true);
    const ok = await verifyIdentity();
    setChecking(false);
    unlockingRef.current = false;
    if (ok) {
      lastUnlockRef.current = Date.now();
      setLocked(false);
    }
  }, []);

  // Cold start: lock if enabled, then prompt (after a beat so the activity is
  // fully resumed and the prompt can attach).
  React.useEffect(() => {
    if (!isNative() || !isBiometricLockEnabled()) return;
    setLocked(true);
    const t = setTimeout(() => void attemptUnlock(), 350);
    return () => clearTimeout(t);
  }, [attemptUnlock]);

  // Re-lock on a *real* resume — ignore the transient resume the biometric
  // prompt causes (check in flight, or just-unlocked moments ago).
  React.useEffect(() => {
    if (!isNative() || !isBiometricLockEnabled()) return;
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("resume", () => {
          if (unlockingRef.current) return;
          if (Date.now() - lastUnlockRef.current < 1500) return;
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
