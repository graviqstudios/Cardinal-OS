"use server";

import { createClient, getUser } from "@/lib/supabase/server";

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
  return { ok: true };
}
