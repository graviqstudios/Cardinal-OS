"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  fadeVariants,
  pageTransition,
  pageVariants,
} from "@/lib/motion/variants";

/**
 * Route-transition primitive: fade + 4–8px rise on mount. Wrap a page's content
 * in this. Honours prefers-reduced-motion by falling back to a pure fade.
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={reduceMotion ? fadeVariants : pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
