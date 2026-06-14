/**
 * Split document text into overlapping chunks for embedding. Paragraph-aware:
 * accumulates paragraphs up to ~maxChars, with a small overlap so context
 * isn't lost at boundaries.
 */
export function chunkText(
  text: string,
  { maxChars = 1200, overlap = 150 }: { maxChars?: number; overlap?: number } = {},
): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = overlap > 0 ? current.slice(-overlap) : "";
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      // Hard-split an oversized paragraph by sentences.
      const sentences = para.match(/[^.!?]+[.!?]*\s*/g) ?? [para];
      for (const s of sentences) {
        if (current.length + s.length > maxChars) flush();
        current += s;
      }
      continue;
    }
    if (current.length + para.length + 2 > maxChars) flush();
    current += (current ? "\n\n" : "") + para;
  }
  flush();

  return chunks.filter(Boolean);
}
