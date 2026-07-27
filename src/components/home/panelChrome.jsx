// Shared chrome for the home HUD panels: glassmorphism, borderless.

import { rgba } from "../../data/homeColors.js"

/** 8×8 Bayer-ish dither tile as a data-URI */
export const ditherTile = (alpha, rgb = "0,0,0") =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cg fill='rgb(${rgb})' fill-opacity='${alpha}'%3E%3Crect x='0' y='0' width='1' height='1'/%3E%3Crect x='4' y='4' width='1' height='1'/%3E%3Crect x='6' y='2' width='1' height='1'/%3E%3Crect x='2' y='6' width='1' height='1'/%3E%3Crect x='3' y='1' width='1' height='1'/%3E%3Crect x='7' y='5' width='1' height='1'/%3E%3C/g%3E%3C/svg%3E")`

/**
 * Borderless panel surface: glass blur + dither, no frame.
 */
export const glassPlain = {
  backgroundImage: `${ditherTile(0.03)}, linear-gradient(165deg, rgba(255,255,255,0.88) 0%, rgba(248,248,248,0.94) 100%)`,
  backgroundSize: "8px 8px, auto",
  backdropFilter: "blur(12px) saturate(110%)",
  WebkitBackdropFilter: "blur(12px) saturate(110%)",
  border: "none",
  boxShadow: "none",
}

/** @deprecated use glassPlain — kept for any legacy callers */
export const glassBrutal = glassPlain

/** Glass surface for 3D work node labels — borderless, optional accent tint */
export function glassNode(accent) {
  const tint = accent
    ? `, linear-gradient(165deg, rgba(255,255,255,0.78) 0%, ${rgba(accent, 0.1)} 100%)`
    : ", linear-gradient(165deg, rgba(255,255,255,0.88) 0%, rgba(248,248,248,0.94) 100%)"

  return {
    backgroundImage: `${ditherTile(0.035)}${tint}`,
    backgroundSize: "8px 8px, auto",
    backdropFilter: "blur(14px) saturate(120%)",
    WebkitBackdropFilter: "blur(14px) saturate(120%)",
    border: "none",
    boxShadow: accent
      ? `0 0 36px 10px ${rgba(accent, 0.14)}`
      : "0 0 24px 8px rgba(0,0,0,0.06)",
  }
}

/** Divider: dither strip, optionally tinted with an accent gradient */
export function DitherRamp({ style, tint }) {
  return (
    <div
      aria-hidden
      style={{
        height: "5px",
        backgroundImage: tint
          ? `${ditherTile(1)}, ${tint}`
          : ditherTile(1),
        backgroundSize: tint ? "4px 4px, 100% 100%" : "4px 4px",
        WebkitMaskImage: "linear-gradient(to right, #000, transparent)",
        maskImage: "linear-gradient(to right, #000, transparent)",
        opacity: tint ? 0.75 : 0.55,
        ...style,
      }}
    />
  )
}
