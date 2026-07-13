"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell,
  Grid3x3,
  ListChecks,
  Loader2,
  Mic,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addTopic,
  deleteTopic,
  generateTopics,
  setTopicStatus,
} from "@/lib/study/actions";
import { subjectProgress } from "@/lib/study/progress";
import {
  STATUS_META,
  TOPIC_STATUSES,
  type SubjectWithTopics,
  type Topic,
  type TopicStatus,
} from "@/lib/study/types";
import { HeatmapGrid } from "@/components/study/heatmap-grid";
import { PracticeClient } from "@/components/practice/practice-client";
import { VoiceExaminer } from "@/components/voice/voice-examiner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

type Tab = "topics" | "heatmap" | "practice" | "voice";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "topics", label: "Topics", icon: <ListChecks className="h-4 w-4" /> },
  { id: "heatmap", label: "Heat map", icon: <Grid3x3 className="h-4 w-4" /> },
  { id: "practice", label: "Practice", icon: <Dumbbell className="h-4 w-4" /> },
  { id: "voice", label: "Voice", icon: <Mic className="h-4 w-4" /> },
];

export function SubjectDetail({ subject }: { subject: SubjectWithTopics }) {
  const [tab, setTab] = React.useState<Tab>("topics");

  const topics = React.useMemo(
    () =>
      subject.topics.map((t) => ({
        id: t.id,
        name: t.name,
        subjectName: subject.name,
      })),
    [subject],
  );

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-1 rounded-card border bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-button px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "topics" && <TopicsEditor subject={subject} />}
      {tab === "heatmap" && (
        <HeatmapGrid subjects={[subject]} />
      )}
      {tab === "practice" && <PracticeClient topics={topics} />}
      {tab === "voice" && <VoiceExaminer topics={topics} />}
    </div>
  );
}

function TopicsEditor({ subject }: { subject: SubjectWithTopics }) {
  const router = useRouter();
  const [newTopic, setNewTopic] = React.useState("");
  const [pending, start] = React.useTransition();

  const progress = subjectProgress(subject.topics);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTopic.trim()) return;
    const name = newTopic;
    setNewTopic("");
    start(async () => {
      const res = await addTopic(subject.id, name);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {subject.topics.length} topic
            {subject.topics.length === 1 ? "" : "s"}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {progress}% mastered
          </span>
        </div>
        <Tap className="inline-flex">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await generateTopics(subject.id, subject.name);
                if (res.ok) router.refresh();
              })
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate topics
          </Button>
        </Tap>
      </div>

      <Card className="divide-y">
        {subject.topics.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No topics yet. Add one below or generate a starter list.
          </p>
        ) : (
          subject.topics.map((t) => <TopicRow key={t.id} topic={t} />)
        )}

        <form onSubmit={onAdd} className="flex gap-2 p-3">
          <Input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a topic"
            className="h-9"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          backgroundColor: `hsl(var(${STATUS_META[topic.status].varName}))`,
        }}
        title={STATUS_META[topic.status].label}
      />
      <span className="flex-1 truncate text-sm">{topic.name}</span>

      <div className="flex items-center gap-1">
        {TOPIC_STATUSES.map((st) => (
          <button
            key={st}
            aria-label={STATUS_META[st].label}
            title={STATUS_META[st].label}
            onClick={() =>
              start(async () => {
                await setTopicStatus(topic.id, st as TopicStatus);
                router.refresh();
              })
            }
            className={cn(
              "h-3.5 w-3.5 rounded-full border transition-transform hover:scale-110",
              topic.status === st
                ? "border-foreground"
                : "border-transparent opacity-50",
            )}
            style={{ backgroundColor: `hsl(var(${STATUS_META[st].varName}))` }}
          />
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Delete topic"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteTopic(topic.id);
              router.refresh();
            })
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
