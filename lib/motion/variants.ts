import type { Transition, Variants } from "framer-motion";

/**
 * Cardinal OS motion budget - disciplined, premium, never showy.
 *   • Nothing longer than 250ms.
 *   • Soft easeOut easing; no bounce, spin, or springy overshoot.
 *   • Route transitions = fade + a 4–8px rise.
 *   • Tap = gentle press-scale to ~0.97.
 *   • prefers-reduced-motion falls back to instant / pure fade (handled in the
 *     components via useReducedMotion).
 */

/** Soft, natural easeOut. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.25, // hard ceiling - never exceed
} as const;

export const pageTransition: Transition = {
  duration: DURATION.base,
  ease: EASE_OUT,
};

/** Route/page enter+exit: fade + 6px rise. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

/** Reduced-motion equivalent: pure fade, no movement. */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Staggered list container - ~30ms between children. */
export const listContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: pageTransition },
};

/** Gentle press-scale for interactive elements. */
export const tapScale = 0.97;
