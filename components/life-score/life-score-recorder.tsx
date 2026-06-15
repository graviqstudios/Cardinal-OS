"use client";

import * as React from "react";

import { recordLifeScore } from "@/lib/life-score/actions";

/** Records today's Life Score snapshot once on mount (fills the trend/sparkline). */
export function LifeScoreRecorder() {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void recordLifeScore();
  }, []);
  return null;
}
