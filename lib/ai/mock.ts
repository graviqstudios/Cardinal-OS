import { simulateReadableStream } from "ai";
import { MockLanguageModelV1 } from "ai/test";
import type { LanguageModelV1Prompt } from "ai";

/**
 * Mock chat model used when no provider key is configured. It streams a short,
 * context-aware reply (echoes the user's last question and any retrieved-notes
 * context) so the full chat + RAG pipeline is exercisable without a real LLM.
 */
export function createMockChatModel(): MockLanguageModelV1 {
  return new MockLanguageModelV1({
    doStream: async ({ prompt }) => ({
      stream: simulateReadableStream({
        initialDelayInMs: 150,
        chunkDelayInMs: 25,
        chunks: toChunks(mockReply(prompt)),
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
    doGenerate: async ({ prompt }) => ({
      text: mockReply(prompt),
      finishReason: "stop",
      usage: { promptTokens: 0, completionTokens: 0 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  });
}

function toChunks(text: string) {
  const words = text.split(/(\s+)/);
  return [
    ...words.map((w) => ({ type: "text-delta" as const, textDelta: w })),
    {
      type: "finish" as const,
      finishReason: "stop" as const,
      usage: { promptTokens: 0, completionTokens: 0 },
    },
  ];
}

function mockReply(prompt: LanguageModelV1Prompt): string {
  const lastUser = [...prompt].reverse().find((m) => m.role === "user");
  let question = "";
  if (lastUser && Array.isArray(lastUser.content)) {
    question = lastUser.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim();
  }

  const hasContext = prompt.some(
    (m) =>
      m.role === "system" &&
      typeof m.content === "string" &&
      m.content.includes("From your notes"),
  );

  return (
    `**(Demo mode — no AI key configured)**\n\n` +
    (question
      ? `You asked: "${question.slice(0, 200)}".\n\n`
      : "") +
    (hasContext
      ? "I found relevant passages in your uploaded notes and would ground my answer in them. "
      : "Once you upload notes, I'll answer grounded in them. ") +
    "Add a `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) to `.env.local` to get real, streamed answers from your study material."
  );
}
