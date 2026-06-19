/** Client-safe journal types + constants (no server imports). */

export type JournalType =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "note";

export type JournalEntry = {
  id: string;
  user_id: string;
  type: JournalType | string;
  title: string | null;
  content: string | null;
  mood: number | null;
  date: string | null;
  created_at: string;
  updated_at: string;
};

/** Types offered in the Journal editor (DB also allows quarterly/yearly). */
export const JOURNAL_TYPES: { value: JournalType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function journalTypeLabel(type: string): string {
  return JOURNAL_TYPES.find((t) => t.value === type)?.label ?? "Note";
}
