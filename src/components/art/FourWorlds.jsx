import { useEffect, useRef } from "react"
import { animate, dither, lowRes } from "./dither"
import "./sims.css"

const LOOK = {
  pain: { glow: 46, speed: 2.4, turn: 0.5, rate: 0.5 },
  pleasure: { glow: 26, speed: 0.8, turn: 0.06, rate: 0.16 },
  absent: { glow: 0, speed: 0, turn: 0, rate: 0 },
}

const SEG = 26
const LEN = 6
// the worm is drawn for a screen this tall and zoomed to fit its cell
const SCREEN_H = 390

// An illustration only. The installation runs OpenWorm / c302.
function Worm({ mood }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext("2d")
    const look = LOOK[mood]
    let t = 0
    let heading = Math.random() * Math.PI * 2
    let pts = null
    const spikes = []

    return animate(canvas, () => {
      const zoom = canvas.clientHeight / SCREEN_H
      const { w, h } = lowRes(canvas, ctx, zoom)
      const rasterH = 34
      const fieldH = h - rasterH

      if (mood !== "absent") {
        if (!pts) pts = Array.from({ length: SEG }, (_, i) => ({ x: w / 2 - i * LEN, y: fieldH / 2 }))
        const head = pts[0]
        t += 0.016
        heading += Math.sin(t * (mood === "pain" ? 17 : 5)) * 0.07 + (Math.random() - 0.5) * look.turn
        if (mood === "pain" && Math.random() < 0.015) heading += Math.PI * (0.6 + Math.random() * 0.8)
        // steer back when close to the edge of the screen
        const m = 40
        if (head.x < m || head.x > w - m || head.y < m || head.y > fieldH - m) {
          const to = Math.atan2(fieldH / 2 - head.y, w / 2 - head.x)
          let diff = to - heading
          diff = Math.atan2(Math.sin(diff), Math.cos(diff))
          heading += diff * 0.08
        }
        head.x += Math.cos(heading) * look.speed
        head.y += Math.sin(heading) * look.speed
        for (let i = 1; i < SEG; i++) {
          const a = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x)
          pts[i].x = pts[i - 1].x + Math.cos(a) * LEN
          pts[i].y = pts[i - 1].y + Math.sin(a) * LEN
        }
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.strokeStyle = "#fff"
        ctx.shadowColor = "#fff"
        ctx.shadowBlur = look.glow * zoom
        for (let i = 1; i < SEG; i++) {
          const k = i / SEG
          ctx.lineWidth = 4 + Math.sin(k * Math.PI) * 11
          ctx.beginPath()
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
          ctx.lineTo(pts[i].x, pts[i].y)
          ctx.stroke()
        }
        ctx.shadowBlur = 0
      }

      // spike raster: one tick per simulated neuron firing
      ctx.fillStyle = "rgba(255,255,255,0.3)"
      ctx.fillRect(0, fieldH, w, 3)
      const births = look.rate * 6
      for (let i = 0; i < births; i++) {
        if (Math.random() < births - i) spikes.push({ x: w, y: fieldH + 5 + Math.random() * (rasterH - 10), a: 1 })
      }
      ctx.fillStyle = "#fff"
      for (let i = spikes.length - 1; i >= 0; i--) {
        const s = spikes[i]
        s.x -= 1.6
        if (s.x < 0) {
          spikes.splice(i, 1)
          continue
        }
        ctx.globalAlpha = 0.25 + 0.75 * (s.x / w)
        ctx.fillRect(s.x, s.y, 3, 6)
      }
      ctx.globalAlpha = 1
      dither(canvas, ctx)
    })
  }, [mood])

  return <canvas ref={ref} className="sim-canvas" />
}

// same order as the four screens, and as Benatar's table
const WORLDS = [
  { mood: "pain", label: "Presence of pain", verdict: "BAD", tone: "bad" },
  { mood: "absent", label: "Absence of pain", verdict: "GOOD", tone: "good" },
  { mood: "pleasure", label: "Presence of pleasure", verdict: "GOOD", tone: "good" },
  { mood: "absent", label: "Absence of pleasure", verdict: "NOT BAD", tone: "meh" },
]

export default function FourWorlds() {
  return (
    <div className="worlds">
      {WORLDS.map((world) => (
        <div className={`worlds-q worlds-${world.tone}`} key={world.label}>
          <Worm mood={world.mood} />
          <div className="worlds-label">
            <span>{world.label}</span>
            <b>{world.verdict}</b>
          </div>
        </div>
      ))}
    </div>
  )
}
