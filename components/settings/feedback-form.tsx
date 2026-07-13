"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { submitFeedback, type FeedbackKind } from "@/lib/feedback/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/feedback/star-rating";

const KINDS: { id: FeedbackKind; label: string }[] = [
  { id: "feedback", label: "Feedback" },
  { id: "review", label: "Review" },
  { id: "bug", label: "Bug" },
];

/** Settings section: rate Cardinal, leave a review, or report a bug. */
export function FeedbackForm() {
  const pathname = usePathname();
  const [kind, setKind] = React.useState<FeedbackKind>("feedback");
  const [rating, setRating] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const [allowTestimonial, setAllowTestimonial] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const showRating = kind !== "bug";
  const showTestimonial = kind === "review";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("saving");
    const res = await submitFeedback({
      kind,
      rating: showRating ? rating || null : null,
      message,
      allowTestimonial: showTestimonial && allowTestimonial,
      source: "settings",
      page: pathname,
    });
    if (res.ok) {
      setState("done");
    } else {
      setError(res.error);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-card border border-primary/20 bg-primary/[0.06] p-5 text-sm">
        <p className="font-medium text-foreground">Thank you - we read every word.</p>
        <p className="mt-1 text-muted-foreground">
          Your note helps shape what we build next.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => {
            setRating(0);
            setMessage("");
            setAllowTestimonial(false);
            setState("idle");
          }}
        >
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* kind switch */}
      <div className="inline-flex rounded-button border p-0.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={`rounded-[calc(var(--r-button)-2px)] px-3 py-1.5 text-sm font-medium transition-colors ${
              kind === k.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {showRating && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">How is Cardinal feeling so far?</p>
          <StarRating value={rating} onChange={setRating} />
        </div>
      )}

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder={
          kind === "bug"
            ? "What went wrong? What were you trying to do?"
            : kind === "review"
              ? "What do you like? What would you tell a friend?"
              : "What's working, what's missing, what would make this better?"
        }
      />

      {showTestimonial && (
        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={allowTestimonial}
            onChange={(e) => setAllowTestimonial(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
          />
          <span>You can share this as a testimonial (with just my first name).</span>
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
