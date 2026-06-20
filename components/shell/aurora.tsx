/**
 * Warm-depth backdrop for the app shell. A still, layered field (accent glow +
 * soft tints + faint grain, see globals.css) that gives the interface depth.
 * Glass cards/sidebar sit opaque-ish on top. Purely decorative.
 */
export function Aurora() {
  return <div className="co-depth" aria-hidden="true" />;
}
