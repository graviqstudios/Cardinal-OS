"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

import { DURATION, EASE_OUT, tapScale } from "@/lib/motion/variants";

/**
 * Gentle press-scale (~0.97) on tap/click for interactive elements. Renders a
 * motion.div by default; pass `asChild`-style usage by wrapping your control.
 * Under prefers-reduced-motion the scale is disabled.
 */
export function Tap({
  children,
  disabled,
  ...props
}: HTMLMotionProps<"div"> & { disabled?: boolean }) {
  const reduceMotion = useReducedMotion();
  const active = !disabled && !reduceMotion;

  return (
    <motion.div
      whileTap={active ? { scale: tapScale } : undefined}
      transition={{ duration: DURATION.fast, ease: EASE_OUT }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
