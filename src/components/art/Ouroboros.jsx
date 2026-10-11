import { useEffect, useRef } from "react"
import { animate, dither, lowRes } from "./dither"
import "./sims.css"

// the ring is drawn for a square stage this wide and zoomed to fit its box
const STAGE = 640
const R = 232 // spine of the snake
const BODY = 46 // thickest part of the body
const FLOOR = R - BODY / 2 - 4 // inner surface Sisyphus walks on
const SPAN = Math.PI * 2 * 0.97 // the tail ends inside the mouth
const SEGS = 168
const HEAD = -Math.PI / 2 - 0.3 // the head rests just left of the top
const FLOW = 5 // segments per second sliding into the mouth
const TIP = -330 // sword, along its own axis from the centre
const GUARD = 276

const H = 100 // Sisyphus, heel to crown
const ROCK = 44
const REACH = (H * 0.44 + ROCK) / FLOOR // angle between his feet and the rock
const TOP = 1.12 // how far up the wall he gets before it slips

const TAU = Math.PI * 2

function width(s) {
  if (s < 0.06) return BODY * (0.78 + (0.22 * s) / 0.06)
  return BODY * (1 - Math.max(0, (s - 0.55) / 0.45) ** 2 * 0.86)
}

// The snake holds still with its head at the top; the scales slide along the
// body into the mouth. `flow` is how far they have slid, in segments.
function snake(ctx, flow, tongue, zoom) {
  const shift = flow % 1
  const band = Math.floor(flow)
  ctx.lineCap = "butt"
  for (const pass of ["destination-out", "source-over"]) {
    // first pass clears whatever lies behind the body (the sword)
    ctx.globalCompositeOperation = pass
    for (let i = 0; i <= SEGS; i++) {
      const s0 = Math.max(0, (i - shift) / SEGS)
      const s1 = Math.min(1, (i + 1 - shift) / SEGS)
      const clear = pass === "destination-out"
      ctx.strokeStyle = `rgba(255,255,255,${clear ? 1 : (i + band) % 3 === 0 ? 0.85 : 0.3})`
      ctx.lineWidth = width((s0 + s1) / 2) + (clear ? 8 : 0)
      ctx.beginPath()
      ctx.arc(0, 0, R, HEAD - s1 * SPAN - 0.004, HEAD - s0 * SPAN)
      ctx.stroke()
    }
  }

  // back and belly, with the bloom
  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 4
  ctx.lineJoin = "round"
  ctx.shadowColor = "#fff"
  ctx.shadowBlur = 34 * zoom
  for (const side of [1, -1]) {
    ctx.beginPath()
    for (let i = 0; i <= SEGS; i++) {
      const s = i / SEGS
      const a = HEAD - s * SPAN
      const r = R + (side * width(s)) / 2
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.stroke()
  }

  // head: x runs along the direction of travel, -y faces out of the ring
  const a = HEAD + 0.05
  ctx.save()
  ctx.translate(Math.cos(a) * R, Math.sin(a) * R)
  ctx.rotate(a + Math.PI / 2)
  ctx.fillStyle = "#fff"
  ctx.beginPath()
  ctx.moveTo(-26, -20)
  ctx.quadraticCurveTo(-6, -36, 18, -27)
  ctx.quadraticCurveTo(52, -16, 58, -2)
  ctx.quadraticCurveTo(52, 16, 18, 27)
  ctx.quadraticCurveTo(-6, 36, -26, 20)
  ctx.closePath()
  ctx.shadowBlur = 16 * zoom
  ctx.fill()
  ctx.shadowBlur = 0
  // forked tongue, hanging into the ring
  ctx.lineWidth = 3
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(34, 20)
  ctx.quadraticCurveTo(44 + tongue * 6, 44, 36 + tongue * 14, 62)
  ctx.lineTo(28 + tongue * 16, 74)
  ctx.moveTo(36 + tongue * 14, 62)
  ctx.lineTo(44 + tongue * 18, 73)
  ctx.stroke()
  ctx.globalCompositeOperation = "destination-out"
  ctx.beginPath()
  ctx.arc(10, -14, 5.5, 0, TAU)
  ctx.fill()
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(22, 5)
  ctx.quadraticCurveTo(42, 4, 58, -2)
  ctx.stroke()
  ctx.restore()
}

function bladePath(ctx) {
  ctx.beginPath()
  ctx.moveTo(TIP, 0)
  ctx.lineTo(TIP + 46, -13)
  ctx.lineTo(GUARD, -15)
  ctx.lineTo(GUARD, 15)
  ctx.lineTo(TIP + 46, 13)
  ctx.closePath()
}

// A sword run through the ring from the upper right, striking the loop out.
// x runs along the blade towards the hilt.
function sword(ctx, zoom) {
  ctx.save()
  ctx.rotate(-Math.PI / 4)
  ctx.strokeStyle = ctx.shadowColor = "#fff"
  ctx.lineJoin = "miter"
  ctx.lineCap = "butt"

  bladePath(ctx)
  ctx.fillStyle = "rgba(255,255,255,0.34)"
  ctx.fill()
  ctx.lineWidth = 4
  ctx.shadowBlur = 30 * zoom
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(TIP + 30, 0)
  ctx.lineTo(GUARD, 0)
  ctx.stroke()

  // guard, grip, pommel
  ctx.fillStyle = "#fff"
  ctx.beginPath()
  ctx.moveTo(GUARD - 7, 0)
  ctx.lineTo(GUARD - 2, -30)
  ctx.lineTo(GUARD - 12, -58)
  ctx.lineTo(GUARD + 10, -44)
  ctx.lineTo(GUARD + 12, 0)
  ctx.lineTo(GUARD + 10, 44)
  ctx.lineTo(GUARD - 12, 58)
  ctx.lineTo(GUARD - 2, 30)
  ctx.closePath()
  ctx.fill()
  for (let x = GUARD + 16; x < GUARD + 76; x += 9) ctx.fillRect(x, -9, 5, 18)
  ctx.beginPath()
  ctx.moveTo(GUARD + 76, 0)
  ctx.lineTo(GUARD + 90, -14)
  ctx.lineTo(GUARD + 104, 0)
  ctx.lineTo(GUARD + 90, 14)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// redraws the sword where it comes back out in front of the body
function swordOver(ctx, zoom) {
  ctx.save()
  ctx.rotate(-Math.PI / 4)
  ctx.beginPath()
  ctx.arc(-R, 0, 62, 0, TAU)
  ctx.clip()
  ctx.globalCompositeOperation = "destination-out"
  bladePath(ctx)
  ctx.lineWidth = 16
  ctx.strokeStyle = "#fff"
  ctx.fill()
  ctx.stroke()
  ctx.rotate(Math.PI / 4)
  ctx.globalCompositeOperation = "source-over"
  sword(ctx, zoom)
  ctx.restore()
}

// local frame standing on the inside of the ring, `alpha` radians up the
// right-hand wall from the bottom: +x is uphill, -y is towards the centre
function stand(ctx, alpha, r) {
  const a = Math.PI / 2 - alpha
  const c = Math.cos(a)
  const s = Math.sin(a)
  ctx.transform(s, -c, c, s, c * r, s * r)
}

function limb(ctx, x0, y0, x1, y1, len, bend) {
  const dx = x1 - x0
  const dy = y1 - y0
  const d = Math.min(Math.hypot(dx, dy), len * 2 - 0.01) || 0.01
  const k = Math.sqrt(len * len - (d / 2) ** 2) * bend
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0 + dx / 2 + (dy / d) * k, y0 + dy / 2 - (dx / d) * k)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

// pose: "push" | "walk" | "despair"
function sisyphus(ctx, alpha, facing, pose, gait, zoom) {
  ctx.save()
  stand(ctx, alpha, FLOOR)
  ctx.scale(facing, 1)
  ctx.strokeStyle = ctx.fillStyle = "#fff"
  ctx.lineWidth = 7
  ctx.lineCap = ctx.lineJoin = "round"

  const push = pose === "push"
  const hip = [push ? -H * 0.06 : 0, -H * (push ? 0.44 : 0.5)]
  const neck = push ? [H * 0.2, -H * 0.74] : [H * 0.03, -H * 0.82]
  const head = push ? [H * 0.28, -H * 0.88] : [H * 0.05, -H * 0.95]

  for (const k of [0, 1]) {
    const p = gait + k * Math.PI
    const stride = pose === "despair" ? 0 : H * 0.17
    const fx = (push ? -H * 0.16 : 0) + Math.cos(p) * stride + (pose === "despair" ? (k - 0.5) * 12 : 0)
    const fy = -Math.max(0, Math.sin(p)) * (stride ? H * 0.09 : 0) - 3
    limb(ctx, hip[0], hip[1], fx, fy, H * 0.27, 1)
  }

  ctx.beginPath()
  ctx.moveTo(hip[0], hip[1])
  ctx.lineTo(neck[0], neck[1])
  ctx.stroke()

  for (const k of [0, 1]) {
    let hand
    if (push) hand = [H * 0.44, -H * (0.66 - k * 0.18)]
    else if (pose === "despair") hand = [(k - 0.5) * H * 0.5, -H * 1.12]
    else hand = [Math.cos(gait + k * Math.PI) * -H * 0.14, -H * 0.5]
    limb(ctx, neck[0], neck[1], hand[0], hand[1], H * 0.2, pose === "despair" ? (k ? 1 : -1) : -1)
  }

  ctx.beginPath()
  ctx.arc(head[0], head[1], H * 0.09, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function rock(ctx, beta, zoom) {
  ctx.save()
  stand(ctx, beta, FLOOR - ROCK)
  // rolling without slipping along the floor
  ctx.rotate((beta * FLOOR) / ROCK)
  ctx.fillStyle = "rgba(255,255,255,0.2)"
  ctx.strokeStyle = ctx.shadowColor = "#fff"
  ctx.lineWidth = 4
  ctx.shadowBlur = 12 * zoom
  ctx.beginPath()
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU
    const r = ROCK * (i % 3 === 1 ? 0.86 : 1)
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.moveTo(-ROCK * 0.5, -ROCK * 0.2)
  ctx.lineTo(0, ROCK * 0.1)
  ctx.lineTo(ROCK * 0.15, ROCK * 0.6)
  ctx.stroke()
  ctx.restore()
}

// The ouroboros eats itself, a sword strikes the loop through, and inside it
// Sisyphus pushes his rock up the wall until it slips, swings back to the
// bottom, and he walks down after it.
export default function Ouroboros() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let flow = 0
    let t = 0
    let alpha = still ? 0.55 : -0.1
    let beta = alpha + REACH
    let omega = 0
    let mode = "push"
    let wait = 0
    let facing = 1
    let gait = 0
    let last = performance.now()

    const update = (dt) => {
      flow += FLOW * dt
      t += dt
      if (mode === "push") {
        alpha += 0.15 * (1 - 0.72 * Math.max(0, alpha / TOP)) * dt
        beta = alpha + REACH
        gait += dt * 5.2
        if (alpha >= TOP) {
          mode = "slip"
          wait = 1.3
          omega = 0
        }
        return
      }
      // the rock is a damped pendulum on the inside of the wheel
      omega += (-6 * Math.sin(beta) - 2.2 * omega) * dt
      beta += omega * dt
      wait -= dt
      if (wait > 0) return
      const target = beta - REACH
      const gap = target - alpha
      const move = Math.sign(gap) * Math.min(Math.abs(gap), 0.42 * dt)
      alpha += move
      if (Math.abs(move) > 1e-4) {
        facing = Math.sign(move)
        gait += dt * 7
      }
      if (Math.abs(gap) < 0.01 && Math.abs(omega) < 0.03 && Math.abs(beta) < 0.06) {
        mode = "push"
        facing = 1
      }
    }

    const draw = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!still) update(dt)

      const zoom = Math.min(canvas.clientWidth, canvas.clientHeight) / STAGE
      const { w, h } = lowRes(canvas, ctx, zoom)
      ctx.translate(w / 2, h / 2)

      sword(ctx, zoom)
      ctx.save()
      // the tongue flicks now and then
      snake(ctx, flow, Math.sin(t * 13) * Math.max(0, Math.sin(t * 0.9)) ** 6, zoom)
      ctx.restore()
      swordOver(ctx, zoom)
      rock(ctx, beta, zoom)
      const pose = mode === "push" ? "push" : wait > 0 ? "despair" : "walk"
      sisyphus(ctx, alpha, facing, pose, gait, zoom)

      dither(canvas, ctx, 1.25)
    }

    if (!still) return animate(canvas, draw)
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={canvasRef} className="sim-canvas" role="img" aria-label="An ouroboros run through by a sword, with Sisyphus pushing his rock inside it" />
}
