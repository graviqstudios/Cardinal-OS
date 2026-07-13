"use client";

import * as React from "react";
import { useChat, type Message } from "@ai-sdk/react";
import {
  ArrowUp,
  Check,
  Copy,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  createChatSession,
  deleteChatSession,
  getSessionMessages,
  listChatSessions,
  saveSessionMessages,
  type ChatSessionSummary,
  type ChatTurn,
} from "@/lib/study/chat-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function ChatPanel({
  sessions: initialSessions,
  sessionId,
  subjectId,
  initialMessages,
}: {
  sessions: ChatSessionSummary[];
  sessionId: string | null;
  subjectId: string | null;
  initialMessages: Message[];
}) {
  const [sessions, setSessions] =
    React.useState<ChatSessionSummary[]>(initialSessions);
  const [currentId, setCurrentId] = React.useState<string | null>(sessionId);
  const [threadMessages, setThreadMessages] =
    React.useState<Message[]>(initialMessages);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);

  const refreshSessions = React.useCallback(() => {
    void listChatSessions().then((res) => {
      if (res.ok && res.data) setSessions(res.data);
    });
  }, []);

  async function newChat() {
    setHistoryOpen(false);
    const res = await createChatSession();
    if (!res.ok || !res.data) return;
    setSessions((prev) => [
      { id: res.data!.id, title: "New chat", updated_at: new Date().toISOString() },
      ...prev,
    ]);
    setCurrentId(res.data.id);
    setThreadMessages([]);
  }

  async function switchTo(id: string) {
    if (id === currentId) {
      setHistoryOpen(false);
      return;
    }
    setSwitching(true);
    const res = await getSessionMessages(id);
    setSwitching(false);
    setHistoryOpen(false);
    setCurrentId(id);
    setThreadMessages(res.ok && res.data ? (res.data as Message[]) : []);
  }

  async function removeSession(id: string) {
    await deleteChatSession(id);
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (id === currentId) {
      if (remaining[0]) void switchTo(remaining[0].id);
      else void newChat();
    }
  }

  return (
    <Card className="relative flex h-[70vh] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Study chat</p>
          <p className="truncate text-xs text-muted-foreground">
            Grounded in your uploaded notes{subjectId ? " for this subject" : ""}.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Chat history"
            onClick={() => setHistoryOpen((o) => !o)}
          >
            <History className="h-4 w-4" />
          </Button>
          <Tap className="inline-flex">
            <Button
              variant="secondary"
              size="sm"
              onClick={newChat}
              aria-label="New chat"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </Tap>
        </div>
      </div>

      {historyOpen && (
        <HistoryPanel
          sessions={sessions}
          currentId={currentId}
          onPick={switchTo}
          onDelete={removeSession}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {switching ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ChatThread
          key={currentId ?? "none"}
          sessionId={currentId}
          subjectId={subjectId}
          initialMessages={threadMessages}
          onSaved={refreshSessions}
        />
      )}
    </Card>
  );
}

function HistoryPanel({
  sessions,
  currentId,
  onPick,
  onDelete,
  onClose,
}: {
  sessions: ChatSessionSummary[];
  currentId: string | null;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        className="absolute inset-0 z-10 cursor-default"
        aria-label="Close history"
        onClick={onClose}
      />
      <div className="absolute left-3 right-3 top-14 z-20 max-h-72 overflow-y-auto rounded-card border bg-popover p-1 shadow-lg">
        {sessions.length === 0 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">
            No chats yet.
          </p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "group flex items-center gap-1 rounded-button px-2 py-1.5 text-sm",
                s.id === currentId ? "bg-accent" : "hover:bg-accent",
              )}
            >
              <button
                onClick={() => onPick(s.id)}
                className="flex-1 truncate text-left"
                title={s.title}
              >
                {s.title || "New chat"}
              </button>
              <button
                onClick={() => onDelete(s.id)}
                aria-label="Delete chat"
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function ChatThread({
  sessionId,
  subjectId,
  initialMessages,
  onSaved,
}: {
  sessionId: string | null;
  subjectId: string | null;
  initialMessages: Message[];
  onSaved: () => void;
}) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    append,
    reload,
    stop,
    status,
    error,
  } = useChat({ api: "/api/chat", initialMessages });

  const busy = status === "submitted" || status === "streaming";
  const dirty = React.useRef(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Client-owned persistence: whenever a turn completes, mirror the whole
  // transcript so edits/regenerations stay consistent on reload.
  React.useEffect(() => {
    if (status !== "ready" || !dirty.current || !sessionId) return;
    dirty.current = false;
    const turns: ChatTurn[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    void saveSessionMessages(sessionId, turns).then(onSaved);
  }, [status, messages, sessionId, onSaved]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    dirty.current = true;
    handleSubmit(e, { body: { subjectId } });
  }

  function copy(m: Message) {
    void navigator.clipboard.writeText(m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1200);
  }

  function saveEdit(m: Message) {
    const idx = messages.findIndex((x) => x.id === m.id);
    if (idx < 0) return;
    const content = draft.trim();
    if (!content) return;
    // Drop the edited message and everything after it, then resend it fresh so
    // the assistant re-answers from the edited point.
    setMessages(messages.slice(0, idx));
    setEditingId(null);
    dirty.current = true;
    setTimeout(() => {
      void append({ role: "user", content }, { body: { subjectId } });
    }, 0);
  }

  function regenerate() {
    dirty.current = true;
    void reload({ body: { subjectId } });
  }

  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Ask anything about your subjects. Upload notes for grounded answers.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.role === "user";
          const editing = editingId === m.id;
          return (
            <div
              key={m.id}
              className={cn("group flex flex-col", mine ? "items-end" : "items-start")}
            >
              {editing ? (
                <div className="w-full max-w-[85%] space-y-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    className="resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(m)} disabled={!draft.trim()}>
                      <Check className="h-4 w-4" />
                      Save &amp; send
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    {m.content}
                  </div>
                  <div className="mt-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconBtn
                      label={copiedId === m.id ? "Copied" : "Copy"}
                      onClick={() => copy(m)}
                    >
                      {copiedId === m.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </IconBtn>
                    {mine && !busy && (
                      <IconBtn
                        label="Edit"
                        onClick={() => {
                          setEditingId(m.id);
                          setDraft(m.content);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </IconBtn>
                    )}
                    {!mine && m.id === lastAssistantId && !busy && (
                      <IconBtn label="Regenerate" onClick={regenerate}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </IconBtn>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
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
          {busy ? (
            <Button type="button" size="icon" variant="secondary" onClick={stop} aria-label="Stop">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
