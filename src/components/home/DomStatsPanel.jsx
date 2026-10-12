import { useCallback, useEffect, useRef, useState } from "react"
import { INK, LINE, PAPER, RED, REQUEST_TYPE_TEXT_COLORS, TEXT } from "../../data/homeColors.js"
import { glassPlain, DitherRamp } from "./panelChrome.jsx"

const OVERLAY_ID = "dom-stats-xray-overlay"
const mono = "'DepartureMono', monospace"
const dataMono = "'PragmataPro Mono', ui-monospace, Menlo, monospace"
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
    const h = Math.ceil(fontSize * 1.3 * dpr)

    canvas.width = w
    canvas.height = h
    canvas.style.width = `${w / dpr}px`
    canvas.style.height = `${h / dpr}px`

    ctx.clearRect(0, 0, w, h)
    ctx.font = fontDecl
    ctx.fillStyle = tint ?? INK
    ctx.textBaseline = "middle"
    ctx.fillText(text, 3 * dpr, h / 2)

    const [tr, tg, tb] = tint
      ? [
          parseInt(tint.slice(1, 3), 16),
          parseInt(tint.slice(3, 5), 16),
          parseInt(tint.slice(5, 7), 16),
        ]
      : [0x14, 0x14, 0x14]

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
    .slice(0, 14)

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
      // x-ray outline: a fine red line, nothing filled
      border: `1px solid ${RED}`,
      background: "transparent",
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
      fontSize: "calc(10px * var(--ui-scale, 1))",
      letterSpacing: "0.04em",
      lineHeight: 1.4,
      color: INK,
      background: PAPER,
      border: `1px solid ${INK}`,
      boxShadow: `4px 4px 0 -1px ${PAPER}, 4px 4px 0 0 ${INK}`,
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
    meta.style.fontFamily = dataMono
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

function Row({ label, value, active = false, onEnter, onLeave }) {
  // hovered row is a full inversion: ink bar, paper text
  const fg = active ? PAPER : ink

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 0,
        padding: "1px 4px",
        margin: "0 -4px",
        lineHeight: 1.3,
        background: active ? INK : "transparent",
        cursor: onEnter ? "crosshair" : "default",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <span
        style={{
          fontFamily: mono,
          fontSize: "calc(11px * var(--ui-scale, 1))",
          letterSpacing: "0.06em",
          color: fg,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          borderBottom: `1px dotted ${active ? PAPER : LINE}`,
          margin: "0 4px",
          transform: "translateY(-3px)",
          minWidth: "8px",
        }}
      />
      <DitherNumber value={value} fontSize={11} levels={active ? 2 : 4} tint={fg} />
    </div>
  )
}

export default function DomStatsPanel() {
  const [stats, setStats] = useState(null)
  const [logRows, setLogRows] = useState([])
  const [logTotals, setLogTotals] = useState({ count: 0, bytes: 0 })
  const [hoveredTag, setHoveredTag] = useState(null)
  const panelRef = useRef(null)
  const logListRef = useRef(null)
  const hoveredTagRef = useRef(null)

  const showXray = useCallback((tag) => {
    hoveredTagRef.current = tag
    setHoveredTag(tag)
    const overlay = ensureXrayOverlay()
    paintXrayBoxes(overlay, tag, panelRef.current)
  }, [])

  const hideXray = useCallback(() => {
    hoveredTagRef.current = null
    setHoveredTag(null)
    clearXray()
  }, [])

  useEffect(() => {
    setStats(collectStats())
    const id = setInterval(() => setStats(collectStats()), 1000)
    return () => clearInterval(id)
  }, [])

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

  // mirrors the right genre-tab panel: full-height column with its own border
  const panelShell = {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minWidth: "clamp(260px, 24vw, 380px)",
    paddingLeft: "2rem",
    paddingRight: "clamp(1.5rem, 3vw, 3rem)",
    borderRight: `1px solid ${LINE}`,
    background: PAPER,
    zIndex: 16777272,
    pointerEvents: "auto",
  }

  if (!stats) return null

  return (
    <aside
      ref={panelRef}
      className="absolute"
      style={{
        ...panelShell,
        width: "clamp(280px, 24vw, 380px)",
      }}
      aria-label="Document statistics and network log"
    >
      <div
        style={{
          // the panel itself never scrolls; when it runs out of height the
          // net.log list (the only scroller) gives up the space
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 6rem)",
          overflow: "hidden",
          width: "100%",
          padding: "0.65rem 0.8rem 0.7rem",
          ...glassPlain,
        }}
      >
      <div
        style={{
          fontFamily: mono,
          fontSize: "calc(13px * var(--ui-scale, 1))",
          letterSpacing: "0.12em",
          color: ink,
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
          fontSize: "calc(11px * var(--ui-scale, 1))",
          letterSpacing: "0.12em",
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
              active={active}
              onEnter={() => showXray(tag)}
              onLeave={hideXray}
            />
          )
        })}
      </div>

      <DitherRamp style={{ margin: "0.7rem 0 0.55rem" }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: mono,
          fontSize: "calc(11px * var(--ui-scale, 1))",
          letterSpacing: "0.12em",
          color: inkFaint,
          textTransform: "uppercase",
          marginBottom: "0.3rem",
          gap: "0.6em",
        }}
      >
        <span>net.log</span>
        <span style={{ letterSpacing: "0.08em", display: "flex", gap: "0.7em", alignItems: "baseline", whiteSpace: "nowrap" }}>
          <span style={{ color: inkFaint, fontFamily: dataMono, fontSize: "calc(10px * var(--ui-scale, 1))", letterSpacing: 0 }}>{logTotals.count} req · {fmtBytes(logTotals.bytes)}</span>
          <span style={{ background: INK, color: PAPER, padding: "0 0.4em" }}>rec</span>
        </span>
      </div>

      <div ref={logListRef} style={{ flex: "0 1 auto", minHeight: 0, maxHeight: "clamp(160px, 28vh, 320px)", overflowY: "auto", overscrollBehavior: "contain" }}>
        {logRows.map((row, i) => {
          const typeColor = REQUEST_TYPE_TEXT_COLORS[row.type] ?? REQUEST_TYPE_TEXT_COLORS.other
          return (
            <div
              key={`${row.url}-${row.at}-${i}`}
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "baseline",
                fontFamily: dataMono,
                fontSize: "calc(10px * var(--ui-scale, 1))",
                lineHeight: 1.6,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: inkFaint, width: "52px", flexShrink: 0, textAlign: "right" }}>
                +{(row.at / 1000).toFixed(2)}s
              </span>
              <span style={{ color: typeColor, width: "40px", flexShrink: 0 }}>{row.type}</span>
              <span style={{ color: inkFaint, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.url}
              </span>
              <span style={{ color: inkFaint, width: "40px", flexShrink: 0, textAlign: "right" }}>
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
