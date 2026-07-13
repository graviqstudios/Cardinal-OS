"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Plus } from "lucide-react";

import { createSubject } from "@/lib/study/actions";
import { subjectProgress } from "@/lib/study/progress";
import { STATUS_META, type SubjectWithTopics } from "@/lib/study/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function SubjectGrid({ subjects }: { subjects: SubjectWithTopics[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [pending, start] = React.useTransition();

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const value = name;
    setName("");
    start(async () => {
      const res = await createSubject(value);
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl tracking-tight">Subjects</h2>
        <span className="text-xs text-muted-foreground">
          {subjects.length} subject{subjects.length === 1 ? "" : "s"}
        </span>
      </div>

      <form onSubmit={onCreate} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a subject (e.g. Organic Chemistry)"
        />
        <Tap className="inline-flex">
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </Tap>
      </form>

      {subjects.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No subjects yet. Add one above, then open it to plan chapters, track
          progress, and practice.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function SubjectCard({ subject }: { subject: SubjectWithTopics }) {
  const progress = subjectProgress(subject.topics);

  return (
    <Link href={`/study/${subject.id}`} className="group block">
      <Card className="flex h-full flex-col gap-4 p-4 transition-colors group-hover:border-[hsl(var(--module-study)/0.5)]">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-tight">{subject.name}</h3>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {subject.topics.length} topic
              {subject.topics.length === 1 ? "" : "s"}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {progress}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-muted">
            <div
              className="h-full rounded-pill transition-[width] duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: `hsl(var(${STATUS_META.strong.varName}))`,
              }}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
