import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSubjectWithTopics } from "@/lib/study/queries";
import { subjectProgress } from "@/lib/study/progress";
import { requireExamMode } from "@/lib/exam/guard";
import { SubjectDetail } from "@/components/study/subject-detail";
import { PageHeader } from "@/components/shell/page-header";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  await requireExamMode();

  const { subjectId } = await params;
  const subject = await getSubjectWithTopics(subjectId);
  if (!subject) notFound();

  const progress = subjectProgress(subject.topics);

  return (
    <div className="space-y-6">
      <Link
        href="/study"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Study
      </Link>

      <PageHeader
        title={subject.name}
        description={`${subject.topics.length} topic${
          subject.topics.length === 1 ? "" : "s"
        } · ${progress}% mastered`}
        colorVar="--module-study"
        mark="/brand/module-study.svg"
      />

      <SubjectDetail subject={subject} />
    </div>
  );
}
