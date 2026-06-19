import { getSubjectsWithTopics } from "@/lib/study/queries";
import { Dumbbell } from "lucide-react";

import { requireExamMode } from "@/lib/exam/guard";
import { PracticeClient } from "@/components/practice/practice-client";
import { PageHeader } from "@/components/shell/page-header";

export default async function PracticePage() {
  await requireExamMode();

  const subjects = await getSubjectsWithTopics();
  const topics = subjects.flatMap((s) =>
    s.topics.map((t) => ({ id: t.id, name: t.name, subjectName: s.name })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice"
        description="Quiz yourself on a topic. AI grades your answers and updates the topic's mastery."
        colorVar="--module-study"
        icon={<Dumbbell className="h-5 w-5" />}
      />

      <PracticeClient topics={topics} />
    </div>
  );
}
