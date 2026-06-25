"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { isNative } from "@/lib/native";

/** Dark-background themes want light status-bar text; light themes want dark. */
const DARK_THEMES = new Set(["dusk", "ink"]);

/**
 * One-time native shell setup, mounted in the root layout. Entirely inert on the
 * web (returns immediately), so it's safe in the shared site bundle.
 *
 *  - hides the native splash once the WebView has painted
 *  - matches the status-bar style to the active `data-theme`
 *  - routes the Android hardware back button through the app's history
 */
export function NativeBootstrap() {
  const router = useRouter();
  const pathname = usePathname();

  // Splash hide + back-button wiring: run once.
  React.useEffect(() => {
    if (!isNative()) return;
    let removeBackListener: (() => void) | undefined;

    (async () => {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* ignore */
      }
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack || window.history.length > 1) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        removeBackListener = () => handle.remove();
      } catch {
        /* ignore */
      }
    })();

    return () => removeBackListener?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the status bar in sync with the active theme on every navigation.
  React.useEffect(() => {
    if (!isNative()) return;
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const theme =
          document.documentElement.getAttribute("data-theme") ?? "parchment";
        await StatusBar.setStyle({
          style: DARK_THEMES.has(theme) ? Style.Dark : Style.Light,
        });
      } catch {
        /* ignore */
      }
    })();
  }, [pathname]);

  // router is intentionally referenced so future deep-link handling can use it.
  void router;
  return null;
}
