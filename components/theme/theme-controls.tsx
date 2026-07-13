"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { ACCENTS, PALETTES, type Accent, type Palette } from "@/lib/theme/config";
import { Tap } from "@/components/motion/tap";
import { useCardinalTheme } from "@/components/theme/theme-provider";
import { updateProfile } from "@/lib/profile/actions";

/**
 * Live control for the two brand theme layers: palette (data-theme) and accent
 * (data-accent). When `persist`, changes write to the user's profile immediately.
 */
export function ThemeControls({ persist = false }: { persist?: boolean }) {
  const { palette, accent, setPalette, setAccent } = useCardinalTheme();

  const onPalette = (p: Palette) => {
    setPalette(p);
    if (persist) void updateProfile({ theme: p });
  };
  const onAccent = (a: Accent) => {
    setAccent(a);
    if (persist) void updateProfile({ accent_color: a });
  };

  return (
    <div className="space-y-8">
      {/* ── Accent ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Accent</h3>
          <p className="text-sm text-muted-foreground">
            One key colour - threads through buttons, focus rings, and the readiness ring.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const selected = accent === a.id;
            return (
              <Tap key={a.id} className="inline-flex">
                <button
                  type="button"
                  aria-label={a.label}
                  aria-pressed={selected}
                  onClick={() => onAccent(a.id)}
                  className={cn(
                    "relative h-10 w-10 rounded-pill ring-2 ring-offset-2 ring-offset-background transition-shadow",
                    selected ? "ring-foreground" : "ring-transparent",
                  )}
                  style={{ backgroundColor: a.swatch }}
                >
                  {selected && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                  )}
                </button>
              </Tap>
            );
          })}
        </div>
      </section>

      {/* ── Theme ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Theme</h3>
          <p className="text-sm text-muted-foreground">Five rooms to study in.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PALETTES.map((p) => {
            const selected = palette === p.id;
            return (
              <Tap key={p.id} className="block">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPalette(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-button border p-3 text-left transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-pill border border-border"
                    style={{ backgroundColor: p.swatch }}
                  />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">{p.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{p.hint}</span>
                  </span>
                  {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                </button>
              </Tap>
            );
          })}
        </div>
      </section>
    </div>
  );
}
