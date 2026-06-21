"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { updateProfile } from "@/lib/profile/actions";
import { useCardinalTheme } from "@/components/theme/theme-provider";
import { ThemeControls } from "@/components/theme/theme-controls";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";
import { DURATION, EASE_OUT, fadeVariants, pageVariants } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";

const STEPS = ["Appearance", "Ready"] as const;

export function OnboardingFlow() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { palette, accent } = useCardinalTheme();

  const [step, setStep] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const last = step === STEPS.length - 1;

  function next() {
    if (last) void finish();
    else setStep((s) => s + 1);
  }

  async function finish() {
    setPending(true);
    setError(null);
    // Only preferences are set here — goals, dates and the rest come later, in-app.
    const res = await updateProfile({ accent_color: accent, theme: palette });
    if (res.ok) {
      router.push("/today");
      router.refresh();
    } else {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/50" : "w-4 bg-muted",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={reduceMotion ? fadeVariants : pageVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            {step === 0 && (
              <Section
                title="Make it yours"
                description="Pick an accent and palette. You can change these any time in Settings, and the whole app updates instantly."
              >
                <ThemeControls />
              </Section>
            )}

            {step === 1 && (
              <Section
                title="You're all set"
                description="That's all we need to begin. Add habits, tasks, goals and the rest whenever you're ready — Cardinal grows with you."
              >
                <div className="rounded-card border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
                  Your home opens to your Life Score, today&apos;s intention, and a
                  calm view of what matters. Nothing to set up first.
                </div>
              </Section>
            )}
          </motion.div>
        </AnimatePresence>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <Tap className="inline-block">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Tap>

          <Tap className="inline-block">
            <Button onClick={next} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {last ? (
                <>
                  {!pending && <Check className="h-4 w-4" />}
                  Enter Cardinal
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </Tap>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
