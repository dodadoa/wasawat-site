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

// the filter is ruled like a sheet: every cell draws its right and bottom line,
// and the frame around them draws the top and left
const RULE = `1px solid ${INK}`
const CELL = { borderRight: RULE, borderBottom: RULE, padding: "0.4rem 0.6rem", lineHeight: 1.2 }
// the narrowest a set's cell gets, in ems so it follows --ui-scale
const CELL_MIN = "12.5em"
// with less room than this the filter folds: one facet open at a time, picked by tab
const FOLD_BELOW = { w: 560, h: 700 }

/** A cell of the filter you can press: a set, or (`tab`) the name of a folded facet. */
function Chip({ active, onClick, label, count, tab }) {
  const [hot, setHot] = useState(false)
  return (
    <button
      type="button"
      aria-pressed={active}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={(e) => setHot(e.currentTarget.matches(":focus-visible"))}
      onBlur={() => setHot(false)}
      style={{
        font: "inherit",
        ...CELL,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "0.6em",
        minWidth: 0,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        textAlign: "left",
        borderTop: "none",
        borderLeft: "none",
        // a pressed set is inverted, like the view switcher; the open tab loses
        // its bottom rule and runs into the sets under it
        ...(tab
          ? {
              color: active ? INK : SOFT,
              background: "transparent",
              borderBottomColor: active ? "transparent" : INK,
              // five names share one row: each as wide as its name, plus a share of what's left
              flex: "1 1 auto",
              padding: "0.4rem 0.4rem",
              gap: "0.4em",
              letterSpacing: "0.04em",
            }
          : { color: active ? PAPER : INK, background: active ? INK : "transparent" }),
        // the cell under the pointer is ringed, as a selected cell is on /work
        boxShadow: !hot ? "none" : active && !tab ? `inset 0 0 0 2px ${INK}, inset 0 0 0 3px ${PAPER}` : `inset 0 0 0 2px ${INK}`,
        cursor: "pointer",
        outline: "none",
      }}
    >
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {count != null && <span style={{ fontFamily: dataMono, opacity: 0.6 }}>{count}</span>}
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

  // one margin for the filter, the circles and the strip, so their edges line up
  const pad = compact ? 10 : 24

  const rootRef = useRef(null)
  const areaRef = useRef(null)
  const gridRef = useRef(null)
  // the room the whole view has, and what the filter leaves of it for the diagram
  const [room, setRoom] = useState(null)
  const [area, setArea] = useState(null)
  // how many set cells fit across a row of the filter
  const [cols, setCols] = useState(0)
  const folded = compact || (!!room && (room.w - pad * 2 < FOLD_BELOW.w || room.h < FOLD_BELOW.h))
  const [openId, setOpenId] = useState(null)
  const openFacet = facets.find((f) => f.id === openId) ?? facets[0]
  useLayoutEffect(() => {
    const root = rootRef.current
    const el = areaRef.current
    if (!root || !el) return
    const measure = () => {
      const cs = getComputedStyle(root)
      setRoom({
        w: root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        h: root.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
      })
      setArea({ w: el.clientWidth, h: el.clientHeight })
      if (gridRef.current) setCols(getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(el)
    if (gridRef.current) ro.observe(gridRef.current)
    return () => ro.disconnect()
    // folding swaps the grid that is measured
  }, [folded])

  // smaller marks when the circles are
  const size = compact || (!!area && (area.w < 520 || area.h < 440)) ? 34 : 44
  const stripH = size + 30
  const visible = useMemo(
    () => works.filter((w) => !genreFilter || w.genreId === genreFilter),
    [works, genreFilter],
  )
  const sets = picked.map((id) => setById.get(id))

  const { circles, spots, outside } = useMemo(() => {
    if (!area) return { circles: [], spots: new Map(), outside: [] }
    // whole pixels, so the hairlines stay sharp
    const circles = layoutCircles(
      sets.length,
      area.w - pad * 2,
      area.h - LABEL_H * 2 - stripH,
      LABEL_H,
    ).map((c) => ({ cx: Math.round(c.cx + pad), cy: Math.round(c.cy), r: Math.round(c.r) }))

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
  }, [area, picked, visible, pad, size, stripH, setById, keyOf])

  const countIn = (set) => visible.reduce((n, w) => n + (set.keys.has(keyOf(w)) ? 1 : 0), 0)

  const setGrid = (facet, measured) => (
    <div
      ref={measured ? gridRef : undefined}
      style={{
        flex: 1,
        minWidth: 0,
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${CELL_MIN}, 100%), 1fr))`,
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
      {/* empty cells, so the rules run to the end of the row */}
      {Array.from({ length: cols ? (cols - (facet.sets.length % cols)) % cols : 0 }, (_, i) => (
        <span key={i} aria-hidden="true" style={CELL} />
      ))}
    </div>
  )

  return (
    <div ref={rootRef} className="absolute inset-0" style={{ zIndex: 1, display: "flex", flexDirection: "column", padding }}>
      {/* the sets: a ruled grid, a row per facet, the same columns in every row */}
      <div
        style={{
          flexShrink: 0,
          // on a short window the filter scrolls rather than squeezing the circles out
          maxHeight: "45%",
          overflowY: "auto",
          margin: `${compact ? "0.6rem" : "1rem"} ${pad}px 0.6rem`,
          borderTop: RULE,
          borderLeft: RULE,
          fontFamily: mono,
          fontSize: "calc(11px * var(--ui-scale, 1))",
        }}
      >
        {folded ? (
          <>
            <div style={{ display: "flex" }}>
              {facets.map((facet) => (
                <Chip
                  key={facet.id}
                  tab
                  label={facet.title}
                  // how many of its sets are drawn
                  count={facet.sets.filter((set) => picked.includes(set.id)).length || null}
                  active={facet === openFacet}
                  onClick={() => setOpenId(facet.id)}
                />
              ))}
            </div>
            {setGrid(openFacet, true)}
          </>
        ) : (
          facets.map((facet, fi) => (
            <div key={facet.id} style={{ display: "flex" }}>
              <span
                style={{
                  ...CELL,
                  flexShrink: 0,
                  width: "8.6em",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: SOFT,
                }}
              >
                {facet.title}
              </span>
              {setGrid(facet, fi === 0)}
            </div>
          ))
        )}
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
              <line
                x1={pad}
                x2={area.w - pad}
                y1={area.h - stripH + 6.5}
                y2={area.h - stripH + 6.5}
                stroke={LINE}
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
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
                left: pad + 10,
                top: area.h - stripH + 6.5,
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
