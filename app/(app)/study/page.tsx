import type { Message } from "@ai-sdk/react";

import {
  getChatMessages,
  getOrCreateChatSession,
  getStudyTarget,
  getSubjectsWithTopics,
} from "@/lib/study/queries";
import { listChatSessions } from "@/lib/study/chat-actions";
import { getReadinessSnapshot } from "@/lib/readiness/service";
import { isMockAI } from "@/lib/ai/models";
import { requireExamMode } from "@/lib/exam/guard";
import { TargetBanner } from "@/components/study/target-banner";
import { SubjectGrid } from "@/components/study/subject-grid";
import { HeatmapGrid } from "@/components/study/heatmap-grid";
import { ChatPanel } from "@/components/study/chat-panel";
import { PageHeader } from "@/components/shell/page-header";

export default async function StudyPage() {
  await requireExamMode();

  const [subjects, target, readiness, sessionId, sessionsRes] = await Promise.all([
    getSubjectsWithTopics(),
    getStudyTarget(),
    getReadinessSnapshot(),
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

  const hasTopics = subjects.some((s) => s.topics.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Study"
        description="Your exam prep in one place - track your target, plan each subject, and revise."
        colorVar="--module-study"
        mark="/brand/module-study.svg"
      />

      {isMockAI && (
        <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Demo AI mode - add a <code className="font-mono">GEMINI_API_KEY</code> to
          <code className="font-mono"> .env.local</code> for real answers, embeddings, and grading.
        </div>
      )}

      {readiness && (
        <TargetBanner
          target={
            target ?? {
              exam_target: null,
              exam_date: null,
              exam_target_score: null,
            }
          }
          score={readiness.score}
          previous={readiness.previous}
          history={readiness.history}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <SubjectGrid subjects={subjects} />

          {hasTopics && (
            <section className="space-y-4">
              <h2 className="font-serif text-xl tracking-tight">
                Whole syllabus
              </h2>
              <HeatmapGrid subjects={subjects} />
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ChatPanel
            sessions={sessions}
            sessionId={sessionId}
            subjectId={null}
            initialMessages={initialMessages}
          />
        </aside>
      </div>
    </div>
  );
}
