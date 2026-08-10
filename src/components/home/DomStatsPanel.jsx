import { useCallback, useEffect, useRef, useState } from "react"
import { ACCENTS, REQUEST_TYPE_TEXT_COLORS, TEXT, TEXT_ACCENTS, rgba, tagAccent, tagTextAccent } from "../../data/homeColors.js"
import { glassPlain, DitherRamp } from "./panelChrome.jsx"

const OVERLAY_ID = "dom-stats-xray-overlay"
const mono = "'DepartureMono', monospace"
const ink = TEXT.primary
const inkDim = TEXT.secondary
const inkFaint = TEXT.tertiary
const MAX_LOG_ENTRIES = 80

// Matches --ui-scale in layout.astro; canvas text can't use CSS calc()
function useUiScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1600px)")
    const update = () => setScale(mq.matches ? 1.2 : 1)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return scale
}

function shortUrl(name) {
  try {
    const u = new URL(name, window.location.href)
    const path = `${u.pathname}${u.search}`
    return u.origin === window.location.origin ? path : `${u.host}${path}`
  } catch {
    return name
  }
}

function fmtBytes(bytes) {
  if (!bytes) return "0B"
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / 1024 / 1024).toFixed(2)}M`
}

function toLogRow(entry) {
  return {
    at: entry.startTime,
    type: entry.entryType === "navigation" ? "doc" : (entry.initiatorType || "other"),
    url: shortUrl(entry.name),
    size: entry.transferSize ?? 0,
    duration: entry.duration,
  }
}

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

function DitherNumber({ value, fontSize: baseFontSize = 13, bold = false, levels = 4, tint }) {
  const canvasRef = useRef(null)
  const uiScale = useUiScale()
  const fontSize = Math.round(baseFontSize * uiScale)

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
    ctx.fillStyle = tint ?? "#000000"
    ctx.textBaseline = "middle"
    ctx.fillText(text, 3 * dpr, h / 2)

    const [tr, tg, tb] = tint
      ? [
          parseInt(tint.slice(1, 3), 16),
          parseInt(tint.slice(3, 5), 16),
          parseInt(tint.slice(5, 7), 16),
        ]
      : [0, 0, 0]

    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const threshold = BAYER8[(y % 8) * 8 + (x % 8)] / 64.0 - 0.5
        const a = data[i + 3] / 255
        const qa = Math.min(1, Math.max(0, a + threshold / levels))
        const out = qa > 0.5 ? 255 : 0
        data[i] = tr
        data[i + 1] = tg
        data[i + 2] = tb
        data[i + 3] = out
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [value, fontSize, bold, levels, tint])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "inline-block", verticalAlign: "middle", imageRendering: "pixelated" }}
    />
  )
}

function collectStats() {
  const all = document.querySelectorAll("*")
  const tagCounts = {}
  for (const el of all) {
    const tag = el.tagName.toLowerCase()
    tagCounts[tag] = (tagCounts[tag] || 0) + 1
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return { topTags }
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

function paintXrayBoxes(overlay, tag, panelEl, accent) {
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
      border: `1px solid ${rgba(accent, 0.45)}`,
      background: rgba(accent, 0.05),
      boxShadow: `0 0 12px ${rgba(accent, 0.12)}`,
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
      fontSize: "calc(8.5px * var(--ui-scale, 1))",
      letterSpacing: "0.02em",
      lineHeight: 1.35,
      color: "#0a0a0a",
      background: `linear-gradient(160deg, rgba(255,255,255,0.97), ${rgba(accent, 0.06)})`,
      border: `1px solid ${rgba(accent, 0.28)}`,
      boxShadow: `3px 3px 0 ${rgba(accent, 0.08)}, 3px 3px 0 1px rgba(0,0,0,0.03)`,
      padding: "3px 6px",
      maxWidth: "min(300px, 42vw)",
      pointerEvents: "none",
      zIndex: "1",
    })

    const title = document.createElement("div")
    title.textContent = `${selector} · ${size}`
    title.style.color = TEXT.primary
    title.style.whiteSpace = "nowrap"
    title.style.overflow = "hidden"
    title.style.textOverflow = "ellipsis"
    card.appendChild(title)

    const meta = document.createElement("div")
    meta.textContent = details.join(" · ")
    meta.style.color = TEXT.tertiary
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

function Row({ label, value, faint = false, active = false, accentColor, onEnter, onLeave }) {
  const labelColor = active
    ? (accentColor ?? ink)
    : (faint ? inkFaint : inkDim)
  const leaderColor = active && accentColor
    ? rgba(accentColor, 0.45)
    : inkFaint

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
          fontSize: "calc(9px * var(--ui-scale, 1))",
          letterSpacing: "0.08em",
          color: labelColor,
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
          borderBottom: `1px dotted ${leaderColor}`,
          margin: "0 4px",
          transform: "translateY(-3px)",
          minWidth: "8px",
        }}
      />
      <DitherNumber
        value={value}
        fontSize={10}
        levels={active ? 2 : 4}
        tint={active ? accentColor : undefined}
      />
    </div>
  )
}

export default function DomStatsPanel() {
  const [open, setOpen] = useState(true)
  const [stats, setStats] = useState(null)
  const [logRows, setLogRows] = useState([])
  const [logTotals, setLogTotals] = useState({ count: 0, bytes: 0 })
  const [hoveredTag, setHoveredTag] = useState(null)
  const panelRef = useRef(null)
  const logListRef = useRef(null)
  const hoveredTagRef = useRef(null)
  const hoveredAccentRef = useRef(ACCENTS.pink)

  const showXray = useCallback((tag, accent) => {
    hoveredTagRef.current = tag
    hoveredAccentRef.current = accent
    setHoveredTag(tag)
    const overlay = ensureXrayOverlay()
    paintXrayBoxes(overlay, tag, panelRef.current, accent)
  }, [])

  const hideXray = useCallback(() => {
    hoveredTagRef.current = null
    setHoveredTag(null)
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
    const observer = new PerformanceObserver((list) => {
      const next = list.getEntries().map(toLogRow)
      if (next.length === 0) return
      setLogRows((prev) => [...prev, ...next].slice(-MAX_LOG_ENTRIES))
      setLogTotals((prev) => ({
        count: prev.count + next.length,
        bytes: prev.bytes + next.reduce((sum, row) => sum + row.size, 0),
      }))
    })
    observer.observe({ type: "navigation", buffered: true })
    observer.observe({ type: "resource", buffered: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const list = logListRef.current
    if (list && open) list.scrollTop = list.scrollHeight
  }, [logRows, open])

  useEffect(() => {
    const update = () => {
      const tag = hoveredTagRef.current
      if (!tag) return
      const overlay = document.getElementById(OVERLAY_ID)
      if (overlay) paintXrayBoxes(overlay, tag, panelRef.current, hoveredAccentRef.current)
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [])

  useEffect(() => () => clearXray(), [])

  const panelShell = {
    position: "absolute",
    left: "2rem",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 16777272,
    pointerEvents: "auto",
  }

  const toggleBtnStyle = {
    fontFamily: mono,
    fontSize: "calc(9px * var(--ui-scale, 1))",
    letterSpacing: "0.32em",
    color: inkFaint,
    textTransform: "uppercase",
    background: "none",
    border: "none",
    padding: "0.65rem 0.8rem",
    cursor: "pointer",
    ...glassPlain,
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-expanded={false}
        aria-label="Show stats panel"
        className="absolute"
        style={{ ...panelShell, ...toggleBtnStyle }}
      >
        [+]
      </button>
    )
  }

  if (!stats) return null

  return (
    <aside
      ref={panelRef}
      className="absolute"
      style={{
        ...panelShell,
        width: "clamp(240px, 18vw, 320px)",
      }}
      aria-label="Document statistics and network log"
    >
      <div
        style={{
          maxHeight: "calc(100vh - 6rem)",
          overflowY: "auto",
          padding: "0.65rem 0.8rem 0.7rem",
          ...glassPlain,
        }}
      >
      <style>{`
        @keyframes request-log-blink {
          0%, 55% { opacity: 1; }
          56%, 100% { opacity: 0.15; }
        }
      `}</style>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          fontFamily: mono,
          fontSize: "calc(9px * var(--ui-scale, 1))",
          letterSpacing: "0.32em",
          color: inkFaint,
          marginBottom: "0.45rem",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "flex-end",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <span style={{ color: inkFaint, letterSpacing: "0.05em" }}>[–]</span>
      </button>

      <div
        style={{
          fontFamily: mono,
          fontSize: "calc(12px * var(--ui-scale, 1))",
          letterSpacing: "0.28em",
          color: inkFaint,
          marginBottom: "0.3rem",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        document.stats
      </div>

      <div
        style={{
          fontFamily: mono,
          fontSize: "calc(8px * var(--ui-scale, 1))",
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
        {stats.topTags.map(([tag, count], i) => {
          const accent = tagAccent(tag, i)
          const textAccent = tagTextAccent(tag, i)
          const active = hoveredTag === tag
          return (
            <Row
              key={tag}
              label={`<${tag}>`}
              value={count}
              faint={!active}
              active={active}
              accentColor={textAccent}
              onEnter={() => showXray(tag, accent)}
              onLeave={hideXray}
            />
          )
        })}
      </div>

      <DitherRamp
        style={{ margin: "0.55rem 0 0.4rem" }}
        tint={`linear-gradient(90deg, ${ACCENTS.violet}, ${ACCENTS.magenta}, transparent)`}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: mono,
          fontSize: "calc(8px * var(--ui-scale, 1))",
          letterSpacing: "0.28em",
          color: inkFaint,
          textTransform: "uppercase",
          marginBottom: "0.3rem",
        }}
      >
        <span>network.log</span>
        <span style={{ letterSpacing: "0.08em", display: "flex", gap: "0.7em", alignItems: "baseline" }}>
          <span style={{ color: inkDim }}>{logTotals.count} req · {fmtBytes(logTotals.bytes)}</span>
          <span style={{ color: TEXT_ACCENTS.pink, animation: "request-log-blink 1.2s steps(1) infinite" }}>● rec</span>
        </span>
      </div>

      <div ref={logListRef} style={{ maxHeight: "96px", overflowY: "auto" }}>
        {logRows.map((row, i) => {
          const typeColor = REQUEST_TYPE_TEXT_COLORS[row.type] ?? REQUEST_TYPE_TEXT_COLORS.other
          return (
            <div
              key={`${row.url}-${row.at}-${i}`}
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "baseline",
                fontFamily: mono,
                fontSize: "calc(8.5px * var(--ui-scale, 1))",
                letterSpacing: "0.02em",
                lineHeight: 1.7,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: inkFaint, width: "44px", flexShrink: 0, textAlign: "right" }}>
                +{(row.at / 1000).toFixed(2)}s
              </span>
              <span style={{ color: typeColor, width: "40px", flexShrink: 0, fontWeight: 500 }}>{row.type}</span>
              <span style={{ color: inkDim, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.url}
              </span>
              <span style={{ color: inkDim, width: "36px", flexShrink: 0, textAlign: "right" }}>
                {fmtBytes(row.size)}
              </span>
            </div>
          )
        })}
      </div>
      </div>

    </aside>
  )
}
