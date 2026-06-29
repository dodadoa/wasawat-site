import { useCallback, useEffect, useRef, useState } from "react"
import { genreLayers, QUADRANT_LABELS } from "../data/homeQuadrant3d.js"

/** Map x or y in [-1,1] to a percentage [pad%, (100-pad)%] */
function toPercent(v, invert = false) {
  const pad = 16
  const t = (v + 1) / 2 // 0..1
  const p = invert ? 1 - t : t
  return pad + p * (100 - pad * 2)
}

const cornerPos = {
  "-1_1":  { left: "5%",  top: "5%",  textAlign: "left" },
  "1_1":   { right: "5%", top: "5%",  textAlign: "right" },
  "-1_-1": { left: "5%",  bottom: "5%", textAlign: "left" },
  "1_-1":  { right: "5%", bottom: "5%", textAlign: "right" },
}

function Quadrant({ layer, visible }) {
  const isChronology = layer.layout === "chronology"

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* SVG axes */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
        preserveAspectRatio="none"
      >
        {/* horizontal axis */}
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#333" strokeWidth="1" />
        {!isChronology && (
          <>
            {/* vertical axis */}
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#333" strokeWidth="1" />
            {/* subtle quadrant ticks */}
            {[-0.5, 0.5].map((v) => (
              <g key={v}>
                <line
                  x1={`${toPercent(v)}%`} y1="49%" x2={`${toPercent(v)}%`} y2="51%"
                  stroke="#444" strokeWidth="1"
                />
                <line
                  x1="49%" y1={`${toPercent(v, true)}%`} x2="51%" y2={`${toPercent(v, true)}%`}
                  stroke="#444" strokeWidth="1"
                />
              </g>
            ))}
          </>
        )}
      </svg>

      {/* Axis labels */}
      {isChronology ? (
        <>
          <span className="absolute font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "#555", left: "4%", top: "50%", transform: "translateY(-50%)" }}>
            older
          </span>
          <span className="absolute font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "#555", right: "4%", top: "50%", transform: "translateY(-50%)" }}>
            newer
          </span>
        </>
      ) : (
        <>
          <span className="absolute font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "#555", left: "4%", top: "50%", transform: "translateY(-50%)" }}>
            body
          </span>
          <span className="absolute font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "#555", right: "4%", top: "50%", transform: "translateY(-50%)" }}>
            machine
          </span>
          <span className="absolute font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "#555", top: "4%", left: "50%", transform: "translateX(-50%)" }}>
            presence
          </span>
          <span className="absolute font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "#555", bottom: "4%", left: "50%", transform: "translateX(-50%)" }}>
            archive
          </span>
        </>
      )}

      {/* Corner phrase labels */}
      {!isChronology && QUADRANT_LABELS.map((q) => {
        const key = `${Math.round(q.x)}_${Math.round(q.y)}`
        const pos = cornerPos[key] ?? {}
        return (
          <span
            key={key}
            className="absolute font-mono text-[11px] leading-snug"
            style={{ color: "#3a3a3a", whiteSpace: "pre-line", ...pos }}
          >
            {q.label}
          </span>
        )
      })}

      {/* Work markers */}
      {layer.works.map((work) => {
        const left = `${toPercent(work.x)}%`
        const top = `${toPercent(work.y, true)}%`
        return (
          <div
            key={work.slug ?? work.label}
            className="absolute"
            style={{ left, top, transform: "translate(-50%, -50%)" }}
          >
            {/* dot */}
            <div
              className="w-2 h-2 rounded-full mx-auto mb-1"
              style={{ background: "#ffffff" }}
            />
            {work.slug ? (
              <a
                href={`/art/${work.slug}`}
                className="block font-mono text-[12px] uppercase tracking-widest whitespace-nowrap text-center"
                style={{
                  color: "#ffffff",
                  background: "#000",
                  border: "1px solid #444",
                  padding: "5px 12px",
                  textDecoration: "none",
                }}
              >
                {work.label}
                {isChronology && work.date && (
                  <span
                    className="block text-[10px] tracking-[0.15em] mt-1"
                    style={{ color: "#888888" }}
                  >
                    {work.date.slice(0, 4)}
                  </span>
                )}
              </a>
            ) : (
              <span
                className="block font-mono text-[12px] uppercase tracking-widest whitespace-nowrap text-center"
                style={{
                  color: "#ababab",
                  background: "#000",
                  border: "1px solid #333",
                  padding: "5px 12px",
                }}
              >
                {work.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function HomeQuadrantView({ layers = genreLayers, showGenreNav = layers.length > 1 }) {
  const [activeLayer, setActiveLayer] = useState(0)
  const containerRef = useRef(null)

  const changeLayer = useCallback((delta) => {
    if (!showGenreNav) return
    setActiveLayer((prev) => Math.max(0, Math.min(layers.length - 1, prev + delta)))
  }, [layers.length, showGenreNav])

  const goToLayer = useCallback((index) => {
    setActiveLayer(Math.max(0, Math.min(layers.length - 1, index)))
  }, [layers.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      changeLayer(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [changeLayer])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") changeLayer(1)
      if (e.key === "ArrowUp" || e.key === "PageUp") changeLayer(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [changeLayer])

  return (
    <div
      ref={containerRef}
      id="home-quadrant"
      className="fixed left-0 right-0 bottom-0 bg-black"
      style={{ top: "2.5rem", height: "calc(100vh - 2.5rem)", width: "100%" }}
    >
      {/* Quadrant area */}
      <div
        className="absolute inset-0"
        style={{ right: showGenreNav ? "clamp(120px, 18vw, 220px)" : 0 }}
      >
        {layers.map((layer, i) => (
          <Quadrant key={layer.id} layer={layer} visible={i === activeLayer} />
        ))}
      </div>

      {/* Right genre nav */}
      {showGenreNav && (
      <nav
        className="absolute top-0 right-0 bottom-0 flex flex-col justify-center gap-2 pr-8"
        style={{
          minWidth: "clamp(120px, 18vw, 220px)",
          paddingLeft: "clamp(2rem, 5vw, 4rem)",
          borderLeft: "1px solid #1c1c1c",
          overflow: "visible",
        }}
        aria-label="Genre layers"
      >
        {layers.map((layer, i) => {
          const active = i === activeLayer
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => goToLayer(i)}
              className="font-mono uppercase tracking-widest whitespace-nowrap"
              style={{
                color: active ? "#ffffff" : "#444444",
                fontSize: active ? "clamp(1.15rem, 2.5vw, 1.6rem)" : "clamp(0.9rem, 1.6vw, 1.1rem)",
                fontWeight: active ? 500 : 400,
                lineHeight: 1.3,
                padding: "0.3rem 0",
                cursor: "pointer",
                background: "none",
                border: "none",
                textAlign: "right",
                transition: "color 0.2s ease, font-size 0.35s ease",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#ababab" }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#444444" }}
            >
              {layer.title}
            </button>
          )
        })}
      </nav>
      )}

      {/* Bottom hint */}
      {showGenreNav && (
      <div
        className="absolute bottom-3 left-4 font-mono text-[11px] uppercase tracking-[0.18em] pointer-events-none"
        style={{ color: "#3a3a3a" }}
      >
        scroll or ↑↓ to change genre
      </div>
      )}
    </div>
  )
}
