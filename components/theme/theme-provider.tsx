"use client";

import * as React from "react";

import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  DEFAULT_PALETTE,
  PALETTE_STORAGE_KEY,
  isAccent,
  isPalette,
  type Accent,
  type Palette,
} from "@/lib/theme/config";

type CardinalThemeContextValue = {
  palette: Palette;
  accent: Accent;
  setPalette: (palette: Palette) => void;
  setAccent: (accent: Accent) => void;
};

const CardinalThemeContext = React.createContext<CardinalThemeContextValue | null>(null);

export function useCardinalTheme() {
  const ctx = React.useContext(CardinalThemeContext);
  if (!ctx) throw new Error("useCardinalTheme must be used within <ThemeProvider>");
  return ctx;
}

const TRANSITION_CLASS = "theme-transition";
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

/** Briefly enable the ≤200ms colour cross-fade while a theme layer changes. */
export function triggerThemeCrossFade() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add(TRANSITION_CLASS);
  if (transitionTimer) clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => root.classList.remove(TRANSITION_CLASS), 220);
}

type ThemeProviderProps = {
  children: React.ReactNode;
  initialPalette?: Palette;
  initialAccent?: Accent;
};

export function ThemeProvider({ children, initialPalette, initialAccent }: ThemeProviderProps) {
  const [palette, setPaletteState] = React.useState<Palette>(initialPalette ?? DEFAULT_PALETTE);
  const [accent, setAccentState] = React.useState<Accent>(initialAccent ?? DEFAULT_ACCENT);

  // Reconcile with the value the pre-hydration script applied (localStorage),
  // unless the server gave us an authenticated profile value.
  React.useEffect(() => {
    if (initialPalette === undefined) {
      const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY);
      if (isPalette(stored)) setPaletteState(stored);
    }
    if (initialAccent === undefined) {
      const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
      if (isAccent(stored)) setAccentState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", palette);
    window.localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  }, [palette]);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [accent]);

  const setPalette = React.useCallback((next: Palette) => {
    triggerThemeCrossFade();
    setPaletteState(next);
  }, []);

  const setAccent = React.useCallback((next: Accent) => {
    triggerThemeCrossFade();
    setAccentState(next);
  }, []);

  const value = React.useMemo(
    () => ({ palette, accent, setPalette, setAccent }),
    [palette, accent, setPalette, setAccent],
  );

  return (
    <CardinalThemeContext.Provider value={value}>{children}</CardinalThemeContext.Provider>
  );
}
