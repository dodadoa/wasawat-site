import { useEffect, useRef, useState } from "react"

let _instanceCount = 0

const WORKS = [
  {
    id: "gimme-the-light",
    label: "Gimme the light",
    x: -0.78,
    y: 0.74,
    slug: "/art/gimme-the-light",
  },
  {
    id: "from-scratch",
    label: "From Scratch",
    x: -0.48,
    y: 0.82,
    slug: "/art/from-scratch-live-coding",
  },
  {
    id: "unfest",
    label: "Unfest2025",
    x: -0.36,
    y: 0.55,
    slug: "/art/unfest2025",
  },
  {
    id: "vina-v",
    label: "VinA/V #02",
    x: -0.22,
    y: 0.68,
    slug: "/art/vina-v-para-cartography",
  },
  {
    id: "byob",
    label: "BYOB",
    x: -0.6,
    y: 0.44,
    slug: "/art/byob",
  },
  {
    id: "here-now",
    label: "Here-now; absolute-elsewhere.",
    x: 0.62,
    y: 0.72,
    slug: "/art/here-now-absolute-elsewhere",
  },
  {
    id: "self-censored",
    label: "Self-censored Step Sequencer",
    x: 0.5,
    y: 0.38,
    slug: "/art/self-censored-step-sequencer",
  },
  {
    id: "eternal-gain",
    label: "Eternal Gain, Eternal Pain.",
    x: 0.72,
    y: -0.6,
    slug: "/art/eternal-gain-eternal-pain",
  },
  {
    id: "as-if",
    label: "As if you would still be here",
    x: -0.62,
    y: -0.64,
    slug: "/art/as-if-you-would-still-be-here",
  },
]

const QUADRANT_LABELS = [
  { qx: -1, qy: 1, label: "Here, with you" },
  { qx: 1, qy: 1, label: "The system is running" },
  { qx: -1, qy: -1, label: "I keep thinking\nabout you" },
  { qx: 1, qy: -1, label: "Would you still love me\nif I was digital" },
]

const toPos = (v, axis) => {
  const pct = ((v + 1) / 2) * 86 + 7
  return axis === "y" ? `${100 - pct}%` : `${pct}%`
}

const qLabelPos = (qx, qy) => ({
  left: qx < 0 ? "5%" : "52%",
  top: qy > 0 ? "5%" : "52%",
})

const axisLabel = {
  fontSize: "12px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--text-dim)",
}

export default function HomeQuadrant() {
  const [active, setActive] = useState(false)
  const instanceRef = useRef(false)

  useEffect(() => {
    if (_instanceCount > 0) return
    _instanceCount++
    instanceRef.current = true
    setActive(true)
    return () => {
      if (instanceRef.current) {
        _instanceCount--
        instanceRef.current = false
      }
    }
  }, [])

  if (!active) return null

  return (
    <div
      id="home-quadrant"
      className="fixed left-0 right-0 bottom-0 font-mono overflow-hidden select-none bg-black"
      style={{ top: "4rem" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-full" style={{ top: "50%", borderTop: "1px solid var(--border)" }} />
        <div className="absolute h-full" style={{ left: "50%", borderLeft: "1px solid var(--border)" }} />
      </div>

      <span className="absolute" style={{ ...axisLabel, top: "50%", left: "2.5%", transform: "translateY(-50%)" }}>
        body
      </span>
      <span className="absolute" style={{ ...axisLabel, top: "50%", right: "2.5%", transform: "translateY(-50%)" }}>
        machine
      </span>
      <span className="absolute" style={{ ...axisLabel, left: "50%", top: "1.5%", transform: "translateX(-50%)" }}>
        presence
      </span>
      <span className="absolute" style={{ ...axisLabel, left: "50%", bottom: "1.5%", transform: "translateX(-50%)" }}>
        archive
      </span>

      {QUADRANT_LABELS.map((q) => (
        <span
          key={q.label}
          className="absolute text-[12px] leading-tight pointer-events-none whitespace-pre-line uppercase tracking-wide"
          style={{ ...qLabelPos(q.qx, q.qy), color: "var(--text-dim)" }}
        >
          {q.label}
        </span>
      ))}

      <div
        className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "var(--text-dim)",
        }}
      />

      {WORKS.map((work) => (
        <a
          key={work.id}
          href={work.slug}
          className="absolute"
          style={{
            left: toPos(work.x, "x"),
            top: toPos(work.y, "y"),
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <span
            className="block text-[12px] px-2 py-0.5 whitespace-nowrap leading-5 uppercase tracking-wide bg-black"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            {work.label}
          </span>
        </a>
      ))}

      <span
        className="absolute text-[12px] tracking-[0.2em] uppercase pointer-events-none"
        style={{ bottom: "3%", right: "2%", color: "var(--text-dim)" }}
      >
        Wasawat Somno
      </span>
    </div>
  )
}
