"use client";

import * as React from "react";
import type { Message } from "@ai-sdk/react";

import type { DocumentRow, SubjectWithTopics } from "@/lib/study/types";
import { SubjectsPanel } from "@/components/study/subjects-panel";
import { ChatPanel } from "@/components/study/chat-panel";

export function StudyWorkspace({
  subjects,
  documents,
  sessionId,
  initialMessages,
}: {
  subjects: SubjectWithTopics[];
  documents: DocumentRow[];
  sessionId: string | null;
  initialMessages: Message[];
}) {
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string | null>(
    null,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SubjectsPanel
        subjects={subjects}
        documents={documents}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
      />
      <div className="lg:sticky lg:top-6 lg:self-start">
        <ChatPanel
          sessionId={sessionId}
          subjectId={selectedSubjectId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
