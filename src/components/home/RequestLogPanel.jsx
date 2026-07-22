import { useEffect, useRef, useState } from "react"
import { glassBrutal, DitherRamp } from "./panelChrome.jsx"

const mono = "'JetBrains Mono', monospace"
const ink = "#ffffff"
const inkDim = "rgba(255,255,255,0.8)"
const inkFaint = "rgba(255,255,255,0.55)"

const MAX_ENTRIES = 80

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

function toRow(entry) {
  return {
    at: entry.startTime,
    type: entry.entryType === "navigation" ? "doc" : (entry.initiatorType || "other"),
    url: shortUrl(entry.name),
    size: entry.transferSize ?? 0,
    duration: entry.duration,
  }
}

export default function RequestLogPanel() {
  const [rows, setRows] = useState([])
  // running totals over every recorded request, independent of the display cap
  const [totals, setTotals] = useState({ count: 0, bytes: 0 })
  const listRef = useRef(null)

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const next = list.getEntries().map(toRow)
      if (next.length === 0) return
      setRows((prev) => [...prev, ...next].slice(-MAX_ENTRIES))
      setTotals((prev) => ({
        count: prev.count + next.length,
        bytes: prev.bytes + next.reduce((sum, row) => sum + row.size, 0),
      }))
    })
    observer.observe({ type: "navigation", buffered: true })
    observer.observe({ type: "resource", buffered: true })
    return () => observer.disconnect()
  }, [])

  // keep the newest line in view
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [rows])

  return (
    <aside
      className="absolute"
      style={{
        left: "50%",
        bottom: "1.4rem",
        transform: "translateX(-50%)",
        width: "min(680px, 58vw)",
        padding: "0.55rem 0.9rem 0.6rem",
        ...glassBrutal,
        pointerEvents: "auto",
        zIndex: 16777272,
      }}
      aria-label="Network request log"
    >
      <style>{`
        @keyframes request-log-blink {
          0%, 55% { opacity: 1; }
          56%, 100% { opacity: 0.15; }
        }
      `}</style>

      {/* header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: mono,
          fontSize: "9px",
          letterSpacing: "0.32em",
          color: inkFaint,
          textTransform: "uppercase",
          marginBottom: "0.35rem",
        }}
      >
        <span>network.log</span>
        <span style={{ letterSpacing: "0.08em", display: "flex", gap: "0.7em", alignItems: "baseline" }}>
          <span style={{ color: inkDim }}>{totals.count} req · {fmtBytes(totals.bytes)}</span>
          <span style={{ color: ink, animation: "request-log-blink 1.2s steps(1) infinite" }}>● rec</span>
        </span>
      </div>

      <DitherRamp style={{ marginBottom: "0.3rem" }} />

      {/* log lines */}
      <div ref={listRef} style={{ maxHeight: "88px", overflowY: "auto" }}>
        {rows.map((row, i) => (
          <div
            key={`${row.url}-${row.at}-${i}`}
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "baseline",
              fontFamily: mono,
              fontSize: "8.5px",
              letterSpacing: "0.02em",
              lineHeight: 1.7,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: inkFaint, width: "52px", flexShrink: 0, textAlign: "right" }}>
              +{(row.at / 1000).toFixed(2)}s
            </span>
            <span style={{ color: ink, width: "48px", flexShrink: 0 }}>{row.type}</span>
            <span style={{ color: inkDim, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
              {row.url}
            </span>
            <span style={{ color: inkDim, width: "44px", flexShrink: 0, textAlign: "right" }}>
              {fmtBytes(row.size)}
            </span>
            <span style={{ color: inkFaint, width: "48px", flexShrink: 0, textAlign: "right" }}>
              {row.duration.toFixed(0)}ms
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
