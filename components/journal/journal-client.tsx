"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { createEntry, deleteEntry, updateEntry } from "@/lib/journal/actions";
import {
  JOURNAL_TYPES,
  journalTypeLabel,
  type JournalEntry,
  type JournalType,
} from "@/lib/journal/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tap } from "@/components/motion/tap";

const MOODS = ["Rough", "Low", "Okay", "Good", "Great"];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function MoodDots({
  mood,
  onPick,
}: {
  mood: number | null;
  onPick?: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {MOODS.map((label, i) => {
        const value = i + 1;
        const selected = mood === value;
        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={selected}
            disabled={!onPick}
            onClick={() => onPick?.(selected ? null : value)}
            className={cn(
              "h-3.5 w-3.5 rounded-pill border transition-transform",
              onPick && "hover:scale-110",
              selected ? "border-foreground" : "border-input",
            )}
            style={{
              backgroundColor: selected
                ? "hsl(var(--primary))"
                : "hsl(var(--muted-foreground) / 0.25)",
            }}
          />
        );
      })}
    </div>
  );
}

export function JournalClient({ entries }: { entries: JournalEntry[] }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Composer onSaved={() => router.refresh()} />

      {entries.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          Nothing written yet. Start with a note above - even a line is enough.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ onSaved }: { onSaved: () => void }) {
  const [type, setType] = React.useState<JournalType>("note");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [mood, setMood] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await createEntry({
      type,
      title: title || null,
      content,
      mood,
      date: todayKey(),
    });
    setSaving(false);
    if (res.ok) {
      setTitle("");
      setContent("");
      setMood(null);
      setType("note");
      onSaved();
    } else {
      setError(res.error);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {JOURNAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={cn(
                "rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
                type === t.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-input text-muted-foreground hover:bg-accent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="bg-surface"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          className="resize-none bg-surface"
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between">
          <MoodDots mood={mood} onPick={setMood} />
          <Tap className="inline-flex">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add entry
            </Button>
          </Tap>
        </div>
      </CardContent>
    </Card>
  );
}

function EntryCard({
  entry,
  onChanged,
}: {
  entry: JournalEntry;
  onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(entry.title ?? "");
  const [content, setContent] = React.useState(entry.content ?? "");
  const [mood, setMood] = React.useState<number | null>(entry.mood);
  const [busy, setBusy] = React.useState(false);

  async function save() {
    setBusy(true);
    const res = await updateEntry(entry.id, { title: title || null, content, mood });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      onChanged();
    }
  }

  async function remove() {
    setBusy(true);
    const res = await deleteEntry(entry.id);
    if (!res.ok) setBusy(false);
    else onChanged();
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="bg-surface"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="resize-none bg-surface"
          />
          <div className="flex items-center justify-between">
            <MoodDots mood={mood} onPick={setMood} />
            <div className="flex items-center gap-2">
              <Tap className="inline-flex">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </Tap>
              <Tap className="inline-flex">
                <Button size="sm" onClick={save} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save
                </Button>
              </Tap>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{journalTypeLabel(entry.type)}</Badge>
            <span className="text-xs text-muted-foreground">{fmtDate(entry.date)}</span>
            {entry.mood != null && <MoodDots mood={entry.mood} />}
          </div>
          <div className="flex items-center gap-1">
            <Tap className="inline-flex">
              <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(true)} disabled={busy}>
                <Pencil className="h-4 w-4" />
              </Button>
            </Tap>
            <Tap className="inline-flex">
              <Button size="icon" variant="ghost" aria-label="Delete" onClick={remove} disabled={busy}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tap>
          </div>
        </div>
        {entry.title && <p className="font-medium">{entry.title}</p>}
        {entry.content && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{entry.content}</p>
        )}
      </CardContent>
    </Card>
  );
}
