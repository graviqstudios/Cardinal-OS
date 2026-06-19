import type { SupabaseClient } from "@supabase/supabase-js";

import { chunkText } from "@/lib/ai/chunk";
import { embedTexts } from "@/lib/ai/embeddings";

/**
 * (Re)build the searchable chunks for one journal entry: drop its old chunks,
 * then chunk + embed the current content. Best-effort — if embedding fails
 * (e.g. missing AI key on a non-mock path), the entry is still saved, just not
 * yet searchable. Call after any create/update of an entry's content.
 */
export async function reindexJournalEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  content: string | null,
): Promise<void> {
  await supabase.from("journal_chunks").delete().eq("entry_id", entryId);

  const text = (content ?? "").trim();
  if (!text) return;

  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks);
  } catch {
    return;
  }

  const rows = chunks.map((c, i) => ({
    user_id: userId,
    entry_id: entryId,
    content: c,
    chunk_index: i,
    embedding: embeddings[i],
  }));
  await supabase.from("journal_chunks").insert(rows);
}
