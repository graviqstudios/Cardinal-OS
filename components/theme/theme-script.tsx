import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  DEFAULT_PALETTE,
  PALETTE_STORAGE_KEY,
} from "@/lib/theme/config";

/**
 * Blocking, pre-hydration script that applies the palette/accent attributes to
 * <html> before first paint, so there is no flash of the default theme. Mirrors
 * what next-themes does for the base mode class. Reads from localStorage; falls
 * back to the project defaults. Server-rendered profile values (when present)
 * are applied directly on <html> by the layout and take precedence.
 */
export function ThemeScript({
  palette,
  accent,
}: {
  palette?: string;
  accent?: string;
}) {
  const code = `(function(){try{
var d=document.documentElement;
var p=${palette ? JSON.stringify(palette) : "null"}||localStorage.getItem(${JSON.stringify(
    PALETTE_STORAGE_KEY,
  )})||${JSON.stringify(DEFAULT_PALETTE)};
var a=${accent ? JSON.stringify(accent) : "null"}||localStorage.getItem(${JSON.stringify(
    ACCENT_STORAGE_KEY,
  )})||${JSON.stringify(DEFAULT_ACCENT)};
d.setAttribute('data-theme',p);
d.setAttribute('data-accent',a);
}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
