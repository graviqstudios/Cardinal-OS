"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { updateProfile } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tap } from "@/components/motion/tap";

export function ProfileForm({
  initial,
}: {
  initial: {
    name: string;
    exam_target: string;
    exam_date: string;
  };
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initial.name);
  const [examTarget, setExamTarget] = React.useState(initial.exam_target);
  const [examDate, setExamDate] = React.useState(initial.exam_date);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const res = await updateProfile({
      name: name.trim() || null,
      exam_target: examTarget.trim() || null,
      exam_date: examDate || null,
    });
    setPending(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exam_target">Exam / goal</Label>
        <Input
          id="exam_target"
          value={examTarget}
          onChange={(e) => setExamTarget(e.target.value)}
          placeholder="e.g. NEET 2027"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exam_date">Target date</Label>
        <Input
          id="exam_date"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tap className="inline-block">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved && !pending && <Check className="h-4 w-4" />}
          {saved && !pending ? "Saved" : "Save changes"}
        </Button>
      </Tap>
    </form>
  );
}
