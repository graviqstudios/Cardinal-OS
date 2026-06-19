import { Mic } from "lucide-react";

import { getSubjectsWithTopics } from "@/lib/study/queries";
import { requireExamMode } from "@/lib/exam/guard";
import { VoiceExaminer } from "@/components/voice/voice-examiner";
import { PageHeader } from "@/components/shell/page-header";

export default async function VoicePage() {
  await requireExamMode();

  const subjects = await getSubjectsWithTopics();
  const topics = subjects.flatMap((s) =>
    s.topics.map((t) => ({ id: t.id, name: t.name, subjectName: s.name })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice examiner"
        description="Get quizzed aloud and answer by speaking — great for revising on the move. Works best in Chrome or Edge."
        icon={<Mic className="h-5 w-5" />}
      />

      <VoiceExaminer topics={topics} />
    </div>
  );
}
