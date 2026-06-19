"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { sendMessage, type ConstellationMessage } from "@/lib/pods/chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConstellationChat({
  podId,
  initialMessages,
  currentUserId,
}: {
  podId: string;
  initialMessages: ConstellationMessage[];
  currentUserId: string;
}) {
  const [messages, setMessages] =
    React.useState<ConstellationMessage[]>(initialMessages);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Keep state in sync when switching between constellations.
  React.useEffect(() => {
    setMessages(initialMessages);
  }, [podId, initialMessages]);

  const append = React.useCallback((msg: ConstellationMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
    );
  }, []);

  // Live updates: append any new message posted to this constellation.
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`constellation-chat-${podId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "constellation_messages",
          filter: `pod_id=eq.${podId}`,
        },
        (payload) => append(payload.new as ConstellationMessage),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [podId, append]);

  // Stick to the bottom as messages arrive.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setBody("");
    const res = await sendMessage(podId, text);
    setSending(false);
    if (res.ok && res.data) {
      append(res.data); // optimistic-ish; realtime echo is de-duped by id
    } else if (!res.ok) {
      setBody(text); // restore on failure
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className="flex max-h-80 flex-col gap-2 overflow-y-auto"
        >
          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No messages yet. Say hello to your constellation.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.user_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col",
                    mine ? "items-end" : "items-start",
                  )}
                >
                  {!mine && (
                    <span className="px-1 text-[11px] font-medium text-muted-foreground">
                      {m.author_name ?? "Member"}
                    </span>
                  )}
                  <span
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-1.5 text-sm",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {m.body}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message your constellation"
            maxLength={2000}
          />
          <Button type="submit" size="icon" disabled={sending || !body.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
