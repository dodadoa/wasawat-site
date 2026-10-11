import { Canvas } from "@react-three/fiber"
import { OrbitControls, Html, Line, Grid } from "@react-three/drei"
import { EffectComposer } from "@react-three/postprocessing"
import { Effect } from "postprocessing"
import { Color, Uniform } from "three"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { genreLayers, XY_SCALE, Z_AXIS_LABELS, QUADRANT_LABELS } from "../data/homeQuadrant3d.js"
import { INK, SOFT, LINE, PAPER, RED, HALO, TEXT, genreColor } from "../data/homeColors.js"
import { workQuadrantMeta } from "../utils/quadrantWorkMeta.js"
import { glassNode } from "./home/panelChrome.jsx"
import DomStatsPanel from "./home/DomStatsPanel.jsx"

const S = XY_SCALE
// four voices: pixel labels, display titles, data mono for numbers
const mono = "'DepartureMono', monospace"
const displayMono = "'403Mesapholic', monospace"
const dataMono = "'PragmataPro Mono', ui-monospace, Menlo, monospace"
// a little over-inked bloom on label text: a tight spread plus a faint wide one
const BLOOM = "0 0 1px rgba(20,20,20,0.55), 0 0 7px rgba(20,20,20,0.32)"
const STACK = `6px 6px 0 -1px ${PAPER}, 6px 6px 0 0 ${LINE}`
const STACK_HI = `5px 5px 0 -1px ${PAPER}, 5px 5px 0 0 ${INK}`

// ─── 1-bit pass for the 3d canvas ─────────────────────────────────────────────
// The scene is drawn at half resolution and every pixel is thresholded
// against an 8×8 Bayer matrix: ink or paper, nothing in between. Greys in the
// scene (the reference grids, antialiased edges) come out as dither density.
const BAYER_FRAG = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uPaper;
  float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float span = max(uPaper.g - uInk.g, 0.0001);
    float darkness = clamp((uPaper.g - inputColor.g) / span, 0.0, 1.0);
    float threshold = bayer8(gl_FragCoord.xy) + 1.0 / 128.0;
    outputColor = vec4(darkness > threshold ? uInk : uPaper, 1.0);
  }
`

class BayerDitherEffect extends Effect {
  constructor() {
    super("BayerDitherEffect", BAYER_FRAG, {
      uniforms: new Map([
        ["uInk", new Uniform(new Color(INK))],
        ["uPaper", new Uniform(new Color(PAPER))],
      ]),
    })
  }
}

function BayerDither() {
  const effect = useMemo(() => new BayerDitherEffect(), [])
  return <primitive object={effect} dispose={null} />
}
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

const AxisLabel = memo(function AxisLabel({ position, text }) {
  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <span style={{
        fontFamily: mono,
        fontSize: "calc(12px * var(--ui-scale, 1))",
        fontWeight: 400,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: INK,
        textShadow: HALO,
        whiteSpace: "nowrap",
      }}>
        {text}
      </span>
    </Html>
  )
})

const QuadrantLegend = memo(function QuadrantLegend({ x, y, label }) {
  return (
    <Html position={[x * S, y * S, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <span style={{
        fontFamily: mono,
        fontSize: "calc(11px * var(--ui-scale, 1))",
        fontWeight: 400,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: SOFT,
        textShadow: HALO,
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
        .quadrant-hover-meta { font-size: 11px; }
        @media (min-width: 1600px) {
          .quadrant-hover-meta { font-size: 12px; }
        }
      `}</style>
      <div
        className="quadrant-hover-meta"
        style={{
          fontFamily: dataMono,
          color: SOFT,
          lineHeight: 1.6,
        }}
      >
        <div>{meta.xAxis} · {meta.yAxis} · {meta.zAxis}</div>
        <div style={{ color: INK, marginTop: "4px" }}>
          x {meta.coords.x} · y {meta.coords.y} · z {meta.coords.z}
        </div>
      </div>
    </div>
  )
}

const WorkNode = memo(function WorkNode({ work, genreId, dimmed, onHoverChange }) {
  const [hovered, setHovered] = useState(false)
  const accent = genreColor(genreId)
  const color = dimmed ? LINE : accent
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
        <meshBasicMaterial color={color} toneMapped={false} />
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
                    background: "#fff",
                    padding: 0,
                  }}
                >
                  <img src={thumb} alt="" decoding="async" />
                </div>
              )}
              <span
                style={{
                  display: "block",
                  fontFamily: displayMono,
                  fontSize: "calc(15px * var(--ui-scale, 1))",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  color: INK,
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
                    background: "#fff",
                    padding: 0,
                  }}
                >
                  <img src={thumb} alt="" decoding="async" />
                </div>
              )}
              <span
                style={{
                  display: "block",
                  fontFamily: displayMono,
                  fontSize: "calc(15px * var(--ui-scale, 1))",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  color: SOFT,
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
      {/* opaque paper ground so the dither pass sees ink-on-paper */}
      <color attach="background" args={[PAPER]} />
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
      <Line points={[[-S, 0, 0], [S, 0, 0]]} color={INK} lineWidth={1.5} />
      <AxisLabel position={[-S - 0.6, 0, 0]} text="Investigative" />
      <AxisLabel position={[S + 0.6, 0, 0]} text="Speculative" />

      {/* y axis: looking to the future ↔ looking to the past */}
      <Line points={[[0, -S, 0], [0, S, 0]]} color={INK} lineWidth={1.5} />
      <AxisLabel position={[0, S + 0.6, 0]} text="Looking to the Future" />
      <AxisLabel position={[0, -S - 0.6, 0]} text="Looking to the Past" />

      {/* z axis: future ↔ past */}
      <Line points={[[0, 0, -S], [0, 0, S]]} color={INK} lineWidth={1.5} />
      <AxisLabel position={[0, 0, S + 0.6]} text={Z_AXIS_LABELS.pos} />
      <AxisLabel position={[0, 0, -S - 0.6]} text={Z_AXIS_LABELS.neg} />

      {/* origin dot */}
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={INK} toneMapped={false} />
      </mesh>

      {/* reference grids — XZ (horizontal), XY (front), YZ (side) */}
      <Grid
        args={[S * 2, S * 2]}
        cellSize={S / 4}
        cellThickness={0.4}
        cellColor={LINE}
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
        cellColor={LINE}
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
        cellColor={LINE}
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

      <EffectComposer multisampling={0} disableNormalPass>
        <BayerDither />
      </EffectComposer>
    </>
  )
}

// ─── 2d table view (mobile / toggle) ──────────────────────────────────────────

const COL = {
  fontFamily: mono,
  fontSize: "calc(11px * var(--ui-scale, 1))",
  letterSpacing: "0.04em",
  padding: "14px 8px",
  verticalAlign: "middle",
  borderTop: `1px solid ${LINE}`,
}

/** Tiny inline bar for a single axis value: hairline track, ink fill, ink marker */
function CoordSpark({ value }) {
  const pct = ((value + 1) / 2) * 100
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <div style={{ width: "32px", height: "4px", background: "var(--dither-12)", position: "relative", flexShrink: 0 }}>
        <div style={{
          position: "absolute",
          left: `${Math.min(pct, 50)}%`,
          width: `${Math.abs(pct - 50)}%`,
          top: 0, bottom: 0,
          background: INK,
        }} />
        <div style={{
          position: "absolute",
          left: `${pct}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "1px",
          height: "10px",
          background: INK,
        }} />
      </div>
      <span style={{ fontFamily: dataMono, fontSize: "calc(10px * var(--ui-scale, 1))", color: SOFT, minWidth: "4.2ch", textAlign: "right" }}>
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
    borderTop: "none",
    borderBottom: `1px solid ${INK}`,
    color: SOFT,
    fontSize: "calc(11px * var(--ui-scale, 1))",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "10px 10px 10px",
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
        <thead style={{ position: "sticky", top: 0, background: PAPER, zIndex: 2 }}>
          <tr>
            {/* primary info — left */}
            <th style={th({ paddingLeft: "1.25rem" })}>Title</th>
            <th style={th()}>Genre</th>
            <th style={th()}>Year</th>
            {/* 3d coords — right, dimmer */}
            <th style={th({ textAlign: "right" })}>x</th>
            <th style={th({ textAlign: "right" })}>y</th>
            <th style={th({ textAlign: "right", paddingRight: "1.25rem" })}>z</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((work) => {
            const label = work.planeLabel ?? work.label
            return (
              <tr
                key={work.slug ?? work.label}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = `inset 3px 0 0 ${INK}`}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
              >
                {/* title */}
                <td style={{ ...COL, paddingLeft: "1.25rem" }}>
                  {work.slug ? (
                    <a
                      href={`/art/${work.slug}`}
                      style={{
                        fontFamily: displayMono,
                        fontSize: "calc(16px * var(--ui-scale, 1))",
                        letterSpacing: "-0.01em",
                        color: INK,
                        textDecoration: "none",
                        padding: "2px 4px",
                        margin: "0 -4px",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = INK }}
                    >
                      {label}
                    </a>
                  ) : (
                    <span style={{
                      fontFamily: displayMono,
                      fontSize: "calc(16px * var(--ui-scale, 1))",
                      letterSpacing: "-0.01em",
                      color: SOFT,
                    }}>
                      {label}
                    </span>
                  )}
                </td>
                {/* genre */}
                <td style={{ ...COL, whiteSpace: "nowrap" }}>
                  <span style={{
                    fontFamily: mono,
                    fontSize: "calc(11px * var(--ui-scale, 1))",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: SOFT,
                  }}>
                    {work.genreId}
                  </span>
                </td>
                {/* year */}
                <td style={{ ...COL, fontFamily: dataMono, color: SOFT, whiteSpace: "nowrap" }}>
                  {work.date ? work.date.slice(0, 4) : "—"}
                </td>
                {/* coords — subtle, pushed right */}
                <td style={{ ...COL, textAlign: "right" }}>
                  <CoordSpark value={work.x} />
                </td>
                <td style={{ ...COL, textAlign: "right" }}>
                  <CoordSpark value={work.y} />
                </td>
                <td style={{ ...COL, textAlign: "right", paddingRight: "1.25rem" }}>
                  <CoordSpark value={work.z ?? 0} />
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
  fontSize: "calc(10px * var(--ui-scale, 1))",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  color: SOFT,
}

function FlatPanel({ plane, works, genreFilter, hoverKey, setHoverKey }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          border: `1px solid ${LINE}`,
          background: `color-mix(in srgb, ${PAPER} 80%, transparent)`,
          boxShadow: STACK,
        }}
      >
        {/* axis lines */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "1px", background: LINE }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "1px", background: LINE }} />
        {/* axis end labels */}
        <span style={{ ...FLAT_END_LABEL, left: "6px", top: "50%", transform: "translateY(-140%)" }}>{plane.left}</span>
        <span style={{ ...FLAT_END_LABEL, right: "6px", top: "50%", transform: "translateY(-140%)" }}>{plane.right}</span>
        <span style={{ ...FLAT_END_LABEL, left: "50%", top: "6px", transform: "translateX(8px)" }}>{plane.top}</span>
        <span style={{ ...FLAT_END_LABEL, left: "50%", bottom: "6px", transform: "translateX(8px)" }}>{plane.bottom}</span>

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
                visibility: dimmed ? "hidden" : "visible",
              }}
            >
              {thumb ? (
                <div
                  className="dither-thumb"
                  style={{
                    width: hovered ? "54px" : "38px",
                    height: hovered ? "37px" : "26px",
                    ...glassNode(accent),
                    background: "#fff",
                    padding: 0,
                    boxShadow: hovered ? STACK_HI : "none",
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
                      fontSize: "calc(14px * var(--ui-scale, 1))",
                      letterSpacing: "-0.01em",
                      color: INK,
                      textShadow: BLOOM,
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
          marginTop: "1.1rem",
          textAlign: "left",
          fontFamily: mono,
          fontSize: "calc(12px * var(--ui-scale, 1))",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: SOFT,
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

  const lineColor = RED

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
              strokeWidth="1"
              strokeDasharray="4 4"
              shapeRendering="crispEdges"
            />
            {linePts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="5" fill="none" stroke={lineColor} strokeWidth="1" />
            ))}
          </svg>
        )}
      </div>
    </div>
  )
}

// ─── 2d chronology: top-down list of all works ────────────────────────────────

const LINE_X = 92 // px from the column's left edge to the timeline

function ChronologyWork({ work }) {
  const cardBase = {
    fontFamily: displayMono,
    fontSize: "calc(18px * var(--ui-scale, 1))",
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
    padding: "8px 16px",
    background: `color-mix(in srgb, ${PAPER} 80%, transparent)`,
  }
  return (
    <div className="relative flex items-center" style={{ marginBottom: "2.2rem" }}>
      {/* year */}
      <span
        className="text-right"
        style={{
          width: `${LINE_X - 20}px`,
          paddingRight: "20px",
          fontFamily: dataMono,
          fontSize: "calc(12px * var(--ui-scale, 1))",
          color: SOFT,
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
          width: "9px",
          height: "9px",
          transform: "translateX(-50%)",
          background: work.slug ? INK : PAPER,
          border: `1px solid ${INK}`,
        }}
      />

      {/* work card */}
      <div style={{ marginLeft: "28px" }}>
        {work.slug ? (
          <a
            href={`/art/${work.slug}`}
            className="block"
            style={{
              ...cardBase,
              color: INK,
              border: `1px solid ${INK}`,
              textDecoration: "none",
              boxShadow: STACK,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER }}
            onMouseLeave={(e) => { e.currentTarget.style.background = cardBase.background; e.currentTarget.style.color = INK }}
          >
            {work.label}
          </a>
        ) : (
          <span
            className="block"
            style={{
              ...cardBase,
              color: SOFT,
              border: `1px dashed ${SOFT}`,
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
            width: "1px",
            background: INK,
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
                    fontFamily: mono,
                    fontSize: "calc(15px * var(--ui-scale, 1))",
                    fontWeight: 400,
                    letterSpacing: "0.12em",
                    color: INK,
                    textTransform: "uppercase",
                    filter: "none",
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
                        fontFamily: mono,
                        fontSize: "calc(12px * var(--ui-scale, 1))",
                        fontWeight: 400,
                        letterSpacing: "0.1em",
                        color: SOFT,
                        textTransform: "uppercase",
                        filter: "none",
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
      className="fixed left-0 right-0 bottom-0"
      style={{ top: "2.5rem", height: "calc(100vh - 2.5rem)", width: "100%" }}
    >

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
            // .quadrant-3d switches the site-wide text bloom off for the labels
            className="quadrant-3d"
            flat
            gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
            // half resolution, shown with hard pixels: the Bayer pass in
            // <Scene> leaves only ink and paper
            dpr={0.5}
            style={{
              background: "transparent",
              position: "relative",
              zIndex: 1,
              imageRendering: "pixelated",
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
            background: PAPER,
          }}
        >
          {[
            { id: "3d", label: "3d" },
            { id: "2d", label: "2d planes" },
            { id: "table", label: "table" },
          ].map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setDesktopView(v.id)}
              aria-pressed={viewMode === v.id}
              style={{
                fontFamily: mono,
                fontSize: "calc(12px * var(--ui-scale, 1))",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                // a strip of cells sharing borders; the pressed one is inverted
                color: viewMode === v.id ? PAPER : INK,
                background: viewMode === v.id ? INK : "transparent",
                padding: "0.6rem 1rem",
                cursor: "pointer",
                border: `1px solid ${INK}`,
                marginLeft: i === 0 ? 0 : "-1px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = viewMode === v.id ? INK : "transparent"
                e.currentTarget.style.color = viewMode === v.id ? PAPER : INK
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
            fontSize: "calc(12px * var(--ui-scale, 1))",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: INK,
            padding: "0.6rem 0.9rem",
            cursor: "pointer",
            background: PAPER,
            border: `1px solid ${INK}`,
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
              ? "absolute left-0 right-0 bottom-0 flex flex-row justify-start overflow-x-auto"
              : "absolute top-0 right-0 bottom-0 flex flex-col justify-center pr-8"
          }
          style={
            isMobile
              ? {
                  pointerEvents: "auto",
                  zIndex: 4,
                  borderTop: `1px solid ${LINE}`,
                  background: PAPER,
                }
              : {
                  minWidth: "clamp(150px, 18vw, 240px)",
                  paddingLeft: "clamp(1.25rem, 2.5vw, 2rem)",
                  borderLeft: `1px solid ${LINE}`,
                  // an opaque paper column, like the stats panel opposite
                  background: PAPER,
                  pointerEvents: "auto",
                  zIndex: 2,
                }
          }
          aria-label="Genre filter"
        >
          {[{ id: null, title: "All" }, ...genreButtons].map((item, i) => {
            const active = genreFilter === item.id || (item.id === null && !genreFilter)
            return (
              <button
                key={item.id ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setGenreFilter(active && item.id !== null ? null : item.id)}
                style={{
                  display: "flex",
                  gap: "0.9em",
                  alignItems: "baseline",
                  fontFamily: mono,
                  // rows separated by a hairline on top; selected = inverted
                  color: active ? PAPER : INK,
                  backgroundColor: active ? INK : "transparent",
                  fontSize: "calc(12px * var(--ui-scale, 1))",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                  padding: isMobile ? "0.7rem 0.9rem" : "0.7rem 0.6rem",
                  cursor: "pointer",
                  border: "none",
                  borderTop: isMobile ? "none" : `1px solid ${LINE}`,
                  borderLeft: isMobile && i > 0 ? `1px solid ${LINE}` : "none",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = INK; e.currentTarget.style.color = PAPER }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = active ? INK : "transparent"
                  e.currentTarget.style.color = active ? PAPER : INK
                }}
              >
                {!isMobile && (
                  <span style={{ fontFamily: dataMono, opacity: 1 }}>
                    {String(i).padStart(2, "0")} →
                  </span>
                )}
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
            fontFamily: mono,
            fontSize: "calc(11px * var(--ui-scale, 1))",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: SOFT,
            bottom: "3.6rem",
            whiteSpace: "nowrap",
            // above the (now opaque) canvas
            zIndex: 3,
          }}
        >
          <span style={{ background: INK, color: PAPER, padding: "1px 5px" }}>drag</span>
          {" "}to orbit ·{" "}
          <span style={{ background: INK, color: PAPER, padding: "1px 5px" }}>scroll</span>
          {" "}to zoom
        </div>
      )}
    </div>
  )
}
