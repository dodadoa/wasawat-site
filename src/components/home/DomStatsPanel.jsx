import { useCallback, useEffect, useRef, useState } from "react"

const OVERLAY_ID = "dom-stats-xray-overlay"
const mono = "'JetBrains Mono', monospace"
const serif = "'Cormorant Garamond', serif"
const ink = "#ffffff"
const inkDim = "rgba(255,255,255,0.65)"
const inkFaint = "rgba(255,255,255,0.2)"

const tagMain = {
  fontFamily: mono,
  color: ink,
  fontWeight: 500,
}

const valueSecondary = {
  fontFamily: serif,
  fontStyle: "italic",
  color: inkDim,
  fontVariantNumeric: "tabular-nums",
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

/** @param {Element} el @param {DOMRect} rect */
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
      background: "rgba(0,0,0,0.9)",
      border: "1px solid rgba(255,255,255,0.3)",
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

export default function DomStatsPanel() {
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
    setStats(collectStats())
    const id = setInterval(() => setStats(collectStats()), 1000)
    return () => clearInterval(id)
  }, [])

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
        width: "clamp(210px, 19vw, 280px)",
        padding: "1.1rem 1.25rem 1.2rem",
        background: "rgba(10,10,10,0.65)",
        backdropFilter: "blur(24px) saturate(140%)",
        WebkitBackdropFilter: "blur(24px) saturate(140%)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: "18px",
        boxShadow:
          "0 0 60px 8px rgba(255,255,255,0.14), 0 16px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.28)",
        pointerEvents: "auto",
        zIndex: 16777272,
      }}
      aria-label="Document statistics"
    >
      <div
        className="flex items-baseline justify-between"
        style={{ fontFamily: mono, fontSize: "9px", letterSpacing: "0.3em", color: inkFaint, pointerEvents: "none" }}
      >
        <span>LIVE</span>
        <span>/1S</span>
      </div>

      <div style={{ marginTop: "0.45rem" }}>
        {stats.topTags.map(([tag, count]) => {
          const active = hoveredTag === tag
          return (
            <div
              key={tag}
              className="flex items-baseline justify-between"
              style={{
                padding: "0.12rem 0",
                cursor: "crosshair",
                opacity: 1,
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={() => showXray(tag)}
              onMouseLeave={hideXray}
            >
              <span
                style={{
                  ...tagMain,
                  fontSize: "0.95rem",
                  letterSpacing: "0.02em",
                  lineHeight: 1.15,
                  color: active ? "#ffffff" : ink,
                  textShadow: active ? "0 0 12px rgba(255,255,255,0.65)" : "none",
                }}
              >
                {"<"}{tag}{">"}
              </span>
              <span
                style={{
                  ...valueSecondary,
                  fontFamily: mono,
                  fontStyle: "normal",
                  fontSize: "9px",
                  letterSpacing: "0.14em",
                  color: active ? inkDim : inkFaint,
                }}
              >
                {count}
              </span>
            </div>
          )
        })}
      </div>

      {hoveredTag && matchMetadata.length > 0 && (
        <div
          style={{
            marginTop: "0.45rem",
            paddingTop: "0.45rem",
            borderTop: `1px solid ${inkFaint}`,
            maxHeight: "150px",
            overflowY: "auto",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: "9px",
              letterSpacing: "0.28em",
              color: inkFaint,
              marginBottom: "0.35rem",
            }}
          >
            METADATA · &lt;{hoveredTag}&gt;
          </div>
          {matchMetadata.slice(0, 16).map((item, i) => (
            <div key={`${item.selector}-${i}`} style={{ marginBottom: "0.35rem" }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: "9.5px",
                  color: ink,
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                }}
              >
                {item.selector}
                <span style={{ color: inkDim }}> · {item.size}</span>
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: "8px",
                  color: inkFaint,
                  letterSpacing: "0.02em",
                  lineHeight: 1.35,
                  marginTop: "1px",
                }}
              >
                {item.details.join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${inkFaint}`, margin: "0.55rem 0 0.4rem", pointerEvents: "none" }} />

      <div
        style={{
          fontFamily: mono,
          fontSize: "9px",
          letterSpacing: "0.28em",
          color: inkFaint,
          marginBottom: "0.35rem",
          pointerEvents: "none",
        }}
      >
        DOCUMENT
      </div>

      <div className="flex items-baseline gap-2" style={{ marginBottom: "0.25rem", pointerEvents: "none" }}>
        <span style={{ ...tagMain, fontSize: "10px", letterSpacing: "0.14em", color: inkDim, textTransform: "uppercase" }}>
          elements
        </span>
        <span style={{ ...valueSecondary, fontSize: "0.85rem", lineHeight: 1 }}>
          {stats.elements}
        </span>
      </div>

      {stats.rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline" style={{ gap: "0.45rem", padding: "0.1rem 0", pointerEvents: "none" }}>
          <span
            style={{
              ...tagMain,
              fontSize: "9px",
              letterSpacing: "0.12em",
              color: inkDim,
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
          <span style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.08)", transform: "translateY(-2px)" }} />
          <span style={{ ...valueSecondary, fontSize: "0.8rem", lineHeight: 1.1 }}>
            {value}
          </span>
        </div>
      ))}
    </aside>
  )
}
