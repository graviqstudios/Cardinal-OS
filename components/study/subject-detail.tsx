"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Dumbbell,
  FolderPlus,
  Grid3x3,
  ListChecks,
  ListTodo,
  Loader2,
  Mic,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addTopic,
  deleteTopic,
  generateTopics,
  setTopicStatus,
} from "@/lib/study/actions";
import {
  createChapter,
  deleteChapter,
  renameChapter,
  setTopicChapter,
} from "@/lib/study/chapters";
import {
  createStudyTask,
  deleteStudyTask,
  setStudyTaskStatus,
} from "@/lib/study/tasks";
import { subjectProgress } from "@/lib/study/progress";
import {
  STATUS_META,
  TASK_STATUS_META,
  TASK_STATUSES,
  TOPIC_STATUSES,
  type Chapter,
  type StudyTask,
  type SubjectPageData,
  type TaskStatus,
  type Topic,
  type TopicStatus,
} from "@/lib/study/types";
import { HeatmapGrid } from "@/components/study/heatmap-grid";
import { AssistantPanel } from "@/components/study/assistant-panel";
import { PracticeClient } from "@/components/practice/practice-client";
import { VoiceExaminer } from "@/components/voice/voice-examiner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

type Tab = "plan" | "tasks" | "assistant" | "heatmap" | "practice" | "voice";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "plan", label: "Plan", icon: <ListChecks className="h-4 w-4" /> },
  { id: "tasks", label: "Tasks", icon: <ListTodo className="h-4 w-4" /> },
  { id: "assistant", label: "Assistant", icon: <Wand2 className="h-4 w-4" /> },
  { id: "heatmap", label: "Heat map", icon: <Grid3x3 className="h-4 w-4" /> },
  { id: "practice", label: "Practice", icon: <Dumbbell className="h-4 w-4" /> },
  { id: "voice", label: "Voice", icon: <Mic className="h-4 w-4" /> },
];

export function SubjectDetail({ data }: { data: SubjectPageData }) {
  const [tab, setTab] = React.useState<Tab>("plan");

  const topics = React.useMemo(
    () =>
      data.topics.map((t) => ({
        id: t.id,
        name: t.name,
        subjectName: data.name,
      })),
    [data],
  );

  const subjectForHeatmap = React.useMemo(
    () => [
      {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        created_at: data.created_at,
        topics: data.topics,
      },
    ],
    [data],
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

      {tab === "plan" && <PlanEditor data={data} />}
      {tab === "tasks" && <TasksBoard data={data} />}
      {tab === "assistant" && (
        <AssistantPanel subjectId={data.id} subjectName={data.name} />
      )}
      {tab === "heatmap" && <HeatmapGrid subjects={subjectForHeatmap} />}
      {tab === "practice" && <PracticeClient topics={topics} />}
      {tab === "voice" && <VoiceExaminer topics={topics} />}
    </div>
  );
}

/* ── Plan: chapters → topics ──────────────────────────────────────────────── */

function PlanEditor({ data }: { data: SubjectPageData }) {
  const router = useRouter();
  const [newChapter, setNewChapter] = React.useState("");
  const [pending, start] = React.useTransition();

  const unfiled = data.topics.filter((t) => t.chapter_id == null);
  const total = subjectProgress(data.topics);

  function onAddChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!newChapter.trim()) return;
    const name = newChapter;
    setNewChapter("");
    start(async () => {
      const res = await createChapter(data.id, name);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {data.chapters.length} chapter
          {data.chapters.length === 1 ? "" : "s"} · {data.topics.length} topic
          {data.topics.length === 1 ? "" : "s"}
        </span>
        <span className="font-semibold tabular-nums">{total}% mastered</span>
      </div>
      <ProgressBar percent={total} />

      {data.chapters.map((c) => (
        <ChapterBlock
          key={c.id}
          chapter={c}
          topics={data.topics.filter((t) => t.chapter_id === c.id)}
          chapters={data.chapters}
        />
      ))}

      {unfiled.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 px-3 py-2.5 text-sm font-medium text-muted-foreground">
            Unfiled topics
          </div>
          <div className="divide-y">
            {unfiled.map((t) => (
              <TopicRow key={t.id} topic={t} chapters={data.chapters} />
            ))}
          </div>
        </Card>
      )}

      <form onSubmit={onAddChapter} className="flex gap-2">
        <Input
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          placeholder="Add a chapter (e.g. Thermodynamics)"
        />
        <Tap className="inline-flex">
          <Button type="submit" disabled={pending || !newChapter.trim()}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4" />
            )}
            Add chapter
          </Button>
        </Tap>
      </form>
    </div>
  );
}

function ChapterBlock({
  chapter,
  topics,
  chapters,
}: {
  chapter: Chapter;
  topics: Topic[];
  chapters: Chapter[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [renaming, setRenaming] = React.useState(false);
  const [name, setName] = React.useState(chapter.name);
  const [newTopic, setNewTopic] = React.useState("");
  const [pending, start] = React.useTransition();

  const progress = subjectProgress(topics);
  const refresh = () => router.refresh();

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded p-1 hover:bg-accent"
          aria-label="Toggle chapter"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")}
          />
        </button>

        {renaming ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              start(async () => {
                const res = await renameChapter(chapter.id, name);
                if (res.ok) {
                  setRenaming(false);
                  refresh();
                }
              });
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
          </form>
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="flex-1 text-left"
            title="Rename chapter"
          >
            <span className="font-medium">{chapter.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {topics.length} topic{topics.length === 1 ? "" : "s"} · {progress}%
            </span>
          </button>
        )}

        <Tap className="inline-flex">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await generateTopics(
                  chapter.subject_id,
                  chapter.name,
                  chapter.id,
                );
                if (res.ok) refresh();
              })
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate
          </Button>
        </Tap>
        <Tap className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete chapter"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteChapter(chapter.id);
                if (res.ok) refresh();
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </Tap>
      </div>

      {open && (
        <div className="border-t">
          {topics.length > 0 && (
            <div className="divide-y">
              {topics.map((t) => (
                <TopicRow key={t.id} topic={t} chapters={chapters} />
              ))}
            </div>
          )}
          <form
            className="flex gap-2 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTopic.trim()) return;
              const value = newTopic;
              setNewTopic("");
              start(async () => {
                const res = await addTopic(
                  chapter.subject_id,
                  value,
                  chapter.id,
                );
                if (res.ok) refresh();
              });
            }}
          >
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Add a topic"
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={pending}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

function TopicRow({ topic, chapters }: { topic: Topic; chapters: Chapter[] }) {
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

      <select
        aria-label="Move topic to chapter"
        value={topic.chapter_id ?? ""}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setTopicChapter(topic.id, e.target.value || null);
            router.refresh();
          })
        }
        className="h-7 max-w-[7rem] rounded-button border border-input bg-background px-1.5 text-xs text-muted-foreground"
      >
        <option value="">Unfiled</option>
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

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

/* ── Tasks ────────────────────────────────────────────────────────────────── */

function TasksBoard({ data }: { data: SubjectPageData }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("");
  const [pending, start] = React.useTransition();

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const value = title;
    const dueDate = due || null;
    setTitle("");
    setDue("");
    start(async () => {
      const res = await createStudyTask({
        subjectId: data.id,
        title: value,
        dueDate,
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="flex flex-wrap gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task (e.g. Solve 20 problems)"
          className="min-w-[12rem] flex-1"
        />
        <Input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="w-auto"
        />
        <Tap className="inline-flex">
          <Button type="submit" disabled={pending || !title.trim()}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </Tap>
      </form>

      {data.tasks.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No tasks yet. Add one above to plan your work for this subject.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {TASK_STATUSES.map((st) => {
            const column = data.tasks.filter((t) => t.status === st);
            return (
              <div key={st} className="space-y-2">
                <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {TASK_STATUS_META[st].label}
                  <span className="tabular-nums">{column.length}</span>
                </h3>
                <div className="space-y-2">
                  {column.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: StudyTask }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Card className="space-y-2 p-3">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm">{task.title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Delete task"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteStudyTask(task.id);
              router.refresh();
            })
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {task.due_date && (
        <p className="text-xs text-muted-foreground">Due {task.due_date}</p>
      )}
      <div className="flex gap-1">
        {TASK_STATUSES.map((st) => (
          <button
            key={st}
            disabled={pending || st === task.status}
            onClick={() =>
              start(async () => {
                await setStudyTaskStatus(task.id, st as TaskStatus);
                router.refresh();
              })
            }
            className={cn(
              "rounded-button border px-2 py-0.5 text-[10px] font-medium transition-colors",
              st === task.status
                ? "border-foreground bg-foreground/10"
                : "border-input text-muted-foreground hover:text-foreground",
            )}
          >
            {TASK_STATUS_META[st].label}
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ── shared ───────────────────────────────────────────────────────────────── */

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-pill bg-muted">
      <div
        className="h-full rounded-pill transition-[width] duration-500"
        style={{
          width: `${percent}%`,
          backgroundColor: `hsl(var(${STATUS_META.strong.varName}))`,
        }}
      />
    </div>
  );
}
