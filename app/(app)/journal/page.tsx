import { NotebookPen } from "lucide-react";

import { getJournalEntries } from "@/lib/journal/queries";
import { PageHeader } from "@/components/shell/page-header";
import { JournalClient } from "@/components/journal/journal-client";
import { AskNotes } from "@/components/journal/ask-notes";
import { WeeklyReview } from "@/components/journal/weekly-review";

export default async function JournalPage() {
  const entries = await getJournalEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        description="A quiet place to think. Write daily, weekly, or whenever - your notes stay yours."
        icon={<NotebookPen className="h-5 w-5" />}
      />

      <WeeklyReview />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <JournalClient entries={entries} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <AskNotes />
        </div>
      </div>
    </div>
  );
}
