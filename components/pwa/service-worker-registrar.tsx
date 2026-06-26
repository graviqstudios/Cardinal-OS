"use client";

import * as React from "react";

import { isNative } from "@/lib/native";

/**
 * Registers the PWA service worker — browser only. Inside the Capacitor (native)
 * shell we skip it entirely: the native app has its own lifecycle and a SW there
 * would only get in the way. Mounted once in the root layout.
 */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (isNative()) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal — the app still works online.
      });
    };

    // Wait until the page is idle so registration never competes with first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
