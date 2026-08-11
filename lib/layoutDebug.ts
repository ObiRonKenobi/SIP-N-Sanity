/**
 * Layout / sprite placement debug (F2).
 * Compile-time gated: Next.js inlines NODE_ENV, so production bundles
 * never expose hotkeys, overlays, or the debug panel.
 */
export const LAYOUT_DEBUG =
  process.env.NODE_ENV === "development";
