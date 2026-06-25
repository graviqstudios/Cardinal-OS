"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tap } from "@/components/motion/tap";

/**
 * Set-a-new-password screen. Reached from the recovery email link, which the
 * auth callback turns into a live session before forwarding here. If there's no
 * session (link expired or opened cold), we tell the user to request a new link.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [ready, setReady] = React.useState<boolean | null>(null);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => {
        router.push("/today");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  if (ready === false) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          This reset link has expired or already been used. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Send a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Password updated. Taking you in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose a new password.</p>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Verify password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={confirm.length > 0 && confirm !== password}
          minLength={6}
          required
        />
        {confirm.length > 0 && confirm !== password && (
          <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tap className="block">
        <Button type="submit" className="w-full" disabled={pending || ready === null}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </Tap>
    </form>
  );
}
