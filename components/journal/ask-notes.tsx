"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUGGESTIONS = [
  "What's been on my mind lately?",
  "When did I feel most at ease?",
  "What keeps coming up for me?",
];

export function AskNotes() {
  const { messages, input, setInput, handleInputChange, handleSubmit, status, error } =
    useChat({ api: "/api/journal/ask" });

  const busy = status === "submitted" || status === "streaming";
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    handleSubmit(e);
  }

  return (
    <Card className="flex h-[60vh] flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
          Ask your notes
        </CardTitle>
      </CardHeader>

      <CardContent ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Ask a question and Cardinal will answer from what you&apos;ve written.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-pill border border-input px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {error && (
          <p className="text-center text-sm text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
      </CardContent>

      <form onSubmit={onSubmit} className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your journal…"
            rows={1}
            className="max-h-32 min-h-[40px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) onSubmit(e);
            }}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </Card>
  );
}
