"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import { completeTour } from "@/lib/tour/actions";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT } from "@/lib/motion/variants";

type Placement = "top" | "bottom" | "left" | "right";
type Step = { sel: string; title: string; body: string; placement: Placement };

const STEPS: Step[] = [
  {
    sel: '[data-tour="sidebar"]',
    title: "Everything in one place",
    body: "Your whole life in one calm place: Today, Plan, Journal, Calendar, Money and Health. Switch between them any time.",
    placement: "right",
  },
  {
    sel: 'a[href="/plan"]',
    title: "Plan brings it together",
    body: "Habits, tasks, projects and goals all live in Plan now. Open it and switch between them with the tabs up top.",
    placement: "right",
  },
  {
    sel: '[data-tour="life-score"]',
    title: "Your Life Score",
    body: "One gentle number for how things are tracking. It grows as your days take shape — never anything to stress over.",
    placement: "bottom",
  },
  {
    sel: '[data-tour="intention"]',
    title: "Start with one thing",
    body: "Each day, name what matters most. We'll keep it front and centre so the rest can wait.",
    placement: "bottom",
  },
  {
    sel: 'a[href="/health"]',
    title: "Look after yourself",
    body: "Health holds your sleep, energy, mood and hydration, movement, and a moment to breathe.",
    placement: "right",
  },
  {
    sel: 'a[href="/journal"]',
    title: "Reflect here",
    body: "Write daily or weekly notes — and ask your journal anything when you want to look back.",
    placement: "right",
  },
  {
    sel: '[data-tour="capture"]',
    title: "Capture anything, fast",
    body: "Tap to jot something in plain words, like “gym tomorrow 6pm”, and we'll file it for you.",
    placement: "left",
  },
];

const POP_W = 300;
const PAD = 8; // spotlight padding around the target

export function ProductTour({ run, returning = false }: { run: boolean; returning?: boolean }) {
  const [mounted, setMounted] = React.useState(false);
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [i, setI] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [done, setDone] = React.useState(!run);

  React.useEffect(() => setMounted(true), []);

  // Collect only the steps whose target is actually present and visible.
  React.useEffect(() => {
    if (!run) return;
    const present = STEPS.filter((s) => {
      const el = document.querySelector(s.sel) as HTMLElement | null;
      return el && el.getClientRects().length > 0;
    }).map((s) =>
      // Returning users have seen onboarding before — frame the opener as an update.
      returning && s.sel === '[data-tour="sidebar"]'
        ? {
            ...s,
            title: "A few new things",
            body: "We've tidied up. Habits, tasks, projects and goals now live together in Plan, and Body is now Health. Here's a quick look.",
          }
        : s,
    );
    setSteps(present);
  }, [run, returning]);

  const step = steps[i];

  const measure = React.useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.sel) as HTMLElement | null;
    if (el) setRect(el.getBoundingClientRect());
  }, [step]);

  React.useEffect(() => {
    if (done || !step) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // Follow any layout settling (e.g. count-up animations) briefly.
    const id = window.setInterval(measure, 250);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(id);
    };
  }, [measure, done, step]);

  if (!mounted || done || steps.length === 0 || !step || !rect) return null;

  async function finish() {
    setDone(true);
    await completeTour();
  }
  function next() {
    if (i >= steps.length - 1) void finish();
    else setI((n) => n + 1);
  }
  function back() {
    if (i > 0) setI((n) => n - 1);
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Spotlight box (target + padding), clamped into the viewport.
  const sx = Math.max(0, rect.left - PAD);
  const sy = Math.max(0, rect.top - PAD);
  const sw = Math.min(vw, rect.width + PAD * 2);
  const sh = rect.height + PAD * 2;

  // Popover position from placement, clamped to the viewport.
  let left = sx;
  let top = sy;
  switch (step.placement) {
    case "right":
      left = rect.right + 12;
      top = rect.top;
      break;
    case "left":
      left = rect.left - POP_W - 12;
      top = rect.top;
      break;
    case "top":
      left = rect.left;
      top = rect.top - 12 - 160;
      break;
    case "bottom":
    default:
      left = rect.left;
      top = rect.bottom + 12;
      break;
  }
  left = Math.min(Math.max(8, left), vw - POP_W - 8);
  top = Math.min(Math.max(8, top), vh - 180);

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        aria-live="polite"
      >
        {/* Spotlight: a transparent rect with a huge shadow dimming everything else. */}
        <div
          className="pointer-events-none absolute rounded-card"
          style={{
            left: sx,
            top: sy,
            width: sw,
            height: sh,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />

        {/* Popover */}
        <div
          className="absolute w-[300px] rounded-card border bg-surface p-4 shadow-xl"
          style={{ left, top }}
        >
          <p className="font-serif text-lg leading-tight">{step.title}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {steps.map((_, n) => (
                <span
                  key={n}
                  className="h-1.5 rounded-full transition-all duration-200"
                  style={{
                    width: n === i ? 20 : 6,
                    backgroundColor:
                      n === i ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {i > 0 && (
                <Button size="sm" variant="ghost" onClick={back}>
                  Back
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => void finish()}>
                Skip
              </Button>
              <Button size="sm" onClick={next}>
                {i >= steps.length - 1 ? "Done" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
