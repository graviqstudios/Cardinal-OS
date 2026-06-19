import type { Message } from "@ai-sdk/react";

import {
  getChatMessages,
  getDocuments,
  getOrCreateChatSession,
  getSubjectsWithTopics,
} from "@/lib/study/queries";
import { isMockAI } from "@/lib/ai/models";
import { requireExamMode } from "@/lib/exam/guard";
import { StudyWorkspace } from "@/components/study/study-workspace";
import { PageHeader } from "@/components/shell/page-header";

export default async function StudyPage() {
  await requireExamMode();

  const [subjects, documents, sessionId] = await Promise.all([
    getSubjectsWithTopics(),
    getDocuments(),
    getOrCreateChatSession(),
  ]);

  const history = sessionId ? await getChatMessages(sessionId) : [];
  const initialMessages: Message[] = history.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study"
        description="Manage subjects and topics, upload notes, and chat with your material."
        colorVar="--module-study"
        mark="/brand/module-study.svg"
      />

      {isMockAI && (
        <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Demo AI mode — add a <code className="font-mono">GEMINI_API_KEY</code> to
          <code className="font-mono"> .env.local</code> for real answers, embeddings, and grading.
        </div>
      )}

      <StudyWorkspace
        subjects={subjects}
        documents={documents}
        sessionId={sessionId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
