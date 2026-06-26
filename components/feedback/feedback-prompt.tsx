"use client";

import * as React from "react";
import { X } from "lucide-react";

import { submitFeedback } from "@/lib/feedback/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/feedback/star-rating";

const KEY = "co-feedback-prompt-v1";

/**
 * A calm, once-only nudge asking established users how Cardinal is going. Shown
 * only when `eligible` (the account is a few days old — decided on the server)
 * and never again once the user rates, dismisses, or picks "later" on this
 * device. Appears as a quiet bottom card, not a blocking modal.
 */
export function FeedbackPrompt({ eligible }: { eligible: boolean }) {
  const [show, setShow] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const [state, setState] = React.useState<"ask" | "saving" | "done">("ask");

  React.useEffect(() => {
    if (!eligible) return;
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(KEY));
    } catch {
      /* ignore */
    }
    if (seen) return;
    // Let the page settle before sliding in.
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, [eligible]);

  function close(remember = true) {
    if (remember) {
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    setShow(false);
  }

  async function send() {
    setState("saving");
    await submitFeedback({
      kind: rating >= 4 ? "review" : "feedback",
      rating: rating || null,
      message,
      source: "prompt",
      page: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setState("done");
    setTimeout(() => setShow(false), 1800);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:right-6 sm:left-auto sm:justify-end sm:px-0">
      <div className="relative w-full max-w-[380px] rounded-card border bg-card p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
        <button
          onClick={() => close()}
          aria-label="Dismiss"
          className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {state === "done" ? (
          <div className="py-2">
            <p className="font-serif text-lg leading-tight">Thank you 🌱</p>
            <p className="mt-1 text-sm text-muted-foreground">
              That genuinely helps us shape Cardinal.
            </p>
          </div>
        ) : (
          <>
            <p className="font-serif text-lg leading-tight">How&apos;s Cardinal going?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ve been here a little while — a quick word would mean a lot.
            </p>

            <div className="mt-4">
              <StarRating value={rating} onChange={setRating} size={26} />
            </div>

            {rating > 0 && (
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mt-3"
                placeholder={
                  rating >= 4
                    ? "What's working well for you?"
                    : "What would make Cardinal better?"
                }
              />
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => close()}>
                Not now
              </Button>
              <Button
                size="sm"
                disabled={rating === 0 || state === "saving"}
                onClick={() => void send()}
              >
                {state === "saving" ? "Sending…" : "Send"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
