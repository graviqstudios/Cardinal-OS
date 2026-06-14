"use client";

import * as React from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { ArrowUp, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export function ChatPanel({
  sessionId,
  subjectId,
  initialMessages,
}: {
  sessionId: string | null;
  subjectId: string | null;
  initialMessages: Message[];
}) {
  const { messages, input, handleInputChange, handleSubmit, status, error } =
    useChat({
      api: "/api/chat",
      initialMessages,
    });

  const busy = status === "submitted" || status === "streaming";
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    handleSubmit(e, { body: { sessionId, subjectId } });
  }

  return (
    <Card className="flex h-[70vh] flex-col overflow-hidden">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">Study chat</p>
        <p className="text-xs text-muted-foreground">
          Grounded in your uploaded notes{subjectId ? " for this subject" : ""}.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Ask anything about your subjects. Upload notes for grounded answers.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
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
        ))}
        {error && (
          <p className="text-center text-sm text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your notes…"
            rows={1}
            className="max-h-32 min-h-[40px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) onSubmit(e);
            }}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
