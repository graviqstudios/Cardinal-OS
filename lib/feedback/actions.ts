"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import { brevoConfigured, sendEmail } from "@/lib/email/brevo";

/** Where feedback notifications are sent (overridable, defaults to the team inbox). */
const NOTIFY_TO = process.env.FEEDBACK_NOTIFY_TO || "graviqstudios@gmail.com";

/** Tag applied to every feedback email — subject prefix + Brevo tag. */
const FEEDBACK_TAG = "Cardinal OS Feedbacks";

export type FeedbackKind = "feedback" | "review" | "bug";

export type SubmitFeedbackInput = {
  kind?: FeedbackKind;
  rating?: number | null;
  message?: string | null;
  allowTestimonial?: boolean;
  source?: string;
  page?: string;
};

type Result = { ok: true } | { ok: false; error: string };

/**
 * Store a piece of user feedback / a review. Backs both the Settings form and
 * the in-app feedback prompt. Requires either a rating or a message so we never
 * record empty rows.
 */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const rating =
    typeof input.rating === "number" && input.rating >= 1 && input.rating <= 5
      ? Math.round(input.rating)
      : null;
  const message = input.message?.trim() || null;

  if (rating == null && !message) {
    return { ok: false, error: "Add a rating or a few words first." };
  }

  const kind: FeedbackKind =
    input.kind === "review" || input.kind === "bug" ? input.kind : "feedback";

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    kind,
    rating,
    message,
    allow_testimonial: Boolean(input.allowTestimonial),
    source: input.source ?? null,
    page: input.page ?? null,
  });

  if (error) return { ok: false, error: "Couldn't save that — please try again." };

  // Notify the team by email — best-effort, never blocks or fails the save.
  if (brevoConfigured()) {
    try {
      const stars = rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : "—";
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      await sendEmail({
        to: NOTIFY_TO,
        subject: `[${FEEDBACK_TAG}] New ${kind}${rating ? ` (${rating}★)` : ""}`,
        tags: [FEEDBACK_TAG],
        html: `
          <div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#1a140f">
            <p><strong>Type:</strong> ${kind}</p>
            <p><strong>Rating:</strong> ${stars}</p>
            <p><strong>From:</strong> ${esc(user.email ?? user.id)}</p>
            <p><strong>Page:</strong> ${esc(input.page ?? "—")} · <strong>Source:</strong> ${esc(input.source ?? "—")}</p>
            ${input.allowTestimonial ? "<p><strong>✔ OK to use as a testimonial</strong></p>" : ""}
            <p><strong>Message:</strong></p>
            <p style="white-space:pre-wrap;border-left:3px solid #CB4B33;padding-left:12px">${message ? esc(message) : "<em>(no message)</em>"}</p>
          </div>`,
      });
    } catch {
      // Email failures must not affect the user — the row is already saved.
    }
  }

  return { ok: true };
}
