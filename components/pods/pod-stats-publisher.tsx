"use client";

import * as React from "react";

import { publishPodStats } from "@/lib/pods/actions";

/** Publishes the user's shareable snapshot (readiness/streak/goal) on mount. */
export function PodStatsPublisher() {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void publishPodStats();
  }, []);
  return null;
}
