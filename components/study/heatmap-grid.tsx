"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { setTopicStatus } from "@/lib/study/actions";
import {
  STATUS_META,
  TOPIC_STATUSES,
  type SubjectWithTopics,
  type Topic,
  type TopicStatus,
} from "@/lib/study/types";
import { listContainer, listItem } from "@/lib/motion/variants";
import { Card } from "@/components/ui/card";

/** Click a topic cell to cycle its mastery: untouched → weak → moderate → strong. */
export function HeatmapGrid({ subjects }: { subjects: SubjectWithTopics[] }) {
  const hasTopics = subjects.some((s) => s.topics.length > 0);

  return (
    <div className="space-y-6">
      <Legend />
      {!hasTopics && (
        <Card className="p-6 text-sm text-muted-foreground">
          No topics yet. Add subjects and topics in{" "}
          <Link href="/study" className="font-medium text-primary hover:underline">
            Study
          </Link>{" "}
          to fill your heat map.
        </Card>
      )}
      {subjects
        .filter((s) => s.topics.length > 0)
        .map((s) => (
          <SubjectBlock key={s.id} subject={s} />
        ))}
    </div>
  );
}

function SubjectBlock({ subject }: { subject: SubjectWithTopics }) {
  const reduce = useReducedMotion();
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{subject.name}</h2>
        <span className="text-xs text-muted-foreground">
          {subject.topics.length} topics
        </span>
      </div>
      <motion.div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        variants={reduce ? undefined : listContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
      >
        {subject.topics.map((t) => (
          <Cell key={t.id} topic={t} animate={!reduce} />
        ))}
      </motion.div>
    </section>
  );
}

function Cell({ topic, animate }: { topic: Topic; animate: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const meta = STATUS_META[topic.status];

  function cycle() {
    const idx = TOPIC_STATUSES.indexOf(topic.status);
    const next = TOPIC_STATUSES[(idx + 1) % TOPIC_STATUSES.length] as TopicStatus;
    start(async () => {
      await setTopicStatus(topic.id, next);
      router.refresh();
    });
  }

  return (
    <motion.button
      variants={animate ? listItem : undefined}
      onClick={cycle}
      disabled={pending}
      title={`${topic.name} - ${meta.label} (click to change)`}
      className={cn(
        "flex min-h-[56px] flex-col justify-between rounded-lg border p-2.5 text-left transition-colors disabled:opacity-60",
      )}
      style={{
        backgroundColor: `hsl(var(${meta.varName}) / 0.14)`,
        borderColor: `hsl(var(${meta.varName}) / 0.35)`,
      }}
    >
      <span className="line-clamp-2 text-xs font-medium leading-tight">
        {topic.name}
      </span>
      <span
        className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
        style={{ color: `hsl(var(${meta.varName}))` }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `hsl(var(${meta.varName}))` }}
        />
        {meta.label}
      </span>
    </motion.button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {TOPIC_STATUSES.map((st) => (
        <span key={st} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: `hsl(var(${STATUS_META[st].varName}))` }}
          />
          {STATUS_META[st].label}
        </span>
      ))}
    </div>
  );
}
