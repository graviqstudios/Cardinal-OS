import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";

import { createMockChatModel } from "@/lib/ai/mock";

/**
 * Provider factory for Cardinal OS. Per the project doc, the Vercel AI SDK is the
 * AI layer: Gemini Flash/Flash-Lite handle high-volume routes, Claude Sonnet 4.6
 * handles reasoning. When a provider key is missing the factory falls back to a
 * mock model so the whole pipeline still runs locally — swapping in real models
 * later is just setting the env var, no route/UI changes.
 *
 * All AI code runs on the Node.js runtime (never edge).
 */

const geminiKey = process.env.GEMINI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

const gemini = geminiKey
  ? createGoogleGenerativeAI({ apiKey: geminiKey })
  : null;
const claude = anthropicKey ? createAnthropic({ apiKey: anthropicKey }) : null;

export const hasGemini = Boolean(gemini);
export const hasClaude = Boolean(claude);
/** True when no real provider key is configured and we're on the mock path. */
export const isMockAI = !hasGemini && !hasClaude;

/** High-volume chat model: Gemini Flash → Claude Sonnet → mock. */
export function chatModel(): LanguageModelV1 {
  if (gemini) return gemini("gemini-2.5-flash");
  if (claude) return claude("claude-sonnet-4-6");
  return createMockChatModel();
}

/** Cheapest model for trivial structured tasks: Gemini Flash-Lite → Flash → mock. */
export function liteModel(): LanguageModelV1 {
  if (gemini) return gemini("gemini-2.5-flash-lite");
  if (claude) return claude("claude-sonnet-4-6");
  return createMockChatModel();
}

/** Reasoning model for nuanced work: Claude Sonnet 4.6 → Gemini Flash → mock. */
export function reasoningModel(): LanguageModelV1 {
  if (claude) return claude("claude-sonnet-4-6");
  if (gemini) return gemini("gemini-2.5-flash");
  return createMockChatModel();
}

/**
 * Embedding model (768-dim). Null when no Gemini key — caller uses mock vectors.
 * gemini-embedding-001 is the current GA model; outputDimensionality pins it to
 * 768 to match the document_chunks vector(768) column.
 */
export function embeddingModel() {
  if (gemini)
    return gemini.textEmbeddingModel("gemini-embedding-001", {
      outputDimensionality: 768,
    });
  return null;
}
