"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/** AI morning briefing. Generated once per day and cached locally to save calls. */
export function TodayBriefing() {
  const [text, setText] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const day = new Date().toISOString().slice(0, 10);
    const key = `cardinal-briefing-${day}`;
    const cached = window.localStorage.getItem(key);
    if (cached) {
      setText(cached);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/today", { method: "POST" });
        const json = await res.json();
        if (!active) return;
        if (res.ok && json.text) {
          setText(json.text);
          window.localStorage.setItem(key, json.text);
        }
      } catch {
        /* leave empty */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <p className="text-sm leading-relaxed">
          {loading ? "Reading your morning…" : text ?? "Have a focused day."}
        </p>
      </CardContent>
    </Card>
  );
}
