import { useCallback, useEffect, useRef, useState } from "react"
import { genreLayers } from "../data/homeQuadrant3d.js"

export default function HomeGenre3D() {
  const [CanvasView, setCanvasView] = useState(null)
  const [activeLayer, setActiveLayer] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    import("./HomeGenre3DCanvas.jsx").then((mod) => setCanvasView(() => mod.default))
  }, [])

  const changeLayer = useCallback((delta) => {
    setActiveLayer((prev) => Math.max(0, Math.min(genreLayers.length - 1, prev + delta)))
  }, [])

  const goToLayer = useCallback((index) => {
    setActiveLayer(Math.max(0, Math.min(genreLayers.length - 1, index)))
  }, [])

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
      style={{ top: "4rem", height: "calc(100vh - 4rem)", width: "100%" }}
    >
      {!CanvasView && (
        <div
          className="absolute inset-0 flex items-center justify-center font-mono text-[13px] uppercase tracking-widest"
          style={{ color: "#ababab" }}
        >
          loading map…
        </div>
      )}
      {CanvasView && <CanvasView activeLayer={activeLayer} />}

      <nav
        className="absolute top-0 right-0 bottom-0 z-10 flex flex-col justify-center gap-1 pr-6 md:pr-10"
        style={{
          paddingLeft: "clamp(2rem, 6vw, 5rem)",
          background: "linear-gradient(to left, rgba(0,0,0,0.92) 55%, transparent)",
          overflow: "visible",
        }}
        aria-label="Genre layers"
      >
        {genreLayers.map((layer, i) => {
          const active = i === activeLayer
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => goToLayer(i)}
              className="font-mono text-right uppercase tracking-widest whitespace-nowrap"
              style={{
                color: active ? "#ffffff" : "#555555",
                fontSize: active ? "clamp(1.25rem, 3.1vw, 1.95rem)" : "clamp(1rem, 2vw, 1.3rem)",
                fontWeight: active ? 500 : 400,
                lineHeight: 1.2,
                padding: "0.35rem 0",
                cursor: "pointer",
                background: "none",
                border: "none",
                transition: "color 0.2s ease, font-size 0.35s ease",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = "#ababab"
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = "#555555"
              }}
            >
              {layer.title}
            </button>
          )
        })}
      </nav>

      <div
        className="absolute bottom-4 left-4 right-48 md:right-56 flex justify-between font-mono text-[12px] uppercase tracking-[0.2em] pointer-events-none z-10"
        style={{ color: "#8f8f8f" }}
      >
        <span>x: body ↔ machine · y: presence ↔ archive</span>
        <span>scroll / ↑↓ · click genre · drag to orbit</span>
      </div>
    </div>
  )
}
