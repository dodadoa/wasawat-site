import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { INK, SOFT, LINE, PAPER } from "../../data/homeColors.js"
import { buildFacets } from "../../data/workFacets.js"

// ─── venn: the works sorted into overlapping sets ─────────────────────────────
// Every value of every facet (a country, a year, a theme…) is a set. Up to
// three are drawn as circles at once, and each work sits in the region its
// memberships put it in; works in none of them wait in a strip underneath.

const mono = "'DepartureMono', monospace"
const dataMono = "'PragmataPro Mono', ui-monospace, Menlo, monospace"

const MAX_SETS = 3
const DEFAULT_SETS = ["country:Thailand", "year:2026", "concept:Machine"]
// no hue to tell the circles apart, so each has its own line: solid, dashed, dotted
const STROKES = [undefined, "7 5", "1.5 5"]
// where each circle's centre sits around the middle of the diagram (deg)
const ANGLES = { 1: [-90], 2: [180, 0], 3: [-90, 150, 30] }
// how far apart the centres are, as a fraction of the radius
const SPREAD = 0.62
const LABEL_H = 30

/** Circles for `n` sets, as large as fit a `w`×`h` box whose top edge is at `top`. */
function layoutCircles(n, w, h, top) {
  if (!n) return []
  const d = n === 1 ? 0 : SPREAD
  const unit = ANGLES[n].map((a) => [Math.cos((a * Math.PI) / 180) * d, Math.sin((a * Math.PI) / 180) * d])
  const xs = unit.map((p) => p[0])
  const ys = unit.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...ys) - 1, Math.max(...ys) + 1]
  // a lone circle doesn't need the whole box
  const r = Math.max(24, Math.min(w / (maxX - minX), h / (maxY - minY)) * (n === 1 ? 0.8 : 1))
  const ox = w / 2 - ((minX + maxX) / 2) * r
  const oy = top + h / 2 - ((minY + maxY) / 2) * r
  return unit.map(([x, y]) => ({ cx: ox + x * r, cy: oy + y * r, r }))
}

/**
 * A spot for every work inside the region it belongs to. Regions are irregular
 * (lenses, crescents), so each is sampled on a grid and its works take the
 * deepest points that still keep their distance from one another.
 * @param {{cx: number, cy: number, r: number}[]} circles
 * @param {Map<number, string[]>} groups region bitmask → work keys
 */
function placeInRegions(circles, groups, size) {
  const STEP = 6
  const byMask = new Map()
  const x0 = Math.min(...circles.map((c) => c.cx - c.r))
  const x1 = Math.max(...circles.map((c) => c.cx + c.r))
  const y0 = Math.min(...circles.map((c) => c.cy - c.r))
  const y1 = Math.max(...circles.map((c) => c.cy + c.r))
  for (let x = x0; x <= x1; x += STEP) {
    for (let y = y0; y <= y1; y += STEP) {
      let mask = 0
      let depth = Infinity
      circles.forEach((c, i) => {
        const edge = Math.hypot(x - c.cx, y - c.cy) - c.r
        if (edge < 0) mask |= 1 << i
        depth = Math.min(depth, Math.abs(edge))
      })
      if (!mask) continue
      if (!byMask.has(mask)) byMask.set(mask, [])
      byMask.get(mask).push({ x, y, depth })
    }
  }

  const spots = new Map()
  for (const [mask, keys] of groups) {
    const candidates = (byMask.get(mask) ?? []).sort((a, b) => b.depth - a.depth)
    let chosen = []
    for (let gap = size + 14; gap > 3; gap *= 0.85) {
      chosen = []
      for (const p of candidates) {
        // the marks are square, so they clear each other along either axis
        if (chosen.every((q) => Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) >= gap)) chosen.push(p)
        if (chosen.length === keys.length) break
      }
      if (chosen.length === keys.length) break
    }
    // left to right, so the numbers read in order
    chosen.sort((a, b) => a.x - b.x || a.y - b.y)
    keys.forEach((key, i) => {
      const p = chosen[i] ?? chosen[chosen.length - 1]
      if (p) spots.set(key, [p.x, p.y])
    })
  }
  return spots
}

/** Where a circle's name goes: clear of the circles, on the side away from the others. */
function labelSpot(circles, i) {
  const c = circles[i]
  if (circles.length === 2) {
    const mid = (circles[0].cx + circles[1].cx) / 2
    return { x: mid + (i ? 8 : -8), y: c.cy - c.r - LABEL_H / 2, align: i ? "start" : "end" }
  }
  const below = circles.length === 3 && i > 0
  return { x: c.cx, y: c.cy + (below ? 1 : -1) * (c.r + LABEL_H / 2), align: "middle" }
}

const ALIGN_SHIFT = { start: "0", middle: "-50%", end: "-100%" }

function Chip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        fontFamily: mono,
        fontSize: "calc(11px * var(--ui-scale, 1))",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        flexShrink: 0,
        // cells sharing borders, like the view switcher; the pressed one is inverted
        color: active ? PAPER : INK,
        background: active ? INK : "transparent",
        border: `1px solid ${INK}`,
        margin: "0 -1px -1px 0",
        padding: "0.4rem 0.6rem",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {label} <span style={{ fontFamily: dataMono, opacity: 0.6 }}>{count}</span>
    </button>
  )
}

/**
 * @param {{
 *   works: any[], keyOf: (w: any) => string, genreFilter: string | null,
 *   activeKey: string | null, onHoverChange: (key: string, hovered: boolean) => void,
 *   renderMark: (work: any, active: boolean, size: number) => import("react").ReactNode,
 *   compact?: boolean, padding?: string,
 * }} props
 */
export default function VennView({ works, keyOf, genreFilter, activeKey, onHoverChange, renderMark, compact = false, padding }) {
  const facets = useMemo(() => buildFacets(works, keyOf), [works, keyOf])
  const setById = useMemo(() => new Map(facets.flatMap((f) => f.sets.map((s) => [s.id, s]))), [facets])
  const [picked, setPicked] = useState(() => DEFAULT_SETS.filter((id) => setById.has(id)))
  // a fourth set pushes the oldest one out
  const toggle = (id) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(-MAX_SETS)))

  const areaRef = useRef(null)
  const [area, setArea] = useState(null)
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    const measure = () => setArea({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const size = compact ? 34 : 44
  const stripH = size + 30
  const visible = useMemo(
    () => works.filter((w) => !genreFilter || w.genreId === genreFilter),
    [works, genreFilter],
  )
  const sets = picked.map((id) => setById.get(id))

  const { circles, spots, outside } = useMemo(() => {
    if (!area) return { circles: [], spots: new Map(), outside: [] }
    const pad = compact ? 10 : 24
    const circles = layoutCircles(
      sets.length,
      area.w - pad * 2,
      area.h - LABEL_H * 2 - stripH,
      LABEL_H,
    ).map((c) => ({ ...c, cx: c.cx + pad }))

    const groups = new Map()
    const outside = []
    for (const w of visible) {
      const key = keyOf(w)
      const mask = sets.reduce((m, s, i) => (s.keys.has(key) ? m | (1 << i) : m), 0)
      if (!mask) outside.push(key)
      else groups.set(mask, [...(groups.get(mask) ?? []), key])
    }
    const spots = circles.length ? placeInRegions(circles, groups, size) : new Map()
    // the works in none of the sets: a row along the bottom
    const gap = Math.min(size + 12, (area.w - pad * 2 - size) / Math.max(outside.length - 1, 1))
    outside.forEach((key, i) => {
      spots.set(key, [area.w / 2 + (i - (outside.length - 1) / 2) * gap, area.h - size / 2 - 6])
    })
    return { circles, spots, outside }
    // `picked` stands in for `sets`, which is rebuilt every render
  }, [area, picked, visible, compact, size, stripH, setById, keyOf])

  const countIn = (set) => visible.reduce((n, w) => n + (set.keys.has(keyOf(w)) ? 1 : 0), 0)

  return (
    <div className="absolute inset-0" style={{ zIndex: 1, display: "flex", flexDirection: "column", padding }}>
      {/* the sets, a row per facet */}
      <div style={{ flexShrink: 0, padding: compact ? "0.6rem 0 0.4rem" : "1rem 1.25rem 0.5rem" }}>
        {facets.map((facet) => (
          <div key={facet.id} style={{ display: "flex", alignItems: "flex-start" }}>
            <span
              style={{
                flexShrink: 0,
                width: compact ? "4.6rem" : "5.6rem",
                padding: compact ? "0.45rem 0 0 0.75rem" : "0.45rem 0 0",
                fontFamily: mono,
                fontSize: "calc(11px * var(--ui-scale, 1))",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: SOFT,
              }}
            >
              {facet.title}
            </span>
            <div
              style={{
                display: "flex",
                flexWrap: compact ? "nowrap" : "wrap",
                overflowX: compact ? "auto" : undefined,
                minWidth: 0,
                paddingBottom: "0.4rem",
                paddingRight: "1px",
              }}
            >
              {facet.sets.map((set) => (
                <Chip
                  key={set.id}
                  label={set.label}
                  count={countIn(set)}
                  active={picked.includes(set.id)}
                  onClick={() => toggle(set.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div ref={areaRef} style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {area && (
          <>
            <svg
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
                pointerEvents: "none",
                // the lines bloom, as they do in the other diagrams
                filter: "drop-shadow(0 0 1px rgba(20,20,20,0.55)) drop-shadow(0 0 7px rgba(20,20,20,0.32))",
              }}
            >
              {circles.map((c, i) => (
                <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="none" stroke={INK} strokeWidth="1" strokeDasharray={STROKES[i]} />
              ))}
              {/* the strip of works outside every set */}
              <line x1="0" x2={area.w} y1={area.h - stripH + 6} y2={area.h - stripH + 6} stroke={LINE} strokeWidth="1" />
            </svg>

            {circles.map((c, i) => {
              const at = labelSpot(circles, i)
              return (
                <span
                  key={sets[i].id}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: `translate(${at.x}px, ${at.y}px) translate(${ALIGN_SHIFT[at.align]}, -50%)`,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5em",
                    padding: "0.2em 0.5em 0.15em",
                    background: PAPER,
                    fontFamily: mono,
                    fontSize: "calc(11px * var(--ui-scale, 1))",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    color: INK,
                    pointerEvents: "none",
                  }}
                >
                  {/* a sample of this circle's line */}
                  <svg width="22" height="2" aria-hidden="true">
                    <line x1="0" x2="22" y1="1" y2="1" stroke={INK} strokeWidth="1" strokeDasharray={STROKES[i]} />
                  </svg>
                  {sets[i].label}
                  <span style={{ fontFamily: dataMono, color: SOFT }}>{countIn(sets[i])}</span>
                </span>
              )
            })}

            {!sets.length && (
              <span
                style={{
                  position: "absolute",
                  left: "50%",
                  top: `calc(50% - ${stripH / 2}px)`,
                  transform: "translate(-50%, -50%)",
                  fontFamily: mono,
                  fontSize: "calc(12px * var(--ui-scale, 1))",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: SOFT,
                  whiteSpace: "nowrap",
                }}
              >
                pick up to {MAX_SETS} sets
              </span>
            )}

            <span
              style={{
                position: "absolute",
                left: compact ? "0.75rem" : "1.25rem",
                top: area.h - stripH + 6,
                transform: "translateY(-50%)",
                padding: "0 0.5em",
                background: PAPER,
                fontFamily: mono,
                fontSize: "calc(11px * var(--ui-scale, 1))",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: SOFT,
              }}
            >
              in none · <span style={{ fontFamily: dataMono }}>{outside.length}</span>
            </span>

            {works.map((w) => {
              const key = keyOf(w)
              const spot = spots.get(key)
              const active = activeKey === key
              const Tag = w.slug ? "a" : "span"
              return (
                <Tag
                  key={key}
                  href={w.slug ? `/art/${w.slug}` : undefined}
                  aria-label={w.label}
                  onMouseEnter={() => onHoverChange(key, true)}
                  onMouseLeave={() => onHoverChange(key, false)}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    // a work filtered out by genre waits in the middle, hidden
                    transform: `translate(${spot?.[0] ?? area.w / 2}px, ${spot?.[1] ?? area.h / 2}px) translate(-50%, -50%)`,
                    // hard steps, no easing
                    transition: "transform 0.3s steps(5, end)",
                    visibility: spot ? "visible" : "hidden",
                    zIndex: active ? 6 : 2,
                    display: "block",
                    textDecoration: "none",
                  }}
                >
                  {renderMark(w, active, size)}
                </Tag>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
