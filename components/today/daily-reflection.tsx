"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { saveDailyReflection } from "@/lib/journal/actions";
import type { JournalEntry } from "@/lib/journal/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";

const MOODS = ["Rough", "Low", "Okay", "Good", "Great"];

export function DailyReflection({ initial }: { initial: JournalEntry | null }) {
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [mood, setMood] = React.useState<number | null>(initial?.mood ?? null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await saveDailyReflection({ content, mood });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Daily reflection
          </p>
          <div className="flex items-center gap-1.5">
            {MOODS.map((label, i) => {
              const value = i + 1;
              const selected = mood === value;
              return (
                <button
                  key={value}
                  title={label}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => setMood(selected ? null : value)}
                  className={cn(
                    "h-3.5 w-3.5 rounded-pill border transition-transform hover:scale-110",
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
        </div>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="How did today go? What are you grateful for, and what would you do differently?"
          rows={3}
          className="resize-none bg-surface"
          onBlur={() => {
            if (content !== (initial?.content ?? "") || mood !== (initial?.mood ?? null)) save();
          }}
        />

        <div className="flex items-center justify-end gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Tap className="inline-flex">
            <Button size="sm" variant="secondary" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </Tap>
        </div>
      </CardContent>
    </Card>
  );
}
