import { Canvas } from "@react-three/fiber"
import { OrbitControls, Html, Line, Grid } from "@react-three/drei"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { genreLayers, XY_SCALE, Z_AXIS_LABELS, QUADRANT_LABELS } from "../data/homeQuadrant3d.js"
import { AXIS_COLORS, AXIS_TEXT_COLORS, ACCENTS, TEXT, TEXT_ACCENTS, genreColor, genreGradient, genreTextColor, rgba } from "../data/homeColors.js"
import { workQuadrantMeta } from "../utils/quadrantWorkMeta.js"
import { glassNode, glassPlain } from "./home/panelChrome.jsx"
import DomStatsPanel from "./home/DomStatsPanel.jsx"

const S = XY_SCALE
const mono = "'DepartureMono', monospace"
const displayMono = "'403Mesapholic', monospace"
const MOBILE_MQ = "(max-width: 768px)"

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return mobile
}

function collectWorks() {
  return genreLayers
    .filter((l) => l.id !== "all")
    .flatMap((layer) => layer.works.map((w) => ({ ...w, genreId: layer.id })))
}

/** Map x/y in [-1,1] to percentage within padded diagram */
function toPercent(v, invert = false) {
  const pad = 12
  const t = (v + 1) / 2
  const p = invert ? 1 - t : t
  return pad + p * (100 - pad * 2)
}

// ─── axis end label ───────────────────────────────────────────────────────────

const AxisLabel = memo(function AxisLabel({ position, text, color = TEXT.primary }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <span style={{
        fontFamily: "'403Mesapholic', monospace",
        fontSize: "calc(14px * var(--ui-scale, 1))",
        fontWeight: 400,
        letterSpacing: "0.12em",
        color,
        whiteSpace: "nowrap",
      }}>
        {text}
      </span>
    </Html>
  )
})

const QuadrantLegend = memo(function QuadrantLegend({ x, y, label }) {
  return (
    <Html position={[x * S, y * S, 0]} center style={{ pointerEvents: "none" }}>
      <span style={{
        fontFamily: "'403Mesapholic', monospace",
        fontSize: "calc(11px * var(--ui-scale, 1))",
        fontWeight: 400,
        letterSpacing: "0.06em",
        color: TEXT.tertiary,
        whiteSpace: "pre-line",
        textAlign: "center",
        lineHeight: 1.35,
        maxWidth: "148px",
      }}>
        {label}
      </span>
    </Html>
  )
})

// ─── single work node ─────────────────────────────────────────────────────────

function WorkHoverCard({ work, accent }) {
  const meta = workQuadrantMeta(work)

  return (
    <div
      style={{
        textAlign: "left",
        padding: "10px 14px",
        minWidth: "200px",
        maxWidth: "280px",
        ...glassNode(accent),
      }}
    >
      <style>{`
        .quadrant-hover-meta { font-size: 10px; }
        @media (min-width: 1600px) {
          .quadrant-hover-meta { font-size: 10.2px; }
        }
      `}</style>
      <div
        className="quadrant-hover-meta"
        style={{
          fontFamily: mono,
          letterSpacing: "0.06em",
          color: TEXT.secondary,
          lineHeight: 1.5,
        }}
      >
        <div>{meta.xAxis} · {meta.yAxis} · {meta.zAxis}</div>
        <div style={{ color: TEXT.primary, marginTop: "4px" }}>
          x {meta.coords.x} · y {meta.coords.y} · z {meta.coords.z}
        </div>
      </div>
    </div>
  )
}

const WorkNode = memo(function WorkNode({ work, genreId, dimmed, onHoverChange }) {
  const [hovered, setHovered] = useState(false)
  const accent = genreColor(genreId)
  const color = dimmed ? "#999999" : accent
  const pos = [work.x * S, work.y * S, (work.z ?? 0) * S]
  const showDetail = hovered && !dimmed
  const planeLabel = work.planeLabel ?? work.label
  const key = work.slug ?? work.label
  // pre-generated 176px thumbs (public/images/thumbs) — the node renders at
  // 88x60, so the full-size image is wasted bandwidth here
  const thumb = work.slug && work.image ? `/images/thumbs/${work.slug}.jpg` : work.image

  const setHover = (v) => {
    setHovered(v)
    onHoverChange?.(key, v)
  }

  return (
    <group position={pos}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/*
        Always mounted — even when dimmed — and dimmed via opacity/pointerEvents
        instead of conditional rendering. Unmounting this on every genre-filter
        click would tear down the <img> DOM node and force the browser to
        re-fetch the thumbnail each time it comes back.
      */}
      <Html
        center
        style={{ pointerEvents: "none", zIndex: hovered ? 9999 : undefined }}
        occlude={false}
      >
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            pointerEvents: dimmed ? "none" : "auto",
            opacity: dimmed ? 0 : 1,
            visibility: dimmed ? "hidden" : "visible",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {work.slug ? (
            <a
              href={`/art/${work.slug}`}
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              {work.image && (
                <div
                  className="dither-thumb"
                  style={{
                    width: "88px",
                    height: "60px",
                    marginBottom: "4px",
                    flexShrink: 0,
                    ...glassNode(accent),
                    padding: 0,
                  }}
                >
                  <img src={thumb} alt="" decoding="async" />
                </div>
              )}
              <span
                style={{
                  display: "block",
                  fontFamily: "'403Mesapholic', monospace",
                  fontSize: "calc(15px * var(--ui-scale, 1))",
                  fontWeight: 400,
                  fontStyle: "italic",
                  letterSpacing: "0.04em",
                  color: "#0a0a0a",
                  padding: "5px 14px",
                  width: "max-content",
                  maxWidth: "min(92vw, 640px)",
                  whiteSpace: "nowrap",
                  lineHeight: 1.35,
                  ...glassNode(accent),
                }}
              >
                {planeLabel}
              </span>
            </a>
          ) : (
            <>
              {work.image && (
                <div
                  className="dither-thumb"
                  style={{
                    width: "88px",
                    height: "60px",
                    marginBottom: "4px",
                    flexShrink: 0,
                    ...glassNode(accent),
                    padding: 0,
                  }}
                >
                  <img src={thumb} alt="" decoding="async" />
                </div>
              )}
              <span
                style={{
                  display: "block",
                  fontFamily: "'403Mesapholic', monospace",
                  fontSize: "calc(15px * var(--ui-scale, 1))",
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                  color: "#2a2a2a",
                  padding: "5px 14px",
                  width: "max-content",
                  maxWidth: "min(92vw, 640px)",
                  whiteSpace: "nowrap",
                  lineHeight: 1.35,
                  ...glassNode(null),
                }}
              >
                {planeLabel}
              </span>
            </>
          )}
          {showDetail && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                paddingTop: "4px",
                width: "max-content",
                zIndex: 20,
                pointerEvents: "auto",
              }}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
            >
              <WorkHoverCard work={work} accent={accent} />
            </div>
          )}
        </div>
      </Html>
    </group>
  )
})

// ─── the 3d scene ─────────────────────────────────────────────────────────────

function Scene({ genreFilter }) {
  const works = useMemo(() => collectWorks(), [])
  // Pause auto-rotate while a work node is hovered — otherwise every hovered
  // label/thumbnail (backdrop-blurred, screen-projected each frame) has to be
  // repositioned and repainted continuously, which reads as hover lag.
  const [hoveredKey, setHoveredKey] = useState(null)
  // Stable identity across re-renders — WorkNode is memo()'d, so if this were
  // redefined on every render, every node's <Html> (and its <img>) would be
  // torn down and recreated whenever *any* node's hover state changed.
  const handleHoverChange = useCallback((key, isHovered) => {
    setHoveredKey((prev) => (isHovered ? key : prev === key ? null : prev))
  }, [])

  return (
    <>
      <OrbitControls
        autoRotate={!hoveredKey}
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.05}
        minDistance={7}
        maxDistance={28}
        makeDefault
      />

      {/* x axis: investigative ↔ speculative */}
      <Line points={[[-S, 0, 0], [S, 0, 0]]} color={AXIS_COLORS.x} lineWidth={1} />
      <AxisLabel position={[-S - 0.6, 0, 0]} text="Investigative" color={AXIS_TEXT_COLORS.x} />
      <AxisLabel position={[S + 0.6, 0, 0]} text="Speculative" color={AXIS_TEXT_COLORS.x} />

      {/* y axis: looking to the future ↔ looking to the past */}
      <Line points={[[0, -S, 0], [0, S, 0]]} color={AXIS_COLORS.y} lineWidth={1} />
      <AxisLabel position={[0, S + 0.6, 0]} text="Looking to the Future" color={AXIS_TEXT_COLORS.y} />
      <AxisLabel position={[0, -S - 0.6, 0]} text="Looking to the Past" color={AXIS_TEXT_COLORS.y} />

      {/* z axis: future ↔ past */}
      <Line points={[[0, 0, -S], [0, 0, S]]} color={AXIS_COLORS.z} lineWidth={1} />
      <AxisLabel position={[0, 0, S + 0.6]} text={Z_AXIS_LABELS.pos} color={AXIS_TEXT_COLORS.z} />
      <AxisLabel position={[0, 0, -S - 0.6]} text={Z_AXIS_LABELS.neg} color={AXIS_TEXT_COLORS.z} />

      {/* origin dot */}
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={ACCENTS.coral} />
      </mesh>

      {/* reference grids — XZ (horizontal), XY (front), YZ (side) */}
      <Grid
        args={[S * 2, S * 2]}
        cellSize={S / 4}
        cellThickness={0.4}
        cellColor="#cccaf2"
        sectionSize={S * 2}
        sectionThickness={0}
        fadeDistance={S * 4}
        fadeStrength={2.5}
        infiniteGrid={false}
      />
      <Grid
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[S * 2, S * 2]}
        cellSize={S / 4}
        cellThickness={0.4}
        cellColor="#f2c8d8"
        sectionSize={S * 2}
        sectionThickness={0}
        fadeDistance={S * 4}
        fadeStrength={2.5}
        infiniteGrid={false}
      />
      <Grid
        position={[0, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        args={[S * 2, S * 2]}
        cellSize={S / 4}
        cellThickness={0.4}
        cellColor="#d8ccf2"
        sectionSize={S * 2}
        sectionThickness={0}
        fadeDistance={S * 4}
        fadeStrength={2.5}
        infiniteGrid={false}
      />

      {/* works */}
      {works.map((work) => (
        <WorkNode
          key={work.slug ?? work.label}
          work={work}
          genreId={work.genreId}
          dimmed={!!genreFilter && work.genreId !== genreFilter}
          onHoverChange={handleHoverChange}
        />
      ))}
    </>
  )
}

// ─── 2d table view (mobile / toggle) ──────────────────────────────────────────

const COL = {
  fontFamily: mono,
  fontSize: "calc(10px * var(--ui-scale, 1))",
  letterSpacing: "0.04em",
  padding: "9px 10px",
  verticalAlign: "middle",
  borderBottom: `1px solid ${rgba(ACCENTS.violet, 0.08)}`,
}

/** Tiny inline sparkline for a single axis value */
function CoordSpark({ value, accent }) {
  const pct = ((value + 1) / 2) * 100
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", opacity: 0.55 }}>
      <div style={{ width: "36px", height: "2px", background: "#e8e8e8", borderRadius: "1px", position: "relative", flexShrink: 0 }}>
        <div style={{
          position: "absolute",
          left: `${Math.min(pct, 50)}%`,
          width: `${Math.abs(pct - 50)}%`,
          top: 0, bottom: 0,
          background: accent,
          borderRadius: "1px",
        }} />
        <div style={{
          position: "absolute",
          left: `${pct}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "4px",
          height: "4px",
          borderRadius: "50%",
          background: accent,
        }} />
      </div>
      <span style={{ fontFamily: mono, fontSize: "8px", color: TEXT.tertiary, letterSpacing: "0.02em" }}>
        {value.toFixed(2)}
      </span>
    </div>
  )
}

function Quadrant2DView({ genreFilter, inset = false }) {
  const works = useMemo(() => collectWorks(), [])
  const visible = genreFilter ? works.filter((w) => w.genreId === genreFilter) : works

  const th = (extra = {}) => ({
    ...COL,
    borderBottom: `1px solid ${rgba(ACCENTS.violet, 0.15)}`,
    color: TEXT.tertiary,
    fontSize: "calc(8.5px * var(--ui-scale, 1))",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "6px 10px 8px",
    fontWeight: 400,
    whiteSpace: "nowrap",
    ...extra,
  })

  return (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{
        zIndex: 1,
        paddingBottom: "3.5rem",
        // desktop: stay clear of the document-stats panel (left) and genre tabs (right)
        paddingLeft: inset ? "clamp(310px, 26vw, 410px)" : 0,
        paddingRight: inset ? "clamp(240px, 20vw, 300px)" : 0,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 2 }}>
          <tr>
            {/* primary info — left */}
            <th style={th({ paddingLeft: "1.25rem" })}>Title</th>
            <th style={th()}>Genre</th>
            <th style={th()}>Year</th>
            {/* 3d coords — right, dimmer */}
            <th style={th({ color: rgba(AXIS_TEXT_COLORS.x, 0.55), textAlign: "right" })}>x</th>
            <th style={th({ color: rgba(AXIS_TEXT_COLORS.y, 0.55), textAlign: "right" })}>y</th>
            <th style={th({ color: rgba(AXIS_TEXT_COLORS.z, 0.55), textAlign: "right", paddingRight: "1.25rem" })}>z</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((work) => {
            const accent = genreColor(work.genreId)
            const textAccent = genreTextColor(work.genreId)
            const label = work.planeLabel ?? work.label
            return (
              <tr
                key={work.slug ?? work.label}
                style={{ transition: "background 0.1s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = rgba(accent, 0.04)}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {/* title */}
                <td style={{ ...COL, paddingLeft: "1.25rem" }}>
                  {work.slug ? (
                    <a
                      href={`/art/${work.slug}`}
                      style={{
                        fontFamily: displayMono,
                        fontSize: "calc(13px * var(--ui-scale, 1))",
                        fontStyle: "italic",
                        letterSpacing: "0.03em",
                        color: TEXT.primary,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = textAccent}
                      onMouseLeave={(e) => e.currentTarget.style.color = TEXT.primary}
                    >
                      {label}
                    </a>
                  ) : (
                    <span style={{
                      fontFamily: displayMono,
                      fontSize: "calc(13px * var(--ui-scale, 1))",
                      letterSpacing: "0.03em",
                      color: TEXT.secondary,
                      whiteSpace: "nowrap",
                    }}>
                      {label}
                    </span>
                  )}
                </td>
                {/* genre */}
                <td style={{ ...COL, whiteSpace: "nowrap" }}>
                  <span style={{
                    fontFamily: mono,
                    fontSize: "calc(8.5px * var(--ui-scale, 1))",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: textAccent,
                  }}>
                    {work.genreId}
                  </span>
                </td>
                {/* year */}
                <td style={{ ...COL, color: TEXT.secondary, whiteSpace: "nowrap" }}>
                  {work.date ? work.date.slice(0, 4) : "—"}
                </td>
                {/* coords — subtle, pushed right */}
                <td style={{ ...COL, textAlign: "right" }}>
                  <CoordSpark value={work.x} accent={AXIS_COLORS.x} />
                </td>
                <td style={{ ...COL, textAlign: "right" }}>
                  <CoordSpark value={work.y} accent={AXIS_COLORS.y} />
                </td>
                <td style={{ ...COL, textAlign: "right", paddingRight: "1.25rem" }}>
                  <CoordSpark value={work.z ?? 0} accent={AXIS_COLORS.z} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── 2d flattened planes: the 3d space projected onto three quadrant charts ──
// Each panel is one projection (x·y, x·z, z·y); the same work appears in all
// three, and hovering it draws a link line connecting its dots across panels.

const FLAT_PLANES = [
  { id: "xy", ax: "x", ay: "y", title: "x · y",
    left: "Investigative", right: "Speculative", top: "Future", bottom: "Past" },
  { id: "xz", ax: "x", ay: "z", title: "x · z",
    left: "Investigative", right: "Speculative", top: "Human", bottom: "Machine" },
  { id: "zy", ax: "z", ay: "y", title: "z · y",
    left: "Machine", right: "Human", top: "Future", bottom: "Past" },
]

const FLAT_END_LABEL = {
  position: "absolute",
  fontFamily: mono,
  fontSize: "calc(8px * var(--ui-scale, 1))",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  pointerEvents: "none",
}

function FlatPanel({ plane, works, genreFilter, hoverKey, setHoverKey }) {
  const hAccent = AXIS_TEXT_COLORS[plane.ax]
  const vAccent = AXIS_TEXT_COLORS[plane.ay]
  return (
    <div style={{ flex: "1 1 0", minWidth: 0 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "18px",
          border: "none",
          background: "#f0f0f3",
          boxShadow:
            "inset 7px 7px 14px rgba(163,163,168,0.45), inset -7px -7px 14px rgba(255,255,255,0.85)",
        }}
      >
        {/* axis lines */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "1px", background: rgba(AXIS_COLORS[plane.ax], 0.35) }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "1px", background: rgba(AXIS_COLORS[plane.ay], 0.35) }} />
        {/* axis end labels */}
        <span style={{ ...FLAT_END_LABEL, left: "6px", top: "50%", transform: "translateY(-140%)", color: hAccent }}>{plane.left}</span>
        <span style={{ ...FLAT_END_LABEL, right: "6px", top: "50%", transform: "translateY(-140%)", color: hAccent }}>{plane.right}</span>
        <span style={{ ...FLAT_END_LABEL, left: "50%", top: "6px", transform: "translateX(8px)", color: vAccent }}>{plane.top}</span>
        <span style={{ ...FLAT_END_LABEL, left: "50%", bottom: "6px", transform: "translateX(8px)", color: vAccent }}>{plane.bottom}</span>

        {/* works scattered by this projection's two coords */}
        {works.map((w) => {
          const key = w.slug ?? w.label
          const dimmed = !!genreFilter && w.genreId !== genreFilter
          const accent = genreColor(w.genreId)
          const hovered = hoverKey === key
          const Tag = w.slug ? "a" : "span"
          const thumb = w.slug && w.image ? `/images/thumbs/${w.slug}.jpg` : w.image
          return (
            <Tag
              key={key}
              data-flat-key={key}
              href={w.slug ? `/art/${w.slug}` : undefined}
              onMouseEnter={() => !dimmed && setHoverKey(key)}
              onMouseLeave={() => setHoverKey(null)}
              style={{
                position: "absolute",
                left: `${toPercent(w[plane.ax] ?? 0)}%`,
                top: `${toPercent(w[plane.ay] ?? 0, true)}%`,
                transform: "translate(-50%, -50%)",
                display: "block",
                zIndex: hovered ? 6 : 2,
                pointerEvents: dimmed ? "none" : "auto",
                opacity: dimmed ? 0.15 : 1,
                filter: dimmed ? "grayscale(1)" : "none",
                transition: "opacity 0.2s ease, filter 0.2s ease",
              }}
            >
              {thumb ? (
                <div
                  className="dither-thumb"
                  style={{
                    width: hovered ? "54px" : "38px",
                    height: hovered ? "37px" : "26px",
                    ...glassNode(accent),
                    padding: 0,
                    boxShadow: hovered
                      ? `0 0 24px 6px ${rgba(accent, 0.45)}`
                      : `0 0 14px 3px ${rgba(accent, 0.22)}`,
                    transition: "width 0.12s ease, height 0.12s ease, box-shadow 0.15s ease",
                  }}
                >
                  <img src={thumb} alt="" decoding="async" />
                </div>
              ) : (
                <span
                  style={{
                    display: "block",
                    width: hovered ? "13px" : "9px",
                    height: hovered ? "13px" : "9px",
                    borderRadius: "50%",
                    background: accent,
                    boxShadow: hovered ? `0 0 16px 2px ${rgba(accent, 0.55)}` : "none",
                    transition: "width 0.12s ease, height 0.12s ease",
                  }}
                />
              )}
              {hovered && (
                <>
                  <span
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 6px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontFamily: displayMono,
                      fontStyle: "italic",
                      fontSize: "calc(12px * var(--ui-scale, 1))",
                      letterSpacing: "0.04em",
                      color: TEXT.primary,
                      padding: "3px 10px",
                      whiteSpace: "nowrap",
                      zIndex: 7,
                      ...glassNode(accent),
                    }}
                  >
                    {w.planeLabel ?? w.label}
                  </span>
                  {/* same info card as the 3d node hover */}
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "max-content",
                      zIndex: 7,
                    }}
                  >
                    <WorkHoverCard work={w} accent={accent} />
                  </div>
                </>
              )}
            </Tag>
          )
        })}
      </div>
      <p
        style={{
          marginTop: "0.6rem",
          textAlign: "center",
          fontFamily: mono,
          fontSize: "calc(9px * var(--ui-scale, 1))",
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: TEXT.tertiary,
        }}
      >
        {plane.title}
      </p>
    </div>
  )
}

function FlatPlanesView({ genreFilter }) {
  const works = useMemo(() => collectWorks(), [])
  const containerRef = useRef(null)
  const [hoverKey, setHoverKey] = useState(null)
  const [linePts, setLinePts] = useState(null)

  // Link line between the hovered work's dots across the three panels —
  // measured from the DOM so it stays correct at any container size.
  useEffect(() => {
    if (!hoverKey || !containerRef.current) {
      setLinePts(null)
      return
    }
    const contRect = containerRef.current.getBoundingClientRect()
    const els = containerRef.current.querySelectorAll(`[data-flat-key="${CSS.escape(hoverKey)}"]`)
    const pts = [...els].map((el) => {
      const r = el.getBoundingClientRect()
      return [r.left + r.width / 2 - contRect.left, r.top + r.height / 2 - contRect.top]
    })
    setLinePts(pts.length > 1 ? pts : null)
  }, [hoverKey])

  const hoveredWork = hoverKey ? works.find((w) => (w.slug ?? w.label) === hoverKey) : null
  const lineColor = hoveredWork ? genreColor(hoveredWork.genreId) : "#999999"

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          height: "100%",
          minHeight: "100%",
          gap: "clamp(1rem, 2.5vw, 2rem)",
          // clear the document-stats panel (left) and genre tabs (right)
          padding: "2rem clamp(240px, 20vw, 300px) 3rem clamp(310px, 26vw, 410px)",
        }}
      >
        {FLAT_PLANES.map((plane) => (
          <FlatPanel
            key={plane.id}
            plane={plane}
            works={works}
            genreFilter={genreFilter}
            hoverKey={hoverKey}
            setHoverKey={setHoverKey}
          />
        ))}
        {linePts && (
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 4 }}
            aria-hidden="true"
          >
            <polyline
              points={linePts.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke={lineColor}
              strokeWidth="1.2"
              strokeDasharray="5 4"
              opacity="0.75"
            />
            {linePts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="5" fill="none" stroke={lineColor} strokeWidth="1" opacity="0.65" />
            ))}
          </svg>
        )}
      </div>
    </div>
  )
}

// ─── 2d chronology: top-down list of all works ────────────────────────────────

const LINE_X = 92 // px from the column's left edge to the timeline

function ChronologyWork({ work, genreId }) {
  const accent = genreColor(genreId)
  return (
    <div className="relative flex items-center" style={{ marginBottom: "2.2rem" }}>
      {/* year */}
      <span
        className="text-right"
        style={{
          width: `${LINE_X - 20}px`,
          paddingRight: "20px",
          fontFamily: "'403Mesapholic', monospace",
          fontSize: "calc(10px * var(--ui-scale, 1))",
          letterSpacing: "0.12em",
          color: genreTextColor(genreId),
          flexShrink: 0,
        }}
      >
        {work.date ? work.date.slice(0, 4) : "—"}
      </span>

      {/* dot on the line */}
      <span
        className="rounded-full"
        style={{
          position: "absolute",
          left: `${LINE_X}px`,
          width: "8px",
          height: "8px",
          transform: "translateX(-50%)",
          background: accent,
          boxShadow: `0 0 12px ${rgba(accent, 0.45)}`,
        }}
      />

      {/* work card */}
      <div style={{ marginLeft: "28px" }}>
        {work.slug ? (
          <a
            href={`/art/${work.slug}`}
            className="block"
            style={{
              fontFamily: "'403Mesapholic', monospace",
              fontSize: "calc(16px * var(--ui-scale, 1))",
              fontStyle: "italic",
              letterSpacing: "0.04em",
              color: "#0a0a0a",
              background: "#ffffff",
              border: `1px solid ${rgba(accent, 0.35)}`,
              padding: "5px 16px",
              textDecoration: "none",
              boxShadow: `0 0 40px 8px ${rgba(accent, 0.14)}`,
            }}
          >
            {work.label}
          </a>
        ) : (
          <span
            className="block"
            style={{
              fontFamily: "'403Mesapholic', monospace",
              fontSize: "calc(16px * var(--ui-scale, 1))",
              letterSpacing: "0.04em",
              color: TEXT.secondary,
              background: "#f5f5f5",
              border: "1px solid #e0e0e0",
              padding: "5px 16px",
              boxShadow: "0 0 30px 6px rgba(0,0,0,0.05)",
            }}
          >
            {work.label}
          </span>
        )}
      </div>
    </div>
  )
}

function ChronologyView({ layer }) {
  // categories come from the layer's `sections` config (src/data/genres/index.js)
  const sections = layer.sections ?? [
    { id: layer.id, title: null, groups: [{ works: layer.works }] },
  ]

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div
        className="relative mx-auto"
        style={{ width: "min(600px, 92%)", padding: "4rem 0 5rem" }}
      >
        {/* timeline */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${LINE_X}px`,
            top: "3.5rem",
            bottom: "2.5rem",
            width: "2px",
            background: `linear-gradient(180deg, ${ACCENTS.pink}, ${ACCENTS.violet}, ${ACCENTS.magenta})`,
            opacity: 0.55,
          }}
        />

        {sections.map((section) => {
          const groups =
            section.groups ?? [{ title: undefined, works: section.works ?? [] }]

          return (
            <section key={section.id}>
              {section.title && (
                <h2
                  style={{
                    margin: `0 0 1.6rem ${LINE_X + 28}px`,
                    fontFamily: "'403Mesapholic', monospace",
                    fontSize: "calc(13px * var(--ui-scale, 1))",
                    fontWeight: 400,
                    letterSpacing: "0.28em",
                    color: genreTextColor(section.id),
                    textTransform: "uppercase",
                  }}
                >
                  {section.title}
                </h2>
              )}
              {groups.map((group, gi) => (
                <div key={group.title ?? `group-${gi}`}>
                  {group.title && (
                    <h3
                      style={{
                        margin: `0 0 1.2rem ${LINE_X + 28}px`,
                        fontFamily: "'403Mesapholic', monospace",
                        fontSize: "calc(11px * var(--ui-scale, 1))",
                        fontWeight: 400,
                        letterSpacing: "0.22em",
                        color: TEXT.tertiary,
                        textTransform: "uppercase",
                      }}
                    >
                      {group.title}
                    </h3>
                  )}
                  {group.works.map((work, wi) => (
                    <ChronologyWork
                      key={work.slug ?? `${work.label}-${wi}`}
                      work={work}
                      genreId={section.id}
                    />
                  ))}
                </div>
              ))}
              <div style={{ height: "1.6rem" }} />
            </section>
          )
        })}
      </div>
    </div>
  )
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function HomeQuadrantView({ layers = genreLayers, showGenreNav = layers.length > 1 }) {
  const [genreFilter, setGenreFilter] = useState(null)
  // true once the WebGL canvas exists — until then show the same loading
  // label as the server-rendered fallback, so there's no blank gap between
  // hydration and the first 3d frame
  const [canvasReady, setCanvasReady] = useState(false)
  // true once every node thumbnail is in the browser cache, so the scene
  // appears with its images instead of popping them in one by one
  const [imagesReady, setImagesReady] = useState(false)
  // grab/grabbing cursor on the 3d canvas — signals it's draggable to orbit,
  // same affordance as the "drag to orbit" hint below it
  const [isDragging, setIsDragging] = useState(false)
  useEffect(() => {
    const srcs = collectWorks()
      .filter((w) => w.slug && w.image)
      .map((w) => `/images/thumbs/${w.slug}.jpg`)
    let cancelled = false
    Promise.all(
      srcs.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image()
            img.onload = resolve
            img.onerror = resolve
            img.src = src
          }),
      ),
    ).then(() => {
      if (!cancelled) setImagesReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])
  const isMobile = useIsMobile()
  // mobile: table/3d toggle · desktop: 3d / 2d planes / table switcher
  const [mobileView, setMobileView] = useState("table") // "table" | "3d"
  const [desktopView, setDesktopView] = useState("3d") // "3d" | "2d" | "table"
  const viewMode = isMobile ? mobileView : desktopView

  const isSingleChronology =
    layers.length === 1 && layers[0].layout === "chronology"

  const genreButtons = genreLayers.filter((l) => l.id !== "all")
  const showDiagram = !isSingleChronology
  const showToggle = showDiagram && isMobile
  const showDomStats = showDiagram && !isMobile

  const toggleView = () => {
    setMobileView((v) => v === "table" ? "3d" : "table")
  }

  return (
    <div
      id="home-quadrant"
      className="fixed left-0 right-0 bottom-0 bg-white"
      style={{ top: "2.5rem", height: "calc(100vh - 2.5rem)", width: "100%" }}
    >

      {/* backdrop text behind the 3d canvas */}
      {showDiagram && viewMode === "3d" && !isMobile && (
        <div
          aria-hidden="true"
          className="quadrant-backdrop absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ overflow: "hidden" }}
        >
          <span
            style={{
              fontFamily: "'403Mesapholic', monospace",
              fontSize: "clamp(4rem, 12vw, 13rem)",
              fontWeight: 400,
              letterSpacing: "0.06em",
              lineHeight: 0.95,
              textAlign: "center",
              textTransform: "uppercase",
              whiteSpace: "pre-line",
              opacity: 0.5,
              color: "transparent",
              background: "linear-gradient(175deg, #f4f4f4 0%, #d8d8d8 30%, #efefef 48%, #c9c9c9 55%, #e6e6e6 75%, #d2d2d2 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: "drop-shadow(-1px -1px 0 rgba(255, 255, 255, 0.9)) drop-shadow(1px 2px 1px rgba(10, 10, 10, 0.18))",
              textRendering: "geometricPrecision",
              WebkitFontSmoothing: "antialiased",
            }}
          >
            {"selected\nwork"}
          </span>
        </div>
      )}

      {isSingleChronology ? (
        <ChronologyView layer={layers[0]} />
      ) : viewMode === "table" ? (
        <Quadrant2DView genreFilter={genreFilter} inset={!isMobile} />
      ) : viewMode === "2d" ? (
        <FlatPlanesView genreFilter={genreFilter} />
      ) : (
        <>
          {!(canvasReady && imagesReady) && (
            <span className="home-quadrant-loading">loading selected work…</span>
          )}
          <Canvas
            camera={{ position: [9, 6, 13], fov: 48 }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            dpr={[1, 1.5]}
            style={{
              background: "transparent",
              position: "relative",
              zIndex: 1,
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onCreated={() => setCanvasReady(true)}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            onPointerLeave={() => setIsDragging(false)}
          >
            <Scene genreFilter={genreFilter} />
          </Canvas>
        </>
      )}

      {showDomStats && <DomStatsPanel />}

      {/* desktop view switcher: 3d / 2d planes / table */}
      {showDiagram && !isMobile && (
        <div
          className="absolute"
          style={{
            bottom: "0.75rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            display: "flex",
            ...glassPlain,
          }}
        >
          {[
            { id: "3d", label: "3d" },
            { id: "2d", label: "2d planes" },
            { id: "table", label: "table" },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setDesktopView(v.id)}
              aria-pressed={viewMode === v.id}
              style={{
                fontFamily: mono,
                fontSize: "calc(9px * var(--ui-scale, 1))",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: viewMode === v.id ? TEXT.primary : TEXT.tertiary,
                padding: "0.55rem 0.9rem",
                cursor: "pointer",
                background: "transparent",
                border: "none",
                borderBottom: viewMode === v.id ? `2px solid ${ACCENTS.violet}` : "2px solid transparent",
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* 2d / 3d toggle */}
      {showToggle && (
        <button
          type="button"
          onClick={toggleView}
          aria-pressed={viewMode === "2d"}
          aria-label={viewMode === "2d" ? "Switch to 3D view" : "Switch to 2D view"}
          className="absolute"
          style={{
            bottom: isMobile ? "3.25rem" : "0.75rem",
            right: showGenreNav && !isMobile ? "clamp(140px, 20vw, 240px)" : "1rem",
            zIndex: 5,
            fontFamily: mono,
            fontSize: "calc(9px * var(--ui-scale, 1))",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: TEXT.secondary,
            padding: "0.55rem 0.85rem",
            cursor: "pointer",
            ...glassPlain,
          }}
        >
          {viewMode === "table" ? "view · 3d" : "view · table"}
        </button>
      )}

      {/* genre filter — floats over canvas */}
      {showGenreNav && showDiagram && (
        <nav
          className={
            isMobile
              ? "absolute left-0 right-0 bottom-0 flex flex-row justify-center gap-3 px-3 py-2"
              : "absolute top-0 right-0 bottom-0 flex flex-col justify-center gap-1 pr-8"
          }
          style={
            isMobile
              ? {
                  pointerEvents: "auto",
                  zIndex: 4,
                  borderTop: `1px solid ${rgba(ACCENTS.violet, 0.22)}`,
                  ...glassPlain,
                }
              : {
                  minWidth: "clamp(120px, 18vw, 220px)",
                  paddingLeft: "clamp(2rem, 5vw, 4rem)",
                  borderLeft: `1px solid ${rgba(ACCENTS.violet, 0.22)}`,
                  pointerEvents: "auto",
                  zIndex: 2,
                }
          }
          aria-label="Genre filter"
        >
          {[{ id: null, title: "All" }, ...genreButtons].map((item) => {
            const active = genreFilter === item.id || (item.id === null && !genreFilter)
            return (
              <button
                key={item.id ?? "all"}
                type="button"
                onClick={() => setGenreFilter(active && item.id !== null ? null : item.id)}
                style={{
                  fontFamily: "Times, 'Times New Roman', serif",
                  color: active ? TEXT.primary : TEXT.tertiary,
                  fontSize: active
                    ? isMobile ? "0.78rem" : "clamp(0.85rem, 1.5vw, 1.05rem)"
                    : isMobile ? "0.68rem" : "clamp(0.7rem, 1.1vw, 0.85rem)",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.08em",
                  lineHeight: 1.1,
                  padding: isMobile ? "0.1rem 0" : "0.12rem 0",
                  paddingBottom: active ? (isMobile ? "calc(0.1rem - 1px)" : "calc(0.12rem - 1px)") : (isMobile ? "0.1rem" : "0.12rem"),
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: active ? `1px solid ${TEXT.primary}` : "none",
                  textAlign: isMobile ? "center" : "right",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease, font-size 0.35s ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = TEXT.primary }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = TEXT.tertiary }}
              >
                {item.title}
              </button>
            )
          })}
        </nav>
      )}

      {/* hint */}
      {showDiagram && viewMode === "3d" && !isMobile && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            fontFamily: "'403Mesapholic', monospace",
            fontSize: "calc(10px * var(--ui-scale, 1))",
            letterSpacing: "0.14em",
            color: TEXT.tertiary,
          }}
        >
          <span style={{ color: TEXT_ACCENTS.pink, fontWeight: 500 }}>drag</span>
          {" "}to orbit ·{" "}
          <span style={{ color: TEXT_ACCENTS.violet, fontWeight: 500 }}>scroll</span>
          {" "}to zoom
        </div>
      )}
    </div>
  )
}
