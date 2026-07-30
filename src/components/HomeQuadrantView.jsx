import { Canvas } from "@react-three/fiber"
import { OrbitControls, Html, Line, Grid } from "@react-three/drei"
import { memo, useMemo, useState } from "react"
import { genreLayers, XY_SCALE, Z_AXIS_LABELS, QUADRANT_LABELS } from "../data/homeQuadrant3d.js"
import { AXIS_COLORS, AXIS_TEXT_COLORS, ACCENTS, TEXT, TEXT_ACCENTS, genreColor, genreGradient, genreTextColor, rgba } from "../data/homeColors.js"
import { workQuadrantMeta } from "../utils/quadrantWorkMeta.js"
import { glassNode } from "./home/panelChrome.jsx"
import DomStatsPanel from "./home/DomStatsPanel.jsx"

const S = XY_SCALE
const mono = "'DepartureMono', monospace"
const displayMono = "'403Mesapholic', monospace"

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

const WorkNode = memo(function WorkNode({ work, genreId, dimmed }) {
  const [hovered, setHovered] = useState(false)
  const accent = genreColor(genreId)
  const color = dimmed ? "#999999" : accent
  const pos = [work.x * S, work.y * S, (work.z ?? 0) * S]
  const showDetail = hovered && !dimmed
  const planeLabel = work.planeLabel ?? work.label

  return (
    <group position={pos}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {!dimmed && (
        <Html
          center
          style={{ pointerEvents: "none", zIndex: hovered ? 9999 : undefined }}
          occlude={false}
        >
          <div
            style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", textAlign: "center", pointerEvents: "auto" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {work.image && (
              <img
                src={work.image}
                alt=""
                loading="lazy"
                style={{
                  display: "block",
                  width: "88px",
                  height: "60px",
                  objectFit: "cover",
                  marginBottom: "4px",
                  ...glassNode(accent),
                  padding: 0,
                }}
              />
            )}
            {work.slug ? (
              <a
                href={`/art/${work.slug}`}
                style={{
                  display: "block",
                  fontFamily: "'403Mesapholic', monospace",
                  fontSize: "calc(15px * var(--ui-scale, 1))",
                  fontWeight: 400,
                  fontStyle: "italic",
                  letterSpacing: "0.04em",
                  color: "#0a0a0a",
                  padding: "5px 14px",
                  textDecoration: "none",
                  width: "max-content",
                  maxWidth: "min(92vw, 640px)",
                  whiteSpace: "nowrap",
                  lineHeight: 1.35,
                  ...glassNode(accent),
                }}
              >
                {planeLabel}
              </a>
            ) : (
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
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                <WorkHoverCard work={work} accent={accent} />
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
})

// ─── the 3d scene ─────────────────────────────────────────────────────────────

function Scene({ genreFilter }) {
  const works = useMemo(
    () => genreLayers
      .filter((l) => l.id !== "all")
      .flatMap((layer) => layer.works.map((w) => ({ ...w, genreId: layer.id }))),
    [],
  )

  return (
    <>
      <OrbitControls
        autoRotate
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
        />
      ))}
    </>
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

  const isSingleChronology =
    layers.length === 1 && layers[0].layout === "chronology"

  const genreButtons = genreLayers.filter((l) => l.id !== "all")

  return (
    <div
      id="home-quadrant"
      className="fixed left-0 right-0 bottom-0 bg-white"
      style={{ top: "2.5rem", height: "calc(100vh - 2.5rem)", width: "100%" }}
    >

      {/* backdrop text behind the 3d canvas */}
      {!isSingleChronology && (
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
      ) : (
        <Canvas
          camera={{ position: [9, 6, 13], fov: 48 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent", position: "relative", zIndex: 1 }}
        >
          <Scene genreFilter={genreFilter} />
        </Canvas>
      )}

      {!isSingleChronology && <DomStatsPanel />}

      {/* genre filter — floats over canvas */}
      {showGenreNav && !isSingleChronology && (
        <nav
          className="absolute top-0 right-0 bottom-0 flex flex-col justify-center gap-2 pr-8"
          style={{
            minWidth: "clamp(120px, 18vw, 220px)",
            paddingLeft: "clamp(2rem, 5vw, 4rem)",
            borderLeft: `1px solid ${rgba(ACCENTS.violet, 0.22)}`,
            pointerEvents: "auto",
            zIndex: 2,
          }}
          aria-label="Genre filter"
        >
          {[{ id: null, title: "All" }, ...genreButtons].map((item) => {
            const active = genreFilter === item.id || (item.id === null && !genreFilter)
            const activeAccent = item.id ? genreColor(item.id) : ACCENTS.violet
            const hoverAccent = item.id ? genreTextColor(item.id) : TEXT.secondary
            return (
              <button
                key={item.id ?? "all"}
                type="button"
                onClick={() => setGenreFilter(active && item.id !== null ? null : item.id)}
                style={{
                  fontFamily: "'403Mesapholic', monospace",
                  color: active ? TEXT.primary : TEXT.secondary,
                  fontSize: active
                    ? "clamp(1.1rem, 2.2vw, 1.5rem)"
                    : "clamp(0.8rem, 1.4vw, 1rem)",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.08em",
                  lineHeight: 1.4,
                  padding: "0.3rem 0",
                  paddingBottom: active ? "calc(0.3rem - 3px)" : "0.3rem",
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: active ? `3px solid ${activeAccent}` : "none",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease, font-size 0.35s ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = hoverAccent }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = TEXT.secondary }}
              >
                {item.title}
              </button>
            )
          })}
        </nav>
      )}

      {/* hint */}
      {!isSingleChronology && (
        <div
          className="absolute bottom-3 left-4 pointer-events-none"
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
