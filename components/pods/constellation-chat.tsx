"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { sendMessage, type ConstellationMessage } from "@/lib/pods/chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConstellationChat({
  channelId,
  channelName,
  podId,
  initialMessages,
  currentUserId,
}: {
  channelId: string;
  channelName: string;
  podId: string;
  initialMessages: ConstellationMessage[];
  currentUserId: string;
}) {
  const [messages, setMessages] =
    React.useState<ConstellationMessage[]>(initialMessages);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Keep state in sync when switching between channels.
  React.useEffect(() => {
    setMessages(initialMessages);
  }, [channelId, initialMessages]);

  const append = React.useCallback((msg: ConstellationMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
    );
  }, []);

  // Live updates: append any new message posted to this channel.
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`channel-chat-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "constellation_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => append(payload.new as ConstellationMessage),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelId, append]);

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
    const res = await sendMessage(channelId, podId, text);
    setSending(false);
    if (res.ok && res.data) {
      append(res.data); // optimistic-ish; realtime echo is de-duped by id
    } else if (!res.ok) {
      setBody(text); // restore on failure
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="text-muted-foreground">#</span>
        <span className="text-sm font-semibold">{channelName}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No messages yet. Say hello in #{channelName}.
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

      <form onSubmit={submit} className="flex gap-2 border-t p-3">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Message #${channelName}`}
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
    </div>
  );
}
