"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tap } from "@/components/motion/tap";

/**
 * Change password for a signed-in user. We re-verify the current password (via
 * a silent re-sign-in) before updating, so a borrowed-but-unlocked session
 * can't change the password without knowing the old one.
 */
export function ChangePassword({ email }: { email: string }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setPending(true);
    try {
      // Verify the current password first.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInError) {
        setError("Your current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });
      if (updateError) throw updateError;
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set a new password for your account. Signed up with Google and never set
        a password? Use{" "}
        <a href="/forgot-password" className="text-primary hover:underline">
          Forgot password
        </a>{" "}
        to create one first.
      </p>
      <div className="space-y-2">
        <Label htmlFor="current">Current password</Label>
        <Input
          id="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="max-w-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">New password</Label>
        <Input
          id="next"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={6}
          className="max-w-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-new">Verify new password</Label>
        <Input
          id="confirm-new"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={confirm.length > 0 && confirm !== next}
          minLength={6}
          className="max-w-sm"
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && <p className="text-sm text-emerald-600">Password updated.</p>}

      <Tap className="inline-flex">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </Tap>
    </form>
  );
}
