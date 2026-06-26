"use client";

import * as React from "react";
import { Check, Fingerprint, Loader2 } from "lucide-react";

import { isNative } from "@/lib/native";
import {
  isBiometricAvailable,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  verifyIdentity,
} from "@/lib/native/biometric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

/**
 * App-lock toggle, shown only inside the native app (the web build renders
 * nothing — no empty card). Enabling requires one successful biometric/passcode
 * check so the user can't lock themselves out with an unenrolled device.
 */
export function BiometricLockToggle() {
  const [ready, setReady] = React.useState(false);
  const [available, setAvailable] = React.useState(false);
  const [enabled, setEnabled] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isNative()) return;
    (async () => {
      setAvailable(await isBiometricAvailable());
      setEnabled(isBiometricLockEnabled());
      setReady(true);
    })();
  }, []);

  async function toggle() {
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      if (!enabled) {
        const ok = await verifyIdentity("Confirm to turn on app lock");
        if (!ok) {
          setError("Couldn't confirm — app lock not enabled.");
          return;
        }
        setBiometricLockEnabled(true);
        setEnabled(true);
      } else {
        setBiometricLockEnabled(false);
        setEnabled(false);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setPending(false);
    }
  }

  // Web build / non-native: render nothing.
  if (!ready) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Fingerprint className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {enabled ? "App lock is on" : "Lock the app"}
              </p>
              <p className="text-sm text-muted-foreground">
                {available
                  ? "Require your fingerprint, face, or device passcode each time you open Cardinal OS."
                  : "Set up a fingerprint, face unlock, or screen lock on your device to use app lock."}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Tap className="inline-block">
            <Button
              type="button"
              variant={enabled ? "outline" : "default"}
              onClick={toggle}
              disabled={pending || !available}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved && !pending && <Check className="h-4 w-4" />}
              {enabled ? "Turn off app lock" : "Turn on app lock"}
            </Button>
          </Tap>
        </div>
      </CardContent>
    </Card>
  );
}
