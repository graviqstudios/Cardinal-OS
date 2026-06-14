import { embedMany } from "ai";

import { embeddingModel } from "@/lib/ai/models";

export const EMBEDDING_DIM = 768;

/**
 * Embed a batch of text chunks into 768-dim vectors. Uses Gemini
 * text-embedding-004 when a key is present; otherwise produces deterministic
 * hash-based mock vectors so RAG similarity still behaves coherently (shared
 * words → closer vectors) for local testing.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = embeddingModel();
  if (model) {
    const { embeddings } = await embedMany({ model, values: texts });
    return embeddings;
  }

  return texts.map(mockEmbed);
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}

/** Deterministic bag-of-words hashing embedding, L2-normalised. */
function mockEmbed(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % EMBEDDING_DIM;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}
