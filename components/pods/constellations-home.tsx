"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Globe, Loader2, Lock, Plus, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { createServer, joinPod } from "@/lib/pods/actions";
import type { PodSummary, Visibility } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function ConstellationsHome({ servers }: { servers: PodSummary[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<Visibility>("private");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState<"create" | "join" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy("create");
    setError(null);
    const res = await createServer({ name, description, visibility });
    setBusy(null);
    if (res.ok && res.data) router.push(`/constellations/${res.data.id}`);
    else if (!res.ok) setError(res.error);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy("join");
    setError(null);
    const res = await joinPod(code);
    setBusy(null);
    if (res.ok && res.data) router.push(`/constellations/${res.data.id}`);
    else if (!res.ok) setError(res.error);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight">Constellations</h1>
        <p className="text-sm text-muted-foreground">
          Study servers - chat, hop in a voice room, and keep each other on track.
        </p>
      </div>

      {servers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {servers.map((s) => (
            <Link key={s.id} href={`/constellations/${s.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {s.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.icon_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {s.memberCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Create a server</h2>
          <form onSubmit={create} className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Server name (e.g. NEET Grind)" />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="Description (optional)"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={cn(
                  "flex items-center gap-2 rounded-card border p-2.5 text-sm",
                  visibility === "private" ? "border-primary bg-primary/5" : "hover:bg-accent",
                )}
              >
                <Lock className="h-4 w-4" /> Private
              </button>
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex items-center gap-2 rounded-card border p-2.5 text-sm",
                  visibility === "public" ? "border-primary bg-primary/5" : "hover:bg-accent",
                )}
              >
                <Globe className="h-4 w-4" /> Public
              </button>
            </div>
            <Tap className="inline-flex">
              <Button type="submit" disabled={busy !== null || !name.trim()}>
                {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create server
              </Button>
            </Tap>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={join} className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Join with an invite code" />
            <Button type="submit" variant="secondary" disabled={busy !== null}>
              {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </Button>
          </form>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Link
            href="/constellations/discover"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Compass className="h-4 w-4" /> Discover public servers
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
