import { useCallback, useEffect, useRef, useState } from "react"
import { glassBrutal, DitherRamp } from "./panelChrome.jsx"

const OVERLAY_ID = "dom-stats-xray-overlay"
const mono = "'JetBrains Mono', monospace"
const ink = "#ffffff"
const inkDim = "rgba(255,255,255,0.8)"
const inkFaint = "rgba(255,255,255,0.55)"

// Bayer 8×8 matrix, values 0..63
const BAYER8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]

// Renders a number/string via canvas with Bayer 8×8 ordered dithering
function DitherNumber({ value, fontSize = 13, bold = false, levels = 4 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const dpr = window.devicePixelRatio || 1
    const weight = bold ? "600 " : ""
    const fontDecl = `${weight}${fontSize * dpr}px ${mono}`
    const text = String(value)

    ctx.font = fontDecl
    const metrics = ctx.measureText(text)
    const w = Math.ceil(metrics.width) + 6 * dpr
    const h = Math.ceil(fontSize * 1.6 * dpr)

    canvas.width = w
    canvas.height = h
    canvas.style.width = `${w / dpr}px`
    canvas.style.height = `${h / dpr}px`

    ctx.clearRect(0, 0, w, h)
    ctx.font = fontDecl
    ctx.fillStyle = "#ffffff"
    ctx.textBaseline = "middle"
    ctx.fillText(text, 3 * dpr, h / 2)

    // Dither the alpha channel with Bayer 8×8
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const threshold = BAYER8[(y % 8) * 8 + (x % 8)] / 64.0 - 0.5
        const a = data[i + 3] / 255
        const qa = Math.min(1, Math.max(0, a + threshold / levels))
        const out = qa > 0.5 ? 255 : 0
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
        data[i + 3] = out
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [value, fontSize, bold, levels])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "inline-block", verticalAlign: "middle", imageRendering: "pixelated" }}
    />
  )
}

function collectStats() {
  let nodes = 0
  let textNodes = 0
  let maxDepth = 0
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ALL)
  for (let node = walker.currentNode; node; node = walker.nextNode()) {
    nodes++
    if (node.nodeType === Node.TEXT_NODE) textNodes++
    let depth = 0
    for (let p = node.parentNode; p; p = p.parentNode) depth++
    if (depth > maxDepth) maxDepth = depth
  }

  const all = document.querySelectorAll("*")
  let attributes = 0
  const tagCounts = {}
  for (const el of all) {
    attributes += el.attributes.length
    const tag = el.tagName.toLowerCase()
    tagCounts[tag] = (tagCounts[tag] || 0) + 1
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return {
    elements: all.length,
    rows: [
      ["nodes", nodes],
      ["text nodes", textNodes],
      ["depth", maxDepth],
      ["attributes", attributes],
      ["links", document.links.length],
      ["images", document.images.length],
      ["canvases", document.querySelectorAll("canvas").length],
      ["scripts", document.scripts.length],
    ],
    topTags,
  }
}

function clearXray() {
  document.getElementById(OVERLAY_ID)?.remove()
}

function getMatches(tag, panelEl) {
  return [...document.querySelectorAll(tag)].filter(
    (el) => !panelEl?.contains(el) && !el.closest(`#${OVERLAY_ID}`),
  )
}

function truncate(text, max = 42) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function getElementMetadata(el, rect) {
  const tag = el.tagName.toLowerCase()
  const idPart = el.id ? `#${el.id}` : ""
  const classes = [...el.classList].slice(0, 4)
  const classPart = classes.length
    ? `.${classes.join(".")}${el.classList.length > 4 ? "…" : ""}`
    : ""
  const selector = `${tag}${idPart}${classPart}`
  const size = `${Math.round(rect.width)}×${Math.round(rect.height)}`
  const details = []

  if (el.id) details.push(`id="${el.id}"`)
  const classAttr = el.getAttribute("class")
  if (classAttr) details.push(`class="${truncate(classAttr, 48)}"`)

  const attrs = ["href", "src", "role", "aria-label", "type", "name"]
  for (const name of attrs) {
    const value = el.getAttribute(name)
    if (value) details.push(`${name}="${truncate(value, 40)}"`)
  }

  details.push(`attrs:${el.attributes.length}`)
  details.push(`depth:${elementDepth(el)}`)

  return { selector, size, details }
}

function elementDepth(el) {
  let depth = 0
  for (let node = el.parentElement; node; node = node.parentElement) depth++
  return depth
}

function collectMatchMetadata(tag, panelEl) {
  return getMatches(tag, panelEl)
    .map((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 0.5 && rect.height < 0.5) return null
      return { el, rect, ...getElementMetadata(el, rect) }
    })
    .filter(Boolean)
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)
}

function paintXrayBoxes(overlay, tag, panelEl) {
  overlay.replaceChildren()
  const elements = collectMatchMetadata(tag, panelEl)
  for (const { rect, selector, size, details } of elements) {
    const box = document.createElement("div")
    Object.assign(box.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: "1px solid rgba(255,255,255,0.45)",
      background: "rgba(255,255,255,0.04)",
      boxShadow: "0 0 10px rgba(255,255,255,0.15)",
      boxSizing: "border-box",
      pointerEvents: "none",
    })
    overlay.appendChild(box)

    const placeAbove = rect.top >= 40
    const card = document.createElement("div")
    Object.assign(card.style, {
      position: "fixed",
      left: `${Math.max(4, rect.left)}px`,
      top: placeAbove ? `${rect.top - 4}px` : `${rect.bottom + 4}px`,
      transform: placeAbove ? "translateY(-100%)" : "none",
      fontFamily: mono,
      fontSize: "8.5px",
      letterSpacing: "0.02em",
      lineHeight: 1.35,
      color: "#ffffff",
      background: "linear-gradient(160deg, rgba(70,70,70,0.95), rgba(0,0,0,0.95))",
      border: "1px solid rgba(255,255,255,0.4)",
      boxShadow: "3px 3px 0 rgba(0,0,0,0.9), 3px 3px 0 1px rgba(255,255,255,0.3)",
      padding: "3px 6px",
      maxWidth: "min(300px, 42vw)",
      pointerEvents: "none",
      zIndex: "1",
    })

    const title = document.createElement("div")
    title.textContent = `${selector} · ${size}`
    title.style.color = "#ffffff"
    title.style.whiteSpace = "nowrap"
    title.style.overflow = "hidden"
    title.style.textOverflow = "ellipsis"
    card.appendChild(title)

    const meta = document.createElement("div")
    meta.textContent = details.join(" · ")
    meta.style.color = "rgba(255,255,255,0.55)"
    meta.style.marginTop = "2px"
    meta.style.wordBreak = "break-all"
    card.appendChild(meta)

    overlay.appendChild(card)
  }
}

function ensureXrayOverlay() {
  let overlay = document.getElementById(OVERLAY_ID)
  if (!overlay) {
    overlay = document.createElement("div")
    overlay.id = OVERLAY_ID
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "16777270",
      background: "transparent",
    })
    document.body.appendChild(overlay)
  }
  return overlay
}

// Dotted leader fill between label and value
function Row({ label, value, faint = false, active = false, onEnter, onLeave }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 0,
        padding: "0.08rem 0",
        cursor: onEnter ? "crosshair" : "default",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <span
        style={{
          fontFamily: mono,
          fontSize: "9px",
          letterSpacing: "0.08em",
          color: active ? ink : (faint ? inkFaint : inkDim),
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          transition: "color 0.12s",
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          borderBottom: `1px dotted ${inkFaint}`,
          margin: "0 4px",
          transform: "translateY(-3px)",
          minWidth: "8px",
        }}
      />
      <DitherNumber value={value} fontSize={10} levels={active ? 2 : 4} />
    </div>
  )
}

export default function DomStatsPanel() {
  const [open, setOpen] = useState(true)
  const [stats, setStats] = useState(null)
  const [hoveredTag, setHoveredTag] = useState(null)
  const [matchMetadata, setMatchMetadata] = useState([])
  const panelRef = useRef(null)
  const hoveredTagRef = useRef(null)

  const showXray = useCallback((tag) => {
    hoveredTagRef.current = tag
    setHoveredTag(tag)
    setMatchMetadata(collectMatchMetadata(tag, panelRef.current))
    const overlay = ensureXrayOverlay()
    paintXrayBoxes(overlay, tag, panelRef.current)
  }, [])

  const hideXray = useCallback(() => {
    hoveredTagRef.current = null
    setHoveredTag(null)
    setMatchMetadata([])
    clearXray()
  }, [])

  useEffect(() => {
    if (!open) return
    setStats(collectStats())
    const id = setInterval(() => setStats(collectStats()), 1000)
    return () => clearInterval(id)
  }, [open])

  const toggle = () => {
    if (open) hideXray()
    setOpen((o) => !o)
  }

  useEffect(() => {
    const update = () => {
      const tag = hoveredTagRef.current
      if (!tag) return
      setMatchMetadata(collectMatchMetadata(tag, panelRef.current))
      const overlay = document.getElementById(OVERLAY_ID)
      if (overlay) paintXrayBoxes(overlay, tag, panelRef.current)
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [])

  useEffect(() => () => clearXray(), [])

  if (!stats) return null

  return (
    <aside
      ref={panelRef}
      className="absolute"
      style={{
        left: "2rem",
        top: "50%",
        transform: "translateY(-50%)",
        width: "clamp(168px, 13vw, 210px)",
        padding: "0.65rem 0.8rem 0.7rem",
        ...glassBrutal,
        pointerEvents: "auto",
        zIndex: 16777272,
      }}
      aria-label="Document statistics"
    >
      {/* header: plain, like a file name — click to toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          fontFamily: mono,
          fontSize: "9px",
          letterSpacing: "0.32em",
          color: inkFaint,
          marginBottom: open ? "0.45rem" : 0,
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <span>document.stats</span>
        <span style={{ color: inkFaint, letterSpacing: "0.05em" }}>{open ? "[–]" : "[+]"}</span>
      </button>

      {open && (
      <>
      {/* element count — big dithered hero */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.5rem",
          marginBottom: "0.4rem",
          pointerEvents: "none",
        }}
      >
        <DitherNumber value={stats.elements} fontSize={20} bold levels={2} />
        <span
          style={{
            fontFamily: mono,
            fontSize: "8px",
            letterSpacing: "0.2em",
            color: inkDim,
            textTransform: "uppercase",
          }}
        >
          elements
        </span>
      </div>

      <DitherRamp style={{ marginBottom: "0.35rem" }} />

      {/* stat rows */}
      <div style={{ pointerEvents: "none" }}>
        {stats.rows.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </div>

      <DitherRamp style={{ margin: "0.4rem 0" }} />

      {/* tag frequency */}
      <div
        style={{
          fontFamily: mono,
          fontSize: "8px",
          letterSpacing: "0.28em",
          color: inkFaint,
          marginBottom: "0.3rem",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        by tag
      </div>

      <div>
        {stats.topTags.map(([tag, count]) => {
          const active = hoveredTag === tag
          return (
            <Row
              key={tag}
              label={`<${tag}>`}
              value={count}
              faint={!active}
              active={active}
              onEnter={() => showXray(tag)}
              onLeave={hideXray}
            />
          )
        })}
      </div>

      {/* xray metadata panel */}
      {hoveredTag && matchMetadata.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "-2px",
            right: 0,
            padding: "0.4rem 0.8rem 0.7rem",
            ...glassBrutal,
            borderTop: `1px solid ${inkFaint}`,
            maxHeight: "130px",
            overflowY: "auto",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: "8px",
              letterSpacing: "0.24em",
              color: inkFaint,
              marginBottom: "0.3rem",
              textTransform: "uppercase",
            }}
          >
            {"<"}{hoveredTag}{">"} instances
          </div>
          {matchMetadata.slice(0, 16).map((item, i) => (
            <div key={`${item.selector}-${i}`} style={{ marginBottom: "0.3rem" }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: "9px",
                  color: ink,
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                }}
              >
                {item.selector}
                <span style={{ color: inkDim }}> {item.size}</span>
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: "8px",
                  color: inkFaint,
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                  marginTop: "1px",
                }}
              >
                {item.details.join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </aside>
  )
}
