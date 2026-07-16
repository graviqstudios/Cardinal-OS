import type { Message } from "@ai-sdk/react";

import { getChatMessages, getOrCreateChatSession } from "@/lib/study/queries";
import { listChatSessions } from "@/lib/study/chat-actions";
import { ChatPanel } from "@/components/study/chat-panel";
import { Card } from "@/components/ui/card";

/**
 * The Study chat, isolated so it can stream.
 *
 * Loading it needs a session lookup and *then* its messages — a serial round
 * trip the dashboard shouldn't wait on. Rendered in a Suspense boundary, the
 * target banner and subject cards paint immediately.
 */
export async function StudyChat({ subjectId }: { subjectId: string | null }) {
  const [sessionId, sessionsRes] = await Promise.all([
    getOrCreateChatSession(),
    listChatSessions(),
  ]);
  const sessions = sessionsRes.ok && sessionsRes.data ? sessionsRes.data : [];

  const history = sessionId ? await getChatMessages(sessionId) : [];
  const initialMessages: Message[] = history.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));

  return (
    <ChatPanel
      sessions={sessions}
      sessionId={sessionId}
      subjectId={subjectId}
      initialMessages={initialMessages}
    />
  );
}

/** Matches the chat panel's footprint so streaming in doesn't shift layout. */
export function StudyChatSkeleton() {
  return (
    <Card className="flex h-[70vh] flex-col overflow-hidden" aria-hidden>
      <div className="space-y-2 border-b px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex-1" />
      <div className="border-t p-3">
        <div className="h-10 w-full animate-pulse rounded-button bg-muted" />
      </div>
    </Card>
  );
}
