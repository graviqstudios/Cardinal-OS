"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addTopic,
  createSubject,
  deleteSubject,
  deleteTopic,
  generateTopics,
  setTopicStatus,
} from "@/lib/study/actions";
import {
  STATUS_META,
  TOPIC_STATUSES,
  type DocumentRow,
  type SubjectWithTopics,
  type Topic,
  type TopicStatus,
} from "@/lib/study/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function SubjectsPanel({
  subjects,
  documents,
  selectedSubjectId,
  onSelectSubject,
}: {
  subjects: SubjectWithTopics[];
  documents: DocumentRow[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
}) {
  const router = useRouter();
  const [newSubject, setNewSubject] = React.useState("");
  const [pending, start] = React.useTransition();

  async function onCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim()) return;
    const name = newSubject;
    setNewSubject("");
    start(async () => {
      const res = await createSubject(name);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* New subject */}
      <Card className="p-4">
        <form onSubmit={onCreateSubject} className="flex gap-2">
          <Input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Add a subject (e.g. Organic Chemistry)"
          />
          <Tap className="inline-flex">
            <Button type="submit" disabled={pending || !newSubject.trim()}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </Tap>
        </form>
      </Card>

      {subjects.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          No subjects yet. Add one above, then generate or add topics.
        </p>
      )}

      {subjects.map((s) => (
        <SubjectCard
          key={s.id}
          subject={s}
          selected={selectedSubjectId === s.id}
          onSelect={() =>
            onSelectSubject(selectedSubjectId === s.id ? null : s.id)
          }
        />
      ))}

      <DocumentUpload
        documents={documents}
        selectedSubjectId={selectedSubjectId}
      />
    </div>
  );
}

function SubjectCard({
  subject,
  selected,
  onSelect,
}: {
  subject: SubjectWithTopics;
  selected: boolean;
  onSelect: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [newTopic, setNewTopic] = React.useState("");
  const [pending, start] = React.useTransition();

  const refresh = () => router.refresh();

  return (
    <Card className={cn("overflow-hidden", selected && "ring-2 ring-primary")}>
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded p-1 hover:bg-accent"
          aria-label="Toggle topics"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")}
          />
        </button>
        <button onClick={onSelect} className="flex-1 text-left">
          <span className="font-medium">{subject.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {subject.topics.length} topics{selected ? " · focused" : ""}
          </span>
        </button>
        <Tap className="inline-flex">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await generateTopics(subject.id, subject.name);
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
            aria-label="Delete subject"
            onClick={() =>
              start(async () => {
                const res = await deleteSubject(subject.id);
                if (res.ok) refresh();
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </Tap>
      </div>

      {open && (
        <div className="space-y-2 border-t px-3 py-3">
          {subject.topics.map((t) => (
            <TopicRow key={t.id} topic={t} />
          ))}

          <form
            className="flex gap-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTopic.trim()) return;
              const name = newTopic;
              setNewTopic("");
              start(async () => {
                const res = await addTopic(subject.id, name);
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
              Add
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: `hsl(var(${STATUS_META[topic.status].varName}))` }}
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
              topic.status === st ? "border-foreground" : "border-transparent opacity-50",
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

function DocumentUpload({
  documents,
  selectedSubjectId,
}: {
  documents: DocumentRow[];
  selectedSubjectId: string | null;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (selectedSubjectId) fd.append("subjectId", selectedSubjectId);
      const res = await fetch("/api/embed", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Notes</p>
          <p className="text-xs text-muted-foreground">
            Upload a PDF or text file to chat with it
            {selectedSubjectId ? " (tagged to the focused subject)" : ""}.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          className="hidden"
          onChange={onFile}
        />
        <Tap className="inline-flex">
          <Button
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </Button>
        </Tap>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="space-y-1">
        {documents.length === 0 && (
          <p className="text-xs text-muted-foreground">No notes uploaded yet.</p>
        )}
        {documents.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1 truncate">{d.file_name}</span>
            <span
              className={cn(
                "text-xs",
                d.status === "ready"
                  ? "text-muted-foreground"
                  : d.status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            >
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
