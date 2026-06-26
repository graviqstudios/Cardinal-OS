import { generateObject } from "ai";
import { z } from "zod";

import { createClient, getUser } from "@/lib/supabase/server";
import { liteModel, isMockAI } from "@/lib/ai/models";
import { freshAccessToken, fetchGmailDigest } from "@/lib/integrations/google";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Scan the user's recent inbox and extract concrete action items as draft task
 * titles. Read-only: nothing is stored or sent anywhere except the AI provider
 * for extraction. The user accepts/rejects the drafts before any task is created.
 */
export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "gmail-scan");
  if (!rl.success) return Response.json({ error: "Rate limit" }, { status: 429 });

  const accessToken = await freshAccessToken(user.id, "google_gmail");
  if (!accessToken) return Response.json({ error: "Gmail not connected." }, { status: 400 });

  let digest;
  try {
    digest = await fetchGmailDigest(accessToken, 15);
  } catch {
    return Response.json({ error: "Could not read your inbox." }, { status: 502 });
  }
  if (digest.length === 0) return Response.json({ tasks: [] });

  // Without an AI key, fall back to surfacing the subjects as candidate tasks.
  if (isMockAI) {
    return Response.json({
      tasks: digest.slice(0, 6).map((d) => d.subject).filter(Boolean),
    });
  }

  const emails = digest
    .map((d, i) => `${i + 1}. From: ${d.from}\n   Subject: ${d.subject}\n   ${d.snippet}`)
    .join("\n\n");

  try {
    const { object } = await generateObject({
      model: liteModel(),
      schema: z.object({ tasks: z.array(z.string()) }),
      system:
        "You extract concrete action items the user needs to do from their recent emails. " +
        "Return short imperative task titles (e.g. 'Reply to Anuj about the invoice'). " +
        "Ignore newsletters, promotions, receipts and anything with no action. " +
        "Return an empty list if nothing is actionable. No numbering.",
      prompt: emails,
    });
    return Response.json({ tasks: object.tasks.slice(0, 10).map((t) => t.trim()).filter(Boolean) });
  } catch {
    return Response.json({ error: "Could not analyse your inbox." }, { status: 502 });
  }
}
