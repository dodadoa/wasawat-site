import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Html, Line } from "@react-three/drei"
import { useEffect, useRef, useState } from "react"
import { genreLayers, XY_SCALE, Z_SCALE, Z_AXIS_LABELS, QUADRANT_LABELS } from "../data/homeQuadrant3d.js"
import HalftoneDitherEffects from "./home/HalftoneDitherEffects.jsx"
import DomStatsPanel from "./home/DomStatsPanel.jsx"

const S = XY_SCALE  // world units per axis half-length

const GENRE_COLORS = {
  installations: "#ffffff",
  netart: "#aaaaaa",
  performance: "#666666",
}

// ─── axis end label ───────────────────────────────────────────────────────────

function AxisLabel({ position, text }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <span style={{
        fontFamily: "'Cinzel', serif",
        fontSize: "11px",
        fontWeight: 400,
        letterSpacing: "0.12em",
        color: "#ffffff",
        whiteSpace: "nowrap",
      }}>
        {text}
      </span>
    </Html>
  )
}

// ─── single work node ─────────────────────────────────────────────────────────

function WorkNode({ work, genreId, dimmed }) {
  const color = dimmed ? "#222" : (GENRE_COLORS[genreId] ?? "#fff")
  const pos = [work.x * S, work.y * S, (work.z ?? 0) * S]

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {!dimmed && (
        <Html
          center
          distanceFactor={14}
          style={{ pointerEvents: work.slug ? "auto" : "none" }}
          occlude={false}
        >
          <div style={{ textAlign: "center" }}>
            {work.slug ? (
              <a
                href={`/art/${work.slug}`}
                style={{
                  display: "block",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "15px",
                  fontWeight: 400,
                  fontStyle: "italic",
                  letterSpacing: "0.04em",
                  color: "#fff",
                  background: "#000",
                  border: "1px solid #444",
                  padding: "5px 14px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  boxShadow: "0 0 60px 8px rgba(255,255,255,0.55)",
                }}
              >
                {work.label}
              </a>
            ) : (
              <span
                style={{
                  display: "block",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "15px",
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                  color: "#ababab",
                  background: "#000",
                  border: "1px solid #333",
                  padding: "5px 14px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 0 60px 8px rgba(255,255,255,0.35)",
                }}
              >
                {work.label}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

// ─── the 3d scene ─────────────────────────────────────────────────────────────

function Scene({ genreFilter }) {
  const works = genreLayers
    .filter((l) => l.id !== "all")
    .flatMap((layer) => layer.works.map((w) => ({ ...w, genreId: layer.id })))

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

      {/* x axis: conceptual ↔ non-conceptual */}
      <Line points={[[-S, 0, 0], [S, 0, 0]]} color="#ffffff" lineWidth={1} />
      <AxisLabel position={[-S - 0.6, 0, 0]} text="conceptual" />
      <AxisLabel position={[S + 0.6, 0, 0]} text="non-conceptual" />

      {/* y axis: system ↔ non-system */}
      <Line points={[[0, -S, 0], [0, S, 0]]} color="#ffffff" lineWidth={1} />
      <AxisLabel position={[0, S + 0.6, 0]} text="non-system" />
      <AxisLabel position={[0, -S - 0.6, 0]} text="system" />

      {/* z axis: durational ↔ still */}
      <Line points={[[0, 0, -S], [0, 0, S]]} color="#ffffff" lineWidth={1} />
      <AxisLabel position={[0, 0, S + 0.6]} text={Z_AXIS_LABELS.pos} />
      <AxisLabel position={[0, 0, -S - 0.6]} text={Z_AXIS_LABELS.neg} />

      {/* origin dot */}
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#333" />
      </mesh>

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

// ─── 2d chronology fallback ───────────────────────────────────────────────────

function toPercent(v, invert = false) {
  const pad = 16
  const t = (v + 1) / 2
  const p = invert ? 1 - t : t
  return pad + p * (100 - pad * 2)
}

function ChronologyView({ layer }) {
  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} preserveAspectRatio="none">
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ffffff" strokeWidth="1" />
      </svg>
      <span className="absolute"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", letterSpacing: "0.12em", color: "#ffffff", left: "4%", top: "50%", transform: "translateY(-50%)" }}>
        Older
      </span>
      <span className="absolute"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", letterSpacing: "0.12em", color: "#ffffff", right: "4%", top: "50%", transform: "translateY(-50%)" }}>
        Newer
      </span>
      {layer.works.map((work) => (
        <div
          key={work.slug ?? work.label}
          className="absolute"
          style={{ left: `${toPercent(work.x)}%`, top: "50%", transform: "translate(-50%, -50%)" }}
        >
          <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: "#fff" }} />
          {work.slug ? (
            <a
              href={`/art/${work.slug}`}
              className="block whitespace-nowrap text-center"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "15px",
                fontStyle: "italic",
                letterSpacing: "0.04em",
                color: "#fff",
                background: "#000",
                border: "1px solid #444",
                padding: "4px 14px",
                textDecoration: "none",
                boxShadow: "0 0 60px 8px rgba(255,255,255,0.55)",
              }}
            >
              {work.label}
              {work.date && (
                <span className="block mt-1" style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", letterSpacing: "0.12em", color: "#888", fontStyle: "normal" }}>
                  {work.date.slice(0, 4)}
                </span>
              )}
            </a>
          ) : (
            <span
              className="block whitespace-nowrap text-center"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "15px", letterSpacing: "0.04em", color: "#ababab", background: "#000", border: "1px solid #333", padding: "4px 14px" }}
            >
              {work.label}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function HomeQuadrantView({ layers = genreLayers, showGenreNav = layers.length > 1 }) {
  const [genreFilter, setGenreFilter] = useState(null)
  const containerRef = useRef(null)
  const navRef = useRef(null)
  // screen-x fraction where the shader stops, so the menu area stays clean
  const [effectEdge, setEffectEdge] = useState(1)

  useEffect(() => {
    const container = containerRef.current
    const measure = () => {
      const nav = navRef.current
      if (!container || !nav) {
        setEffectEdge(1)
        return
      }
      setEffectEdge(nav.offsetLeft / container.clientWidth)
    }
    measure()
    if (!container) return
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const isSingleChronology =
    layers.length === 1 && layers[0].layout === "chronology"

  const genreButtons = genreLayers.filter((l) => l.id !== "all")

  return (
    <div
      id="home-quadrant"
      ref={containerRef}
      className="fixed left-0 right-0 bottom-0 bg-black"
      style={{ top: "2.5rem", height: "calc(100vh - 2.5rem)", width: "100%" }}
    >
      {isSingleChronology ? (
        <ChronologyView layer={layers[0]} />
      ) : (
        <Canvas
          camera={{ position: [9, 6, 13], fov: 48 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "#000" }}
        >
          {/* midtone clear color: the halftone/dither passes only texture
              midtones — after them this renders as a near-black dot field */}
          <color attach="background" args={["#5e5e5e"]} />
          <Scene genreFilter={genreFilter} />
          <HalftoneDitherEffects edge={effectEdge} />
        </Canvas>
      )}

      {/* DOM statistics — floats over the dithered left side */}
      {!isSingleChronology && <DomStatsPanel />}

      {/* genre filter — floats over canvas */}
      {showGenreNav && !isSingleChronology && (
        <nav
          ref={navRef}
          className="absolute top-0 right-0 bottom-0 flex flex-col justify-center gap-2 pr-8"
          style={{
            minWidth: "clamp(120px, 18vw, 220px)",
            paddingLeft: "clamp(2rem, 5vw, 4rem)",
            borderLeft: "1px solid #1c1c1c",
            pointerEvents: "auto",
          }}
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
                  fontFamily: "'Cinzel', serif",
                  color: active ? "#fff" : "#3a3a3a",
                  fontSize: active
                    ? "clamp(1.1rem, 2.2vw, 1.5rem)"
                    : "clamp(0.8rem, 1.4vw, 1rem)",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.08em",
                  lineHeight: 1.4,
                  padding: "0.3rem 0",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease, font-size 0.35s ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#888" }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#3a3a3a" }}
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
            fontFamily: "'Cinzel', serif",
            fontSize: "10px",
            letterSpacing: "0.14em",
            color: "#2e2e2e",
          }}
        >
          drag to orbit · scroll to zoom
        </div>
      )}
    </div>
  )
}
