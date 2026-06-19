"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { createTask } from "@/lib/tasks/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

/** "What matters most today?" → captures the one thing as a top (P1) task. */
export function TodayIntention() {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setPending(true);
    const res = await createTask({ title: value, status: "today", priority: "p1" });
    setPending(false);
    if (res.ok) {
      setValue("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} data-tour="intention" className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What matters most today?"
        className="bg-surface"
      />
      <Tap className="inline-flex">
        <Button type="submit" disabled={pending || !value.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Set
        </Button>
      </Tap>
    </form>
  );
}
