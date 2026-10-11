import { useEffect, useRef, useState } from "react"
import { animate, dither, lowRes } from "./dither"
import "./sims.css"

const NAMES = ["A", "B", "C"]

const PAIRS = [
  [0, 1],
  [1, 2],
  [2, 0],
]

const TOPICS = ["tariff", "area", "border", "wifi", "international finance"]

// the orbit is drawn for a stage this tall and zoomed to fit its box
const STAGE_H = 640

function seed() {
  const spin = Math.random() * Math.PI * 2
  return NAMES.map((name, i) => {
    const a = spin + (i * Math.PI * 2) / 3
    const r = 0.45 + Math.random() * 0.2
    const v = 0.55 + Math.random() * 0.25
    return {
      name,
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      vx: -Math.sin(a) * v + (Math.random() - 0.5) * 0.3,
      vy: Math.cos(a) * v + (Math.random() - 0.5) * 0.3,
      trail: [],
    }
  })
}

function step(b, dt) {
  const ax = [0, 0, 0]
  const ay = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === j) continue
      const dx = b[j].x - b[i].x
      const dy = b[j].y - b[i].y
      const d2 = dx * dx + dy * dy + 0.004
      const inv = 0.32 / (d2 * Math.sqrt(d2))
      ax[i] += dx * inv
      ay[i] += dy * inv
    }
    // weak pull to the centre keeps the system on stage
    ax[i] -= b[i].x * 0.35
    ay[i] -= b[i].y * 0.35
  }
  for (let i = 0; i < 3; i++) {
    b[i].vx += ax[i] * dt
    b[i].vy += ay[i] * dt
    const sp = Math.hypot(b[i].vx, b[i].vy)
    if (sp > 2.6) {
      b[i].vx *= 2.6 / sp
      b[i].vy *= 2.6 / sp
    }
    b[i].x += b[i].vx * dt
    b[i].y += b[i].vy * dt
  }
}

function stateOf(t) {
  if (t > 0.85) return "COLLISION"
  if (t > 0.6) return "CRISIS"
  if (t > 0.35) return "FRICTION"
  return "STABLE"
}

// A simplified version of the installation's system: the distance between
// each pair of bodies is read as tension, and each crossing of the threshold
// writes a new prompt. In the installation that prompt goes to an LLM.
export default function ThreeBody() {
  const canvasRef = useRef(null)
  const [info, setInfo] = useState({ pairs: [0, 0, 0], tension: 0, topic: TOPICS[0], events: 0 })
  const resetRef = useRef(0)
  const labels = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    let bodies = seed()
    let frame = 0
    let events = 0
    let wasHot = false
    let topic = TOPICS[0]
    let seenReset = resetRef.current

    return animate(canvas, () => {
      if (seenReset !== resetRef.current) {
        seenReset = resetRef.current
        bodies = seed()
        events = 0
      }
      const zoom = Math.min(canvas.clientWidth, canvas.clientHeight) / STAGE_H
      const { w, h } = lowRes(canvas, ctx, zoom)

      for (let k = 0; k < 4; k++) step(bodies, 0.0022)
      const s = Math.min(w, h) * 0.42
      const px = (b) => [w / 2 + b.x * s, h / 2 + b.y * s]

      const pairs = PAIRS.map(([i, j]) => {
        const d = Math.hypot(bodies[i].x - bodies[j].x, bodies[i].y - bodies[j].y)
        return Math.max(0, Math.min(1, 1 - d / 1.1))
      })
      const tension = Math.max(...pairs)

      // tension lines between bodies
      PAIRS.forEach(([i, j], k) => {
        const [x1, y1] = px(bodies[i])
        const [x2, y2] = px(bodies[j])
        ctx.strokeStyle = `rgba(255,255,255,${0.1 + pairs[k] * 0.9})`
        ctx.lineWidth = 2 + pairs[k] * 5
        ctx.setLineDash(pairs[k] > 0.6 ? [] : [9, 12])
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      })
      ctx.setLineDash([])

      bodies.forEach((b, bi) => {
        const [x, y] = px(b)
        const tag = labels.current[bi]
        if (tag) tag.style.transform = `translate(${(x + 20) * zoom}px, ${(y - 30) * zoom}px)`
        b.trail.push(x, y)
        if (b.trail.length > 520) b.trail.splice(0, 2)
        const n = b.trail.length / 2
        for (let i = 1; i < n; i++) {
          ctx.strokeStyle = "#fff"
          ctx.globalAlpha = (i / n) ** 2 * 0.7
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(b.trail[i * 2 - 2], b.trail[i * 2 - 1])
          ctx.lineTo(b.trail[i * 2], b.trail[i * 2 + 1])
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = "#fff"
        ctx.shadowColor = "#fff"
        ctx.shadowBlur = 60 * zoom
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.fill()
        ctx.shadowBlur = 0
      })
      dither(canvas, ctx)

      const hot = tension > 0.6
      if (hot && !wasHot) {
        events++
        topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
      }
      wasHot = hot

      if (frame % 8 === 0) setInfo({ pairs, tension, topic, events })
      frame++
    })
  }, [])

  const st = stateOf(info.tension)

  return (
    <div className="tb">
      <div className="tb-stage">
        <canvas ref={canvasRef} className="sim-canvas" />
        {NAMES.map((n, k) => (
          <span
            className="tb-tag"
            key={n}
            ref={(el) => {
              labels.current[k] = el
            }}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="tb-hud">
        <div className="tb-row">
          <span className="tb-label">state</span>
          <b className={`tb-state tb-state-${st.toLowerCase()}`}>{st}</b>
        </div>
        {PAIRS.map(([i, j], k) => (
          <div className="tb-row" key={k}>
            <span className="tb-label">
              {NAMES[i]} ↔ {NAMES[j]}
            </span>
            <span className="tb-bar">
              <i style={{ width: `${info.pairs[k] * 100}%` }} />
            </span>
          </div>
        ))}
        <pre className="tb-prompt">{`> prompt #${String(info.events).padStart(3, "0")}
tension: ${info.tension.toFixed(2)}
topic:   ${info.topic}
memory:  ${info.events} prior events
write a short speculative
fiction about what happens next.`}</pre>
        <button
          type="button"
          className="tb-btn"
          onClick={() => {
            resetRef.current++
          }}
        >
          → new initial conditions
        </button>
      </div>
    </div>
  )
}
