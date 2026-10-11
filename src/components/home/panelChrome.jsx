// Shared chrome for the home HUD panels: paper, hairlines, hard offset shadows.

import { PAPER, INK, LINE } from "../../data/homeColors.js"

/** Plain panel surface: opaque paper, no frame (the caller adds its own rule). */
export const glassPlain = {
  background: PAPER,
  border: "none",
  boxShadow: "none",
}

/** @deprecated use glassPlain — kept for any legacy callers */
export const glassBrutal = glassPlain

/**
 * Label surface for work nodes — a small paper card. Linked works get an ink
 * border and a hard "paper stack" offset; unlinked ones a hairline.
 *
 * These live inside the auto-rotating 3D scene, so their screen position is
 * recomputed every animation frame: flat fills and unblurred shadows only.
 */
export function glassNode(accent) {
  return {
    background: PAPER,
    border: `1px solid ${accent ? INK : LINE}`,
    boxShadow: accent ? `3px 3px 0 -1px ${PAPER}, 3px 3px 0 0 ${INK}` : "none",
  }
}

/** Divider: a strip of 50% dither. `tint` is ignored (no colour on paper). */
export function DitherRamp({ style }) {
  return (
    <div
      aria-hidden
      style={{
        height: "4px",
        background: "var(--dither-50)",
        ...style,
      }}
    />
  )
}
