"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { createPod, joinPod } from "@/lib/pods/actions";
import type { PodSummary } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function PodsClient({
  pods,
  selectedId,
}: {
  pods: PodSummary[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [exam, setExam] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState<"create" | "join" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy("create");
    setError(null);
    const res = await createPod(name, exam);
    setBusy(null);
    if (res.ok) {
      setName(""); setExam("");
      router.push(`/pods?pod=${res.data!.id}`);
    } else setError(res.error);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy("join");
    setError(null);
    const res = await joinPod(code);
    setBusy(null);
    if (res.ok) {
      setCode("");
      router.push(`/pods?pod=${res.data!.id}`);
    } else setError(res.error);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <form onSubmit={create} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pod name" />
            <Input value={exam} onChange={(e) => setExam(e.target.value)} placeholder="Exam target (optional)" />
            <Button type="submit" disabled={busy !== null}>
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create pod
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or join</span>
            </div>
          </div>
          <form onSubmit={join} className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter invite code" />
            <Button type="submit" variant="secondary" disabled={busy !== null}>
              {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Join
            </Button>
          </form>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {pods.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            No pods yet. Create one or join with an invite code.
          </p>
        ) : (
          pods.map((p) => (
            <Link key={p.id} href={`/pods?pod=${p.id}`} className="block">
              <Card className={cn(selectedId === p.id && "ring-2 ring-primary")}>
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.exam_target ? `${p.exam_target} · ` : ""}
                      {p.memberCount} member{p.memberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
