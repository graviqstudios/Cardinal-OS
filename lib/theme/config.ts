/**
 * The two user-selectable theme layers, set as data-attributes on <html>:
 * palette (data-theme) and accent (data-accent). Mirrors Design/tokens.css.
 * Swatch colours are for the picker UI only; real colours are the CSS variables.
 */

export const PALETTES = [
  { id: "parchment", label: "Parchment", hint: "light, warm white", swatch: "#F5EFE3" },
  { id: "study", label: "Study", hint: "warm dark", swatch: "#1A140F" },
  { id: "sage", label: "Sage", hint: "calm light", swatch: "#EBEDE5" },
  { id: "dusk", label: "Dusk", hint: "cool twilight", swatch: "#16161E" },
  { id: "ink", label: "Ink", hint: "true black", swatch: "#0B0907" },
] as const;

export const ACCENTS = [
  { id: "cardinal", label: "Cardinal", swatch: "#CB4B33" },
  { id: "ochre", label: "Ochre", swatch: "#B57A1E" },
  { id: "pine", label: "Pine", swatch: "#2F7D5B" },
  { id: "cobalt", label: "Cobalt", swatch: "#2D5FB0" },
  { id: "plum", label: "Plum", swatch: "#7A4C8F" },
] as const;

export type Palette = (typeof PALETTES)[number]["id"];
export type Accent = (typeof ACCENTS)[number]["id"];

export const DEFAULT_PALETTE: Palette = "parchment";
export const DEFAULT_ACCENT: Accent = "cardinal";

export const PALETTE_IDS = PALETTES.map((p) => p.id) as Palette[];
export const ACCENT_IDS = ACCENTS.map((a) => a.id) as Accent[];

export const PALETTE_STORAGE_KEY = "cardinal-palette";
export const ACCENT_STORAGE_KEY = "cardinal-accent";

export function isPalette(value: unknown): value is Palette {
  return typeof value === "string" && PALETTE_IDS.includes(value as Palette);
}

export function isAccent(value: unknown): value is Accent {
  return typeof value === "string" && ACCENT_IDS.includes(value as Accent);
}
