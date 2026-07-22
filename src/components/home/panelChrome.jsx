// Shared chrome for the home HUD panels: glassmorphism (blur + translucency)
// crossed with brutalism (hard edges, offset slab shadow), all monochrome.

/** 8×8 Bayer-ish dither tile as a data-URI, white dots at the given alpha */
export const ditherTile = (alpha) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cg fill='%23ffffff' fill-opacity='${alpha}'%3E%3Crect x='0' y='0' width='1' height='1'/%3E%3Crect x='4' y='4' width='1' height='1'/%3E%3Crect x='6' y='2' width='1' height='1'/%3E%3Crect x='2' y='6' width='1' height='1'/%3E%3Crect x='3' y='1' width='1' height='1'/%3E%3Crect x='7' y='5' width='1' height='1'/%3E%3C/g%3E%3C/svg%3E")`

/**
 * Panel surface: white→black gradient glass with a faint dither speckle baked
 * into the background stack, square corners, and a hard offset slab shadow.
 */
export const glassBrutal = {
  backgroundImage: `${ditherTile(0.09)}, linear-gradient(165deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 32%, rgba(0,0,0,0.86) 100%)`,
  backgroundSize: "8px 8px, auto",
  backdropFilter: "blur(10px) saturate(130%)",
  WebkitBackdropFilter: "blur(10px) saturate(130%)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderLeft: "2px solid rgba(255,255,255,0.85)",
  borderRadius: 0,
  boxShadow: "8px 8px 0 rgba(0,0,0,0.85), 8px 8px 0 1px rgba(255,255,255,0.35)",
}

/** Divider: a dithered white→transparent gradient strip */
export function DitherRamp({ style }) {
  return (
    <div
      aria-hidden
      style={{
        height: "5px",
        backgroundImage: ditherTile(1),
        backgroundSize: "4px 4px",
        WebkitMaskImage: "linear-gradient(to right, #000, transparent)",
        maskImage: "linear-gradient(to right, #000, transparent)",
        opacity: 0.55,
        ...style,
      }}
    />
  )
}
