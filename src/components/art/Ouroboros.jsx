import { useEffect, useRef } from "react"
import { animate, dither, lowRes, PX } from "./dither"
import "./sims.css"

// the ring is drawn for a square stage this wide and zoomed to fit its box
const STAGE = 640

// the engraving, and where its ring sits in it (source pixels)
const SRC = "/images/ouroboros.jpg"
const SRC_C = [505, 531]
const SRC_INNER = 386
const SRC_OUTER = 460

const INNER = 209 // inner edge of the ring on the stage
const K = INNER / SRC_INNER
const OUTER = SRC_OUTER * K
const FLOOR = INNER - 3 // inner surface Sisyphus walks on
const TURN = 0.1 // rad/s, the snake chasing its tail
const TIP = -330 // sword, along its own axis from the centre
const GUARD = 276

// Titian's Sisyphus (1548–49), cut out of the painting along this outline.
// The painted rock on his shoulders is left out; he gets one to push instead.
const MAN_SRC = "/images/sisyphus.jpg"
// prettier-ignore
const MAN = [
  165,815, 185,860, 250,900, 278,888, 255,850, 268,810, 312,740, 345,655, 358,660, 370,720, 362,790, 365,825,
  400,830, 480,815, 497,800, 470,790, 420,775, 415,760, 430,680, 450,600, 440,570, 400,530, 355,500, 360,450,
  370,420, 410,360, 450,310, 460,340, 500,375, 540,385, 590,350, 610,310, 640,280, 640,230, 650,200, 665,170,
  660,120, 655,85, 600,75, 592,120, 575,170, 540,192, 470,196, 400,188, 345,195, 325,215, 268,262, 228,330,
  207,392, 192,430, 190,485, 240,545, 212,620, 215,650, 240,660, 235,700, 200,765,
]
const MAN_FEET = [365, 860] // midway between his feet
const MAN_SLOPE = 0.34 // the painted ground rises to the right by this much
const MAN_HANDS = [640, 100]
const MAN_K = 140 / 825 // stage pixels per source pixel

// "Big Muley", lunar sample 61016, the largest rock brought back from the
// Moon (NASA photograph), cut out along this outline
const ROCK_SRC = "/images/moon-rock.jpg"
// prettier-ignore
const ROCK_OUT = [
  17,170, 30,145, 55,125, 85,95, 100,75, 145,65, 185,42, 230,37, 270,45, 310,57, 350,67, 380,90, 400,125, 415,160, 424,190, 417,220, 400,245, 370,267, 325,280, 280,285, 235,284, 190,279, 150,270, 122,260, 100,250, 75,235, 47,212, 20,180,
]
const ROCK_C = [220, 161]
const ROCK_SQUASH = 0.8 // it is a long rock; narrowed so it rolls
const ROCK = 46 // its mean radius on the stage
const ROCK_K = ROCK / 143
const LOW = -0.3 // where he starts on the wall, radians from the bottom
const HIGH = 0.4 // and where he loses his footing

const TAU = Math.PI * 2

// Turns a picture into white ink whose alpha is its darkness, which is what
// the sims draw in. `white` is the luminance that maps to bare paper and
// `black` the one that maps to solid ink.
function toInk(img, white = 255, black = 0) {
  const ink = document.createElement("canvas")
  ink.width = img.naturalWidth
  ink.height = img.naturalHeight
  const ic = ink.getContext("2d")
  ic.drawImage(img, 0, 0)
  const px = ic.getImageData(0, 0, ink.width, ink.height)
  const d = px.data
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
    d[i + 3] = Math.max(0, Math.min(1, (white - lum) / (white - black))) * 255
    d[i] = d[i + 1] = d[i + 2] = 255
  }
  ic.putImageData(px, 0, 0)
  return ink
}

// How far ahead of his feet (radians round the ring) the rock has to sit for
// its surface to meet his hands. The wall curves up, so it rests above him.
const REACH = (() => {
  const dx = (MAN_HANDS[0] - MAN_FEET[0]) * MAN_K
  const dy = (MAN_HANDS[1] - MAN_FEET[1]) * MAN_K
  const hx = dx * Math.cos(MAN_SLOPE) - dy * Math.sin(MAN_SLOPE)
  const hy = dx * Math.sin(MAN_SLOPE) + dy * Math.cos(MAN_SLOPE)
  const gap = (d) =>
    Math.hypot((FLOOR - ROCK) * Math.sin(d) - hx, -(FLOOR - (FLOOR - ROCK) * Math.cos(d)) - hy) - ROCK
  let lo = Math.atan2(hx, FLOOR + hy)
  let hi = lo + 1.5
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (gap(mid) < 0) lo = mid
    else hi = mid
  }
  return lo
})()

// `beta` is where it touches the wall, `spin` its turn within that frame.
// It is not round, so its centre rides up and down on whichever corner is
// underneath.
function rock(ctx, art, beta, spin, zoom) {
  const c = Math.cos(spin)
  const s = Math.sin(spin)
  let low = 0
  for (let i = 0; i < ROCK_OUT.length; i += 2) {
    const x = (ROCK_OUT[i] - ROCK_C[0]) * ROCK_K * ROCK_SQUASH
    const y = (ROCK_OUT[i + 1] - ROCK_C[1]) * ROCK_K
    low = Math.max(low, x * s + y * c)
  }

  ctx.save()
  stand(ctx, beta, FLOOR - low)
  ctx.rotate(spin)
  ctx.scale(ROCK_K * ROCK_SQUASH, ROCK_K)
  ctx.translate(-ROCK_C[0], -ROCK_C[1])
  ctx.strokeStyle = ctx.shadowColor = "#fff"
  ctx.lineJoin = "round"

  // it sits in front of the sword
  ctx.beginPath()
  for (let i = 0; i < ROCK_OUT.length; i += 2) ctx.lineTo(ROCK_OUT[i], ROCK_OUT[i + 1])
  ctx.closePath()
  ctx.globalCompositeOperation = "destination-out"
  ctx.lineWidth = 8 / ROCK_K
  ctx.fill()
  ctx.stroke()
  ctx.globalCompositeOperation = "source-over"

  ctx.save()
  ctx.clip()
  const k = art.full / art.mip.width
  ctx.drawImage(art.mip, 0, 0, art.mip.width * k, art.mip.height * k)
  ctx.restore()
  ctx.lineWidth = 3 / ROCK_K
  ctx.shadowBlur = 12 * zoom
  ctx.stroke()
  ctx.restore()
}

function manPath(ctx) {
  ctx.beginPath()
  for (let i = 0; i < MAN.length; i += 2) ctx.lineTo(MAN[i], MAN[i + 1])
  ctx.closePath()
}

// halves the ink down to roughly `width` pixels, so rotating it each frame
// samples close to 1:1 instead of skipping lines
function shrink(ink, width) {
  let cur = ink
  while (cur.width / 2 >= width) {
    const next = document.createElement("canvas")
    next.width = Math.ceil(cur.width / 2)
    next.height = Math.ceil(cur.height / 2)
    next.getContext("2d").drawImage(cur, 0, 0, next.width, next.height)
    cur = next
  }
  return cur
}

function snake(ctx, art, phi) {
  // clear whatever lies behind the body (the sword)
  ctx.globalCompositeOperation = "destination-out"
  ctx.lineWidth = OUTER - INNER
  ctx.beginPath()
  ctx.arc(0, 0, (OUTER + INNER) / 2, 0, TAU)
  ctx.stroke()
  ctx.globalCompositeOperation = "source-over"

  ctx.rotate(phi)
  const s = (K * art.full) / art.mip.width
  ctx.drawImage(art.mip, -SRC_C[0] * K, -SRC_C[1] * K, art.mip.width * s, art.mip.height * s)
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
  ctx.arc(-(OUTER + INNER) / 2, 0, 62, 0, TAU)
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

// `tilt` leans him off the slope he was painted on, `lift` raises a step
function sisyphus(ctx, art, alpha, tilt, lift) {
  ctx.save()
  stand(ctx, alpha, FLOOR)
  ctx.translate(0, -lift)
  ctx.rotate(MAN_SLOPE + tilt)
  ctx.scale(MAN_K, MAN_K)
  ctx.translate(-MAN_FEET[0], -MAN_FEET[1])

  // he stands in front of everything: clear his outline first
  manPath(ctx)
  ctx.strokeStyle = "#fff"
  ctx.lineJoin = "round"
  ctx.lineWidth = 9 / MAN_K
  ctx.globalCompositeOperation = "destination-out"
  ctx.fill()
  ctx.stroke()
  ctx.globalCompositeOperation = "source-over"

  ctx.save()
  ctx.clip()
  const s = art.full / art.mip.width
  ctx.drawImage(art.mip, 0, 0, art.mip.width * s, art.mip.height * s)
  ctx.restore()
  ctx.lineWidth = 2.5 / MAN_K
  ctx.stroke()
  ctx.restore()
}

function mip(art, scale) {
  const want = art.full * scale
  if (!art.mip || art.mip.width < want || art.mip.width >= want * 2) art.mip = shrink(art.ink, want)
}

// The ouroboros turns on itself, a sword strikes the loop through, and inside it
// Sisyphus pushes his rock up the wall until it drives him back down to
// where he started.
export default function Ouroboros() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let phi = 0
    let alpha = still ? 0.3 : LOW
    let mode = "climb"
    let clock = 0
    let gait = 0
    let snakeArt = null
    let manArt = null
    let rockArt = null
    let last = performance.now()

    const update = (dt) => {
      phi += TURN * dt
      clock += dt
      if (mode === "climb") {
        alpha += 0.085 * (1 - 0.6 * (alpha - LOW) / (HIGH - LOW)) * dt
        gait += dt * 2.4
        if (alpha >= HIGH) {
          mode = "slide"
          clock = 0
        }
      } else if (mode === "slide") {
        const u = Math.min(1, clock / 2.6)
        alpha = HIGH + (LOW - HIGH) * u * u * (3 - 2 * u)
        if (u === 1) {
          mode = "rest"
          clock = 0
        }
      } else if (clock > 0.9) {
        mode = "climb"
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
      if (snakeArt) {
        mip(snakeArt, (K * zoom) / PX)
        ctx.save()
        snake(ctx, snakeArt, phi)
        ctx.restore()
      }
      swordOver(ctx, zoom)
      if (rockArt) {
        mip(rockArt, (ROCK_K * zoom) / PX)
        // rolling on the wall, plus the floor running away underneath it
        const beta = alpha + REACH
        rock(ctx, rockArt, beta, (beta * (FLOOR - ROCK) + phi * FLOOR) / ROCK + beta, zoom)
      }
      if (manArt) {
        mip(manArt, (MAN_K * zoom) / PX)
        // he trudges in steps: a lean and a lift on every other beat
        const beat = mode === "climb" ? Math.floor(gait) % 2 : 0
        sisyphus(ctx, manArt, alpha, mode === "slide" ? -0.1 : beat * 0.05, beat * 4)
      }

      dither(canvas, ctx, 1.25)
    }

    const load = (src, done) => {
      const img = new Image()
      img.onload = () => {
        done(img)
        if (still) draw()
      }
      img.src = src
    }
    load(SRC, (img) => (snakeArt = { ink: toInk(img), full: img.naturalWidth, mip: null }))
    load(ROCK_SRC, (img) => (rockArt = { ink: toInk(img, 235, 40), full: img.naturalWidth, mip: null }))
    load(MAN_SRC, (img) => (manArt = { ink: toInk(img, 200, 0), full: img.naturalWidth, mip: null }))

    if (!still) return animate(canvas, draw)
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={canvasRef} className="sim-canvas" role="img" aria-label="An ouroboros run through by a sword, with Sisyphus pushing his rock inside it" />
}
