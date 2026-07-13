"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/native";
import { signInWithGoogleNative } from "@/lib/native/google-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tap } from "@/components/motion/tap";

type Mode = "login" | "signup";

/** Allowed username shape: 3–20 chars, letters/numbers/underscore. */
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = React.useMemo(() => createClient(), []);

  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [googlePending, setGooglePending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    searchParams.get("error") ? "Sign-in failed. Please try again." : null,
  );
  const [notice, setNotice] = React.useState<string | null>(null);

  // Live username availability (signup only): null = unknown/checking handled
  // separately; true/false once a verdict lands.
  const [checking, setChecking] = React.useState(false);
  const [available, setAvailable] = React.useState<boolean | null>(null);

  const isSignup = mode === "signup";
  const usernameValid = USERNAME_RE.test(username);

  // Debounced availability check against the SECURITY DEFINER RPC.
  React.useEffect(() => {
    if (!isSignup) return;
    if (!usernameValid) {
      setAvailable(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    const handle = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_username_available", {
        candidate: username,
      });
      // On RPC error, don't block the user - the unique index is the backstop.
      setAvailable(error ? null : Boolean(data));
      setChecking(false);
    }, 400);
    return () => clearTimeout(handle);
  }, [username, usernameValid, isSignup, supabase]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (isSignup) {
      if (!usernameValid) {
        setError("Pick a name 3–20 characters: letters, numbers, or underscores.");
        return;
      }
      if (available === false) {
        setError("That name is taken. Try another.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords don't match.");
        return;
      }
    }

    setPending(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { username },
          },
        });
        if (error) throw error;
        // If email confirmation is on, there's no session yet.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push("/today");
          router.refresh();
        } else {
          setNotice("Check your inbox to confirm your email, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(searchParams.get("redirectedFrom") ?? "/today");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      // Inside the native app, Google blocks the embedded-WebView redirect, so
      // always use the native credential picker (which shows a friendly message
      // if the app's Google client id isn't configured yet) and exchange the ID
      // token for a session - never the broken web redirect.
      if (isNative()) {
        await signInWithGoogleNative();
        router.push(searchParams.get("redirectedFrom") ?? "/today");
        router.refresh();
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // Redirect to Google happens automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setGooglePending(false);
    }
  }

  return (
    <div className="space-y-5">
      <Tap className="block">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={googlePending || pending}
        >
          {googlePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </Button>
      </Tap>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
        {isSignup && (
          <div className="space-y-2">
            <Label htmlFor="username">What should I call you?</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="e.g. cardinal_fan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={username.length > 0 && !usernameValid}
                required
              />
              {username.length > 0 && usernameValid && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : available === true ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : available === false ? (
                    <X className="h-4 w-4 text-destructive" />
                  ) : null}
                </span>
              )}
            </div>
            {username.length > 0 && !usernameValid && (
              <p className="text-xs text-muted-foreground">
                3–20 characters: letters, numbers, or underscores.
              </p>
            )}
            {available === false && (
              <p className="text-xs text-destructive">That name is taken.</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {!isSignup && (
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {isSignup && (
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
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

        <Tap className="block">
          <Button type="submit" className="w-full" disabled={pending || googlePending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </Tap>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Cardinal OS?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.4 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}
