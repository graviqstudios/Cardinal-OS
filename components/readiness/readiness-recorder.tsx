"use client";

import * as React from "react";

import { recordReadiness } from "@/lib/readiness/actions";

/**
 * Headless: records today's readiness snapshot once on dashboard mount, so the
 * daily history (trend + sparkline) fills even on days without practice.
 */
export function ReadinessRecorder() {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void recordReadiness();
  }, []);
  return null;
}
