"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

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
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-pill border px-3.5 py-1.5"
      style={{
        backgroundColor: "hsl(var(--accent) / 0.08)",
        borderColor: "hsl(var(--accent) / 0.20)",
      }}
    >
      <span className="shrink-0" style={{ color: "hsl(var(--accent))" }}>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </span>
      <p className="truncate text-sm">
        {loading ? "Reading your day…" : text ?? "Have a focused day."}
      </p>
    </div>
  );
}
