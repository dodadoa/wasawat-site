import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Html, Line, Grid } from "@react-three/drei"
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
// a little over-inked bloom: a tight spread plus a faint wide one. Used on the
// borders of the 3d view's thumbnails; its lines get the same via a filter on
// the canvas (.quadrant-3d canvas, in pages/index.astro)
const BLOOM = "0 0 1px rgba(20,20,20,0.55), 0 0 7px rgba(20,20,20,0.32)"
const STACK = `6px 6px 0 -1px ${PAPER}, 6px 6px 0 0 ${LINE}`
// the 2d planes' rules are hairlines, so they take the bloom a touch heavier
const FLAT_BLOOM_AT = (inset = "") =>
  `${inset}0 0 1px rgba(20,20,20,0.6), ${inset}0 0 9px rgba(20,20,20,0.4)`
const FLAT_BLOOM = FLAT_BLOOM_AT()
// a sheet's border blooms to both sides of the line
const FLAT_SHEET_BLOOM = `${FLAT_BLOOM}, ${FLAT_BLOOM_AT("inset ")}`

// The right-hand column is exactly as wide as the top nav's link cells (the nav
// publishes that width), so its left rule continues the nav's first divider.
const RIGHT_W = "var(--nav-desktop-w, clamp(240px, 20vw, 300px))"
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

const workKey = (w) => w.slug ?? w.label

// Every work gets one fixed number, shown as a small badge on its node in
// every diagram; hovering a node puts its title and details in the right column.
const WORKS = collectWorks()
const WORK_NO = new Map(WORKS.map((w, i) => [workKey(w), String(i + 1).padStart(2, "0")]))

const thumbOf = (w) => (w.slug && w.image ? `/images/thumbs/${w.slug}.jpg` : w.image)

// ─── 3d placement ─────────────────────────────────────────────────────────────
// Coordinates are normalized per axis — the furthest work on each axis lands at
// ±SPREAD of the axis length — so no thumbnail sits past the end of the cube,
// whatever range the data happens to use. Signs (which side of an axis a work
// is on) are untouched; the cards still print the raw values. At this spread a
// corner work swinging past the camera reaches no lower than the top axis label
// reaches up, so the fitted diagram sits evenly in the frame.
const SPREAD = 0.62
const AXIS_MAX = ["x", "y", "z"].map((a) => Math.max(...WORKS.map((w) => Math.abs(w[a] ?? 0))) || 1)
const worldPos = (w) => [w.x, w.y, w.z ?? 0].map((v, i) => (v / AXIS_MAX[i]) * SPREAD * S)

// The camera is fitted to how far the scene reaches on screen as it turns about
// the vertical axis: every axis label and work is a ring (radius, height), with
// the screen-space room (px) its text or thumbnail needs beyond that point.
// That is tighter than the full bounding sphere, so the diagram fills the
// frame; a hand-orbited odd angle can push a corner work a little past the
// edge, where it simply overlaps the margin.
const AXIS_LABEL_AT = S + 0.6
const CAMERA_FOV = 48
const CAMERA_DIR = [9, 6, 13]
const CAMERA_TILT = Math.atan2(CAMERA_DIR[1], Math.hypot(CAMERA_DIR[0], CAMERA_DIR[2]))
const AXIS_TEXT_HALF_W = 64 // half of the widest sideways axis label
const AXIS_TEXT_HALF_H = 14
const NODE_MARGIN = 10 // thumbnail's corner badge and bloom

/**
 * Camera distance at which the whole diagram fits a `width`×`height` viewport,
 * and how far (px) to slide the picture down so it sits centred: seen from
 * above, the near top of the scene is drawn larger than its far bottom.
 */
function fitCamera(width, height, thumbSize) {
  const node = thumbSize / 2 + NODE_MARGIN
  const rings = [
    { r: 0, y: AXIS_LABEL_AT, padX: 0, padY: AXIS_TEXT_HALF_H },
    { r: 0, y: -AXIS_LABEL_AT, padX: 0, padY: AXIS_TEXT_HALF_H },
    { r: AXIS_LABEL_AT, y: 0, padX: AXIS_TEXT_HALF_W, padY: AXIS_TEXT_HALF_H },
    ...WORKS.map((w) => {
      const [x, y, z] = worldPos(w)
      return { r: Math.hypot(x, z), y, padX: node, padY: node }
    }),
  ]
  const cos = Math.cos(CAMERA_TILT)
  const sin = Math.sin(CAMERA_TILT)
  // px per unit of view-space tangent
  const k = height / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360)

  const extents = (d) => {
    let up = 0
    let down = 0
    let side = 0
    for (const { r, y, padX, padY } of rings) {
      // the ring's nearest (-1) and furthest (+1) points from the camera
      for (const far of [-1, 1]) {
        const depth = d + far * r * cos - y * sin
        const v = ((y * cos + far * r * sin) / depth) * k
        up = Math.max(up, v + padY)
        down = Math.max(down, -v + padY)
      }
      side = Math.max(side, (r / Math.sqrt(d * d - (r * cos) ** 2)) * k + padX)
    }
    return { up, down, side }
  }

  let lo = SCENE_REACH * 1.2
  let hi = SCENE_REACH * 12
  for (let i = 0; i < 30; i++) {
    const d = (lo + hi) / 2
    const e = extents(d)
    if (e.up + e.down <= height && e.side <= width / 2) hi = d
    else lo = d
  }
  const e = extents(hi)
  return { distance: hi, shiftY: (e.up - e.down) / 2 }
}
const SCENE_REACH = Math.max(AXIS_LABEL_AT, ...WORKS.map((w) => Math.hypot(...worldPos(w))))

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

/** Numbered marker for a work: a perfect circle, inverted while active. */
function Badge({ no, active, linked, size = 26 }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        boxSizing: "border-box",
        fontFamily: mono,
        fontSize: "11px",
        lineHeight: 1,
        background: active ? INK : PAPER,
        color: active ? PAPER : linked ? INK : SOFT,
        border: `1px ${linked ? "solid" : "dashed"} ${linked ? INK : SOFT}`,
      }}
    >
      {no}
    </span>
  )
}

/** The hovered work, in the right-hand panel: picture, title, position on the axes. */
function WorkCard({ work }) {
  const meta = workQuadrantMeta(work)
  const thumb = thumbOf(work)

  return (
    <div
      style={{
        textAlign: "left",
        background: PAPER,
        border: `1px solid ${INK}`,
      }}
    >
      {thumb && (
        <img
          src={thumb}
          alt=""
          decoding="async"
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "4 / 3",
            objectFit: "cover",
            background: "#fff",
            borderBottom: `1px solid ${INK}`,
          }}
        />
      )}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontFamily: mono, fontSize: "calc(11px * var(--ui-scale, 1))", color: SOFT, marginBottom: "6px" }}>
          {WORK_NO.get(workKey(work))}
          {work.date ? ` · ${work.date.slice(0, 4)}` : ""}
        </div>
        <div
          style={{
            fontFamily: displayMono,
            fontSize: "calc(17px * var(--ui-scale, 1))",
            lineHeight: 1.18,
            letterSpacing: "-0.01em",
            color: INK,
            whiteSpace: "normal",
          }}
        >
          {work.label}
        </div>
        <div
          style={{
            fontFamily: dataMono,
            fontSize: "calc(11px * var(--ui-scale, 1))",
            color: SOFT,
            lineHeight: 1.6,
            marginTop: "8px",
            whiteSpace: "normal",
          }}
        >
          <div>{meta.xAxis} · {meta.yAxis} · {meta.zAxis}</div>
          <div style={{ color: INK }}>
            x {meta.coords.x} · y {meta.coords.y} · z {meta.coords.z}
          </div>
        </div>
      </div>
    </div>
  )
}

/** A work's picture, shown on its node from the start, with its number pinned to the corner. */
function Thumb({ src, no, active, linked, size }) {
  return (
    <span
      style={{
        position: "relative",
        display: "block",
        width: `${size}px`,
        height: `${size}px`,
        boxSizing: "border-box",
        background: PAPER,
        border: `1px solid ${INK}`,
        boxShadow: active ? `3px 3px 0 0 ${INK}, ${BLOOM}` : BLOOM,
      }}
    >
      <img
        src={src}
        alt=""
        decoding="async"
        draggable={false}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
      <span style={{ position: "absolute", top: "-9px", left: "-9px" }}>
        <Badge no={no} active={active} linked={linked} size={20} />
      </span>
    </span>
  )
}

const WorkNode = memo(function WorkNode({ work, genreId, dimmed, active, thumbSize, onHoverChange }) {
  const accent = genreColor(genreId)
  const color = dimmed ? LINE : accent
  const pos = worldPos(work)
  const thumb = thumbOf(work)
  const key = workKey(work)
  const show = active && !dimmed
  const Tag = work.slug ? "a" : "span"

  return (
    <group position={pos}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/*
        Always mounted — even when dimmed — and hidden via visibility instead
        of conditional rendering, so genre-filter clicks don't tear the node
        down. The active node is pinned to the top of the stack so it is never
        covered by another one.
      */}
      <Html
        center
        style={{ pointerEvents: "none" }}
        zIndexRange={show ? [16777271, 16777271] : [16777200, 0]}
        occlude={false}
      >
        <div
          style={{
            position: "relative",
            pointerEvents: dimmed ? "none" : "auto",
            visibility: dimmed ? "hidden" : "visible",
          }}
          onMouseEnter={() => onHoverChange?.(key, true)}
          onMouseLeave={() => onHoverChange?.(key, false)}
        >
          <Tag
            href={work.slug ? `/art/${work.slug}` : undefined}
            aria-label={work.label}
            style={{ display: "block", textDecoration: "none" }}
          >
            {thumb ? (
              <Thumb src={thumb} no={WORK_NO.get(key)} active={show} linked={!!work.slug} size={thumbSize} />
            ) : (
              <Badge no={WORK_NO.get(key)} active={show} linked={!!work.slug} />
            )}
          </Tag>
        </div>
      </Html>
    </group>
  )
})

// ─── the 3d scene ─────────────────────────────────────────────────────────────

function Scene({ genreFilter, activeKey, compact, onHoverChange }) {
  const works = WORKS
  const thumbSize = compact ? 40 : 56

  // Pull the camera back just far enough that the whole diagram — at any
  // rotation — sits inside the canvas, and again whenever the canvas resizes.
  const camera = useThree((s) => s.camera)
  const { width, height } = useThree((s) => s.size)
  const { distance, shiftY } = useMemo(
    () => fitCamera(width, height, thumbSize),
    [width, height, thumbSize],
  )
  useEffect(() => {
    camera.position.setLength(distance)
    camera.setViewOffset(width, height, 0, -shiftY, width, height)
  }, [camera, distance, shiftY, width, height])

  return (
    <>
      <OrbitControls
        // paused while a work is active, so it stays put under the pointer
        autoRotate={!activeKey}
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.05}
        minDistance={7}
        maxDistance={distance * 1.4}
        makeDefault
      />

      {/* x axis: investigative ↔ speculative */}
      <Line points={[[-S, 0, 0], [S, 0, 0]]} color={INK} lineWidth={1.5} />
      <AxisLabel position={[-AXIS_LABEL_AT, 0, 0]} text="Investigative" />
      <AxisLabel position={[AXIS_LABEL_AT, 0, 0]} text="Speculative" />

      {/* y axis: looking to the future ↔ looking to the past */}
      <Line points={[[0, -S, 0], [0, S, 0]]} color={INK} lineWidth={1.5} />
      <AxisLabel position={[0, AXIS_LABEL_AT, 0]} text="Looking to the Future" />
      <AxisLabel position={[0, -AXIS_LABEL_AT, 0]} text="Looking to the Past" />

      {/* z axis: future ↔ past */}
      <Line points={[[0, 0, -S], [0, 0, S]]} color={INK} lineWidth={1.5} />
      <AxisLabel position={[0, 0, AXIS_LABEL_AT]} text={Z_AXIS_LABELS.pos} />
      <AxisLabel position={[0, 0, -AXIS_LABEL_AT]} text={Z_AXIS_LABELS.neg} />

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
        fadeDistance={S * 12}
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
        fadeDistance={S * 12}
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
        fadeDistance={S * 12}
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
          active={activeKey === workKey(work)}
          thumbSize={thumbSize}
          onHoverChange={onHoverChange}
        />
      ))}
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
        paddingRight: inset ? RIGHT_W : 0,
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
                // the whole row opens the work, not just its title
                data-href={work.slug ? `/art/${work.slug}` : undefined}
                onClick={work.slug ? (e) => {
                  if (e.target.closest("a")) return
                  window.location.href = `/art/${work.slug}`
                } : undefined}
                onMouseEnter={work.slug ? (e) => e.currentTarget.style.boxShadow = `inset 3px 0 0 ${INK}` : undefined}
                onMouseLeave={work.slug ? (e) => e.currentTarget.style.boxShadow = "none" : undefined}
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
// The three sheets are stacked in depth as an isometric exploded view, so they
// sit in the middle of the page instead of running edge to edge into the
// side panels.

const FLAT_TILT = 60 // deg the stack leans back
const FLAT_TURN = 45 // deg it is turned, corner towards the viewer
const FLAT_GAP = 0.62 // distance between sheets, as a fraction of a sheet's side
// stack footprint in sheet-sides: √2 wide, √2·cos(tilt) + 2·gap·sin(tilt) tall
const FLAT_SIDE = "min(100cqw / 1.55, 100cqh / 1.95)"
// undoes the stack's rotation, so a child faces the screen again
const FLAT_BILLBOARD = `rotateZ(${-FLAT_TURN}deg) rotateX(${-FLAT_TILT}deg)`

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

function FlatPanel({ plane, level, works, genreFilter, hoverKey, setHoverKey }) {
  return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: `translateZ(calc(${FLAT_SIDE} * ${level * FLAT_GAP}))`,
          border: `1px solid ${LINE}`,
          background: `color-mix(in srgb, ${PAPER} 70%, transparent)`,
          boxShadow: `${STACK}, ${FLAT_SHEET_BLOOM}`,
          // only the badges take the pointer, so a sheet never blocks the one below
          pointerEvents: "none",
        }}
      >
        {/* axis lines */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "1px", background: LINE, boxShadow: FLAT_BLOOM }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "1px", background: LINE, boxShadow: FLAT_BLOOM }} />
        {/* axis end labels */}
        <span style={{ ...FLAT_END_LABEL, left: "6px", top: "50%", transform: "translateY(-140%)" }}>{plane.left}</span>
        <span style={{ ...FLAT_END_LABEL, right: "6px", top: "50%", transform: "translateY(-140%)" }}>{plane.right}</span>
        <span style={{ ...FLAT_END_LABEL, left: "50%", top: "6px", transform: "translateX(8px)" }}>{plane.top}</span>
        <span style={{ ...FLAT_END_LABEL, left: "50%", bottom: "6px", transform: "translateX(8px)" }}>{plane.bottom}</span>

        {/* works scattered by this projection's two coords — numbered badges,
            same numbers as the 3d view */}
        {works.map((w) => {
          const key = workKey(w)
          const dimmed = !!genreFilter && w.genreId !== genreFilter
          const hovered = hoverKey === key
          const Tag = w.slug ? "a" : "span"
          return (
            <Tag
              key={key}
              data-flat-key={key}
              href={w.slug ? `/art/${w.slug}` : undefined}
              aria-label={w.label}
              onMouseEnter={() => !dimmed && setHoverKey(key)}
              onMouseLeave={() => setHoverKey(null)}
              style={{
                position: "absolute",
                left: `${toPercent(w[plane.ax] ?? 0)}%`,
                top: `${toPercent(w[plane.ay] ?? 0, true)}%`,
                // stands upright on the sheet, like a pin, facing the screen
                transform: `translate(-50%, -50%) translateZ(14px) ${FLAT_BILLBOARD}`,
                display: "block",
                zIndex: hovered ? 6 : 2,
                pointerEvents: dimmed ? "none" : "auto",
                visibility: dimmed ? "hidden" : "visible",
                textDecoration: "none",
              }}
            >
              <Badge no={WORK_NO.get(key)} active={hovered} linked={!!w.slug} size={24} />
            </Tag>
          )
        })}
      <p
        style={{
          position: "absolute",
          // off the sheet's right-hand corner
          left: "100%",
          top: 0,
          margin: 0,
          transform: `translate(1rem, -1rem) ${FLAT_BILLBOARD}`,
          transformOrigin: "0 50%",
          whiteSpace: "nowrap",
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

function FlatPlanesView({ genreFilter, hoverKey, setHoverKey }) {
  const works = WORKS
  const containerRef = useRef(null)
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
          // clear the document-stats panel (left), genre tabs (right) and the
          // view switcher (bottom)
          padding: `2rem ${RIGHT_W} 5rem clamp(310px, 26vw, 410px)`,
        }}
      >
        <div
          style={{
            flex: 1,
            height: "100%",
            containerType: "size",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              width: FLAT_SIDE,
              height: FLAT_SIDE,
              transformStyle: "preserve-3d",
              transform: `rotateX(${FLAT_TILT}deg) rotateZ(${FLAT_TURN}deg)`,
            }}
          >
        {FLAT_PLANES.map((plane, i) => (
          <FlatPanel
            key={plane.id}
            plane={plane}
            level={1 - i}
            works={works}
            genreFilter={genreFilter}
            hoverKey={hoverKey}
            setHoverKey={setHoverKey}
          />
        ))}
          </div>
        </div>
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
  // the one work currently called out — shared by the 3d nodes, the 2d planes
  // and the details in the right column
  const [activeKey, setActiveKey] = useState(null)
  // Stable identity across re-renders — WorkNode is memo()'d, so if this were
  // redefined on every render every node's <Html> would be re-rendered
  // whenever *any* node's hover state changed.
  const handleHoverChange = useCallback((key, isHovered) => {
    setActiveKey((prev) => (isHovered ? key : prev === key ? null : prev))
  }, [])
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
    const srcs = WORKS.map(thumbOf).filter(Boolean)
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
  // mobile: one cycling toggle · desktop: 3d / 2d planes / table switcher
  // both open on the 3d diagram
  const [mobileView, setMobileView] = useState("3d") // "3d" | "table" | "rogue"
  const [desktopView, setDesktopView] = useState("3d") // "3d" | "2d" | "table" | "rogue"
  const viewMode = isMobile ? mobileView : desktopView

  // the 1-bit roguelike is plain DOM the page renders next to this island
  // (#home-rogue); it is one more view here, started the first time it's picked
  const [hasRogue] = useState(() => !!document.getElementById("home-rogue"))
  const rogueStarted = useRef(false)
  const isRogue = hasRogue && viewMode === "rogue"
  useEffect(() => {
    const root = document.getElementById("home-rogue")
    if (!root) return
    root.hidden = !isRogue
    if (!isRogue || rogueStarted.current) return
    rogueStarted.current = true
    import("../game/homeRoguelike.js").then((m) => m.startHomeRoguelike(root))
  }, [isRogue])

  const activeWork = activeKey ? WORKS.find((w) => workKey(w) === activeKey) : null

  const isSingleChronology =
    layers.length === 1 && layers[0].layout === "chronology"

  const genreButtons = genreLayers.filter((l) => l.id !== "all")
  const showDiagram = !isSingleChronology
  const showToggle = showDiagram && isMobile
  const showDomStats = showDiagram && !isMobile

  const mobileViews = hasRogue ? ["3d", "table", "rogue"] : ["3d", "table"]
  const nextMobileView = mobileViews[(mobileViews.indexOf(viewMode) + 1) % mobileViews.length]
  const toggleView = () => setMobileView(nextMobileView)

  return (
    <div
      id="home-quadrant"
      className="fixed left-0 right-0 bottom-0"
      // over the roguelike this is only a frame for the view switcher
      style={{ top: "2.5rem", height: "calc(100vh - 2.5rem)", width: "100%", pointerEvents: isRogue ? "none" : undefined }}
    >

      {isRogue ? null : isSingleChronology ? (
        <ChronologyView layer={layers[0]} />
      ) : viewMode === "table" ? (
        <Quadrant2DView genreFilter={genreFilter} inset={!isMobile} />
      ) : viewMode === "2d" ? (
        <FlatPlanesView genreFilter={genreFilter} hoverKey={activeKey} setHoverKey={setActiveKey} />
      ) : (
        <>
          {!(canvasReady && imagesReady) && (
            <span className="home-quadrant-loading">loading selected work…</span>
          )}
          {/* the canvas takes only the space the side panels and the bottom
              controls leave free, so its centre is the centre of what's visible */}
          <div
            className="absolute"
            style={{
              top: 0,
              left: isMobile ? 0 : "clamp(310px, 26vw, 410px)",
              right: isMobile ? 0 : RIGHT_W,
              // down to just above the view switcher
              bottom: isMobile ? "6rem" : "3.25rem",
              // above the panels, so a card hanging off the edge isn't cut by them
              zIndex: 3,
              // nothing shows until the thumbnails can all be drawn at once
              visibility: imagesReady ? "visible" : "hidden",
            }}
          >
          <Canvas
            camera={{ position: CAMERA_DIR, fov: CAMERA_FOV }}
            // .quadrant-3d switches the site-wide text bloom off for the labels
            className="quadrant-3d"
            flat
            // transparent, so the canvas filter can bloom the lines onto the page
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            dpr={[1, 2]}
            style={{
              background: "transparent",
              position: "relative",
              overflow: "visible",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onCreated={() => setCanvasReady(true)}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            onPointerLeave={() => setIsDragging(false)}
          >
            <Scene genreFilter={genreFilter} activeKey={activeKey} compact={isMobile} onHoverChange={handleHoverChange} />
          </Canvas>
          </div>
        </>
      )}

      {/* the roguelike brings its own left column, about the museum */}
      {showDomStats && !isRogue && <DomStatsPanel />}

      {/* desktop view switcher: 3d / 2d planes / table */}
      {showDiagram && !isMobile && (
        <div
          className="absolute"
          style={{
            bottom: "0.75rem",
            // the same place in every view, so it doesn't jump when you switch
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            display: "flex",
            background: PAPER,
            pointerEvents: "auto",
          }}
        >
          {[
            { id: "3d", label: "3d" },
            { id: "2d", label: "2d planes" },
            { id: "table", label: "table" },
            ...(hasRogue ? [{ id: "rogue", label: "1bit rogue" }] : []),
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
          aria-label={`Switch to ${nextMobileView} view`}
          className="absolute"
          style={{
            pointerEvents: "auto",
            // the genre strip it normally sits above is hidden over the roguelike
            bottom: isMobile && !isRogue ? "3.25rem" : "0.75rem",
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
          view · {nextMobileView}
        </button>
      )}

      {/* genre filter — floats over canvas */}
      {showGenreNav && showDiagram && !isRogue && (
        <nav
          className={
            isMobile
              ? "absolute left-0 right-0 bottom-0 flex flex-row justify-start overflow-x-auto"
              : "absolute top-0 right-0 bottom-0 flex flex-col justify-center overflow-y-auto"
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
                  width: RIGHT_W,
                  padding: "1.5rem 1.25rem",
                  borderLeft: `1px solid ${LINE}`,
                  // an opaque paper column, like the stats panel opposite
                  background: PAPER,
                  pointerEvents: "auto",
                  zIndex: 2,
                }
          }
          aria-label="Genre filter and work details"
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

          {/* the hovered work's details; the space is a fixed height (a taller
              card overflows it) so the genre rows above never move when a card
              comes and goes or its title wraps */}
          {!isMobile && viewMode !== "table" && (
            <div style={{ marginTop: "2.2rem", height: "340px", flexShrink: 0 }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: "calc(12px * var(--ui-scale, 1))",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: SOFT,
                  borderTop: `3px solid ${INK}`,
                  padding: "0.7rem 0.6rem 0.8rem",
                }}
              >
                {activeWork ? "Selected" : "Hover a work"}
              </div>
              {activeWork ? (
                <WorkCard work={activeWork} />
              ) : (
                viewMode === "3d" && (
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: "calc(11px * var(--ui-scale, 1))",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: SOFT,
                      lineHeight: 2.2,
                      padding: "0 0.6rem",
                    }}
                  >
                    {[["drag", "to orbit"], ["scroll", "to zoom"]].map(([key, does]) => (
                      <div key={key}>
                        <span style={{ background: INK, color: PAPER, padding: "1px 5px" }}>{key}</span> {does}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </nav>
      )}
    </div>
  )
}
