import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

// ── field notes / stone ─────────────────────────────────────────────────
// A walkable white field. The only marks are the drawing and its captions,
// wrapped onto the floor, the tilted plates, the sky, and the stones.
// The layout of the field is seeded and stays put. The drawings are not:
// every 20–40 seconds a new edition is generated in the background and
// dissolves over the last one.

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const DITHER = true // 1-bit threshold pass over every sheet
const REDRAW_MIN = 20 // seconds between editions
const REDRAW_MAX = 40
const DISSOLVE = 2.6 // seconds for one edition to replace the last
const TAU = Math.PI * 2

const IDEAS = ["idea", "concept", "referent", "the name", "category", "memory of it", "intention", "the plan"]
const OBJECTS = ["stone", "mass", "this object", "matter", "body", "specimen", "debris", "the thing itself"]
const RELATIONS = ["stands for", "fails to name", "points at", "is not", "indexes", "arrives late to", "holds a place for"]
const NOTES = [
  "measured twice, both wrong",
  "weight recorded, meaning not",
  "found already broken",
  "no origin on file",
  "refused classification",
  "catalogued under: pending",
  "the diagram outlives the object",
  "legible only at this angle",
  "horizontal hold lost at this line",
  "signal recorded, source not",
  "fed back until it held",
]
const TREE_NOTES = [
  "standing since before the survey",
  "rings not counted",
  "roots outside the frame",
  "measured at chest height",
  "listed as vegetation",
  "shade recorded, tree not",
]

const INKS = ["#000", "#333", "#5a5a5a", "#808080"]
const INKS_MID = ["#4a4a4a", "#6a6a6a", "#8a8a8a"]
const INKS_LIGHT = ["#8e8e8e", "#a8a8a8", "#bcbcbc"]

// ordered 8x8 bayer. grays become dot patterns, black stays black, white stays
// white, and every edge ends up hard instead of antialiased into mush
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30,
  54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
]

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------- randomness for sheets
// every sheet draws from R. the runners pin R to that sheet's own stream before
// each step, so a sheet always comes out the same for the same seed, even when
// its drawing is spread across many frames
let R = Math.random
const range = (a, b) => a + R() * (b - a)
const int = (a, b) => Math.floor(range(a, b + 1))
const pick = (a) => a[Math.floor(R() * a.length)]
const breath = () => new Promise((r) => setTimeout(r, 0))

function runSync(gen, seed) {
  const rand = mulberry32(seed)
  let r
  do {
    R = rand
    r = gen.next()
  } while (!r.done)
  return r.value
}

// same, but hands the thread back whenever a step runs past a few ms
async function runAsync(gen, seed, alive) {
  const rand = mulberry32(seed)
  let t0 = performance.now()
  for (;;) {
    R = rand
    const r = gen.next()
    if (r.done) return r.value
    if (performance.now() - t0 > 6) {
      await breath()
      if (!alive()) return null
      t0 = performance.now()
    }
  }
}

// draws the same thing every time it's called: used for anything stamped at
// several offsets, so the copies across a tile seam match exactly
function seeded(fn) {
  const s = (R() * 4294967296) >>> 0
  return (...args) => {
    const prev = R
    R = mulberry32(s)
    try {
      fn(...args)
    } finally {
      R = prev
    }
  }
}

const ONCE = [[0, 0]]
const wrapX = (W) => [
  [-W, 0],
  [0, 0],
  [W, 0],
]
const wrapXY = (W, H) => {
  const o = []
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) o.push([dx * W, dy * H])
  return o
}
function copies(x, offs, fn) {
  for (const [dx, dy] of offs) {
    x.save()
    x.translate(dx, dy)
    fn()
    x.restore()
  }
}
// same as copies, but hands back between offsets: a dense path stamped nine
// times is one of the slower things a sheet does
function* stamp(x, offs, fn) {
  for (const off of offs) {
    copies(x, [off], fn)
    yield
  }
}
const wrapDist = (d, S) => {
  d = Math.abs(d) % S
  return Math.min(d, S - d)
}

// ---------------------------------------------------------------- fields
// fractal value noise over u, v in [0, 1). every octave wraps, so the field
// tiles, which is what lets the floor sheet repeat without a seam
function makeField(period, octaves) {
  const layers = []
  let norm = 0
  for (let k = 0; k < octaves; k++) {
    const P = period << k
    const g = new Float32Array(P * P)
    for (let i = 0; i < g.length; i++) g[i] = R()
    const amp = Math.pow(0.5, k)
    layers.push({ P, g, amp })
    norm += amp
  }
  return (u, v) => {
    let s = 0
    for (const { P, g, amp } of layers) {
      const px = u * P,
        py = v * P
      const xi = Math.floor(px),
        yi = Math.floor(py)
      let fx = px - xi,
        fy = py - yi
      fx = fx * fx * (3 - 2 * fx)
      fy = fy * fy * (3 - 2 * fy)
      const i0 = ((xi % P) + P) % P,
        j0 = ((yi % P) + P) % P
      const i1 = (i0 + 1) % P,
        j1 = (j0 + 1) % P
      const a = g[j0 * P + i0],
        b = g[j0 * P + i1],
        c = g[j1 * P + i0],
        d = g[j1 * P + i1]
      s += amp * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy)
    }
    return s / norm
  }
}

// marching squares. corners: tl 8, tr 4, br 2, bl 1
function contourPath(f, W, H, cols, rows, levels) {
  const p = new Path2D()
  const stride = cols + 1
  const val = new Float32Array(stride * (rows + 1))
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) val[j * stride + i] = f(i / cols, j / rows)
  const cw = W / cols,
    ch = H / rows
  const seg = (a, b) => {
    p.moveTo(a[0], a[1])
    p.lineTo(b[0], b[1])
  }
  for (const L of levels) {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = val[j * stride + i],
          b = val[j * stride + i + 1]
        const c = val[(j + 1) * stride + i + 1],
          d = val[(j + 1) * stride + i]
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0)
        if (idx === 0 || idx === 15) continue
        const x0 = i * cw,
          y0 = j * ch
        const t = (m, n) => (L - m) / (n - m)
        const top = () => [x0 + cw * t(a, b), y0]
        const right = () => [x0 + cw, y0 + ch * t(b, c)]
        const bottom = () => [x0 + cw * t(d, c), y0 + ch]
        const left = () => [x0, y0 + ch * t(a, d)]
        switch (idx) {
          case 1:
          case 14:
            seg(left(), bottom())
            break
          case 2:
          case 13:
            seg(bottom(), right())
            break
          case 3:
          case 12:
            seg(left(), right())
            break
          case 4:
          case 11:
            seg(top(), right())
            break
          case 6:
          case 9:
            seg(top(), bottom())
            break
          case 7:
          case 8:
            seg(left(), top())
            break
          case 5:
            seg(left(), top())
            seg(bottom(), right())
            break
          case 10:
            seg(top(), right())
            seg(left(), bottom())
            break
        }
      }
    }
  }
  return p
}

// ---------------------------------------------------------------- canvas kit
function sheet(w, h, k) {
  k = k || 1 // draw in logical units, rasterise at k times
  const c = document.createElement("canvas")
  c.width = Math.round(w * k)
  c.height = Math.round(h * k)
  const x = c.getContext("2d", { willReadFrequently: true })
  x.scale(k, k)
  x.fillStyle = "#fff"
  x.fillRect(0, 0, w, h)
  x.strokeStyle = "#000"
  x.fillStyle = "#000"
  x.lineJoin = "round"
  x.lineCap = "round"
  x.font = `26px ${FONT}`
  return { c, x }
}

// text on a white knockout, so captions stay legible over any pattern
function label(x, text, cx, by, px, align) {
  x.font = `${px}px ${FONT}`
  const w = x.measureText(text).width
  const lx = align === "left" ? cx : cx - w / 2
  x.fillStyle = "#fff"
  x.fillRect(lx - px * 0.25, by - px * 0.92, w + px * 0.5, px * 1.22)
  x.fillStyle = "#000"
  x.fillText(text, lx, by)
}

function caption() {
  const r = R()
  if (r < 0.34) return pick(NOTES)
  if (r < 0.58) return `${pick(IDEAS)} ${pick(RELATIONS)} ${pick(OBJECTS)}`
  if (r < 0.78) return `specimen ${String(int(0, 9999)).padStart(4, "0")} / ${range(0.2, 40).toFixed(2)} kg`
  return `x ${range(-99, 99).toFixed(1)}   z ${range(-99, 99).toFixed(1)}`
}

// a closed loop whose radius drifts, never quite a circle
function wobble(x, cx, cy, r, amt, n) {
  const k1 = int(2, 4),
    k2 = int(5, 8),
    p1 = R() * TAU,
    p2 = R() * TAU
  x.beginPath()
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const rr = r * (1 + amt * Math.sin(a * k1 + p1) + amt * 0.5 * Math.sin(a * k2 + p2))
    const px = cx + Math.cos(a) * rr,
      py = cy + Math.sin(a) * rr
    i ? x.lineTo(px, py) : x.moveTo(px, py)
  }
  x.closePath()
}

function arrow(x, ax, ay, bx, by, s, bend) {
  s = s || 13
  bend = bend || 0
  const len = Math.hypot(bx - ax, by - ay) || 1
  const qx = (ax + bx) / 2 - ((by - ay) / len) * bend
  const qy = (ay + by) / 2 + ((bx - ax) / len) * bend
  x.beginPath()
  x.moveTo(ax, ay)
  x.quadraticCurveTo(qx, qy, bx, by)
  x.stroke()
  const a = Math.atan2(by - qy, bx - qx)
  x.beginPath()
  x.moveTo(bx, by)
  x.lineTo(bx - s * Math.cos(a - 0.38), by - s * Math.sin(a - 0.38))
  x.moveTo(bx, by)
  x.lineTo(bx - s * Math.cos(a + 0.38), by - s * Math.sin(a + 0.38))
  x.stroke()
}

// one drawing unit: idea --relation--> object. reused on every surface,
// never drawn the same way twice
function unit(x, cx, cy, scale, ink, bank, rot) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot || 0)
  x.scale(scale, scale)
  x.strokeStyle = ink // lines can recede, text never does
  x.lineWidth = 3 / scale

  const idea = pick(IDEAS),
    obj = pick(bank || OBJECTS),
    rel = pick(RELATIONS)
  const spread = range(-20, 50)
  const L = -190 - spread,
    Rt = 190 + spread

  const rI = range(62, 88)
  x.setLineDash([range(5, 12), range(5, 12)])
  wobble(x, L, 0, rI, range(0.02, 0.1), 48)
  x.stroke()
  x.setLineDash([])

  const n = int(5, 11),
    rO = range(76, 100)
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - 0.4 + range(-0.25, 0.25) * (TAU / n)
    const r = rO * range(0.72, 1.2)
    pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.86])
  }
  // the object as a camera pointed at its own monitor would see it: the
  // outline again and again, each one larger, turned, and fainter
  const echoes = R() < 0.6 ? int(2, 5) : 0,
    grow = range(0.1, 0.2),
    turn = range(-0.09, 0.09)
  for (let e = echoes; e >= 0; e--) {
    const k = 1 + grow * e,
      cs = Math.cos(turn * e),
      sn = Math.sin(turn * e)
    x.lineWidth = 3 / scale / (1 + e * 0.8)
    x.beginPath()
    pts.forEach(([px, py], i) => {
      const qx = Rt + (px * cs - py * sn) * k,
        qy = (px * sn + py * cs) * k
      i ? x.lineTo(qx, qy) : x.moveTo(qx, qy)
    })
    x.closePath()
    x.stroke()
  }

  const bend = range(-40, 40)
  arrow(x, L + rI + 14, 0, Rt - rO * 0.9 - 6, 0, 15, bend)
  label(x, idea, L, 10, 28)
  label(x, obj, Rt, 10, 28)
  label(x, rel, (L + Rt) / 2, -22 + bend * 0.5, 24)
  x.restore()
}

function regMark(x, cx, cy, sz) {
  x.strokeStyle = "#000"
  x.lineWidth = 2
  x.beginPath()
  x.arc(cx, cy, sz * 0.55, 0, TAU)
  x.moveTo(cx - sz, cy)
  x.lineTo(cx + sz, cy)
  x.moveTo(cx, cy - sz)
  x.lineTo(cx, cy + sz)
  x.stroke()
  label(x, `${int(0, 99)}.${int(0, 9)}`, cx + sz + 6, cy - sz * 0.4, 20, "left")
}

function ruler(x, cx, cy, len, rot, count, major) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.strokeStyle = "#000"
  x.lineWidth = 2.5
  x.beginPath()
  x.moveTo(-len / 2, 0)
  x.lineTo(len / 2, 0)
  for (let i = 0; i <= count; i++) {
    const tx = -len / 2 + (i * len) / count
    x.moveTo(tx, 0)
    x.lineTo(tx, i % major === 0 ? -20 : -10)
  }
  x.stroke()
  x.restore()
}

// an irregular patch filled with hatching, sometimes cross-hatched
function hatch(x, cx, cy, rad, ang, gap, ink) {
  const p1 = R() * TAU,
    p2 = R() * TAU,
    k = int(2, 3)
  const cross = R() < 0.35,
    dashed = R() < 0.5
  const shape = new Path2D()
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU
    const r = rad * (1 + 0.28 * Math.sin(a * k + p1) + 0.12 * Math.sin(a * 5 + p2))
    const px = cx + Math.cos(a) * r,
      py = cy + Math.sin(a) * r * 0.8
    i ? shape.lineTo(px, py) : shape.moveTo(px, py)
  }
  shape.closePath()

  const lines = (angle) => {
    const e = rad * 1.6
    x.save()
    x.rotate(angle)
    x.beginPath()
    for (let t = -e; t <= e; t += gap) {
      x.moveTo(-e, t)
      x.lineTo(e, t)
    }
    x.stroke()
    x.restore()
  }
  x.save()
  x.clip(shape)
  x.translate(cx, cy)
  x.strokeStyle = ink
  x.lineWidth = 1.8
  lines(ang)
  if (cross) lines(ang + Math.PI / 2)
  x.restore()

  x.strokeStyle = ink
  x.lineWidth = 2.2
  x.setLineDash(dashed ? [8, 7] : [])
  x.stroke(shape)
  x.setLineDash([])
}

function* ditherGen(c) {
  const x = c.getContext("2d", { willReadFrequently: true })
  const W = c.width,
    H = c.height,
    BAND = 128
  for (let y0 = 0; y0 < H; y0 += BAND) {
    const h = Math.min(BAND, H - y0)
    const img = x.getImageData(0, y0, W, h)
    const d = img.data
    for (let yy = 0; yy < h; yy++) {
      const row = ((y0 + yy) & 7) << 3
      for (let xx = 0, i = yy * W * 4; xx < W; xx++, i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        const v = lum > (BAYER[row | (xx & 7)] + 0.5) * 3.984375 ? 255 : 0
        d[i] = d[i + 1] = d[i + 2] = v
      }
    }
    x.putImageData(img, 0, y0)
    yield
  }
}

// ---------------------------------------------------------------- ground layers
// the generative underlayer shared by every sheet. each call rolls its own
// recipe: which layers appear, how dense, how warped, which ink
function* ground(x, W, H, offs, o) {
  const inks = o.inks,
    dens = o.density
  const U = Math.max(0.5, W / 2048)
  const areaK = (W * H) / (2048 * 2048)

  const base = makeField(int(2, 4), 4),
    wu = makeField(2, 3),
    wv = makeField(3, 3)
  const warp = range(0, 0.35)
  const f = (u, v) => base(u + warp * (wu(u, v) - 0.5), v + warp * (wv(u, v) - 0.5))
  const sample = []
  for (let i = 0; i < 400; i++) sample.push(f(R(), R()))
  sample.sort((a, b) => a - b)
  const q = (t) => sample[Math.max(0, Math.min(399, Math.floor(t * 400)))]
  yield

  // survey contours, every fourth one heavier
  if (R() < 0.85) {
    const n = int(3, 3 + Math.round(10 * dens))
    const levels = []
    for (let i = 0; i < n; i++) levels.push(q((i + 0.5) / n + range(-0.3, 0.3) / n))
    const cols = Math.round(W / (14 * U)),
      rows = Math.round(H / (14 * U))
    const minor = contourPath(f, W, H, cols, rows, levels.filter((_, i) => i % 4))
    yield
    const major = contourPath(f, W, H, cols, rows, levels.filter((_, i) => i % 4 === 0))
    const ink = pick(inks),
      w = range(1.2, 2.4),
      dash = R() < 0.3 ? [range(4, 14), range(4, 12)] : []
    yield
    yield* stamp(x, offs, () => {
      x.strokeStyle = ink
      x.setLineDash(dash)
      x.lineWidth = w
      x.stroke(minor)
      x.setLineDash([])
      x.lineWidth = w * 1.9
      x.stroke(major)
    })
  }

  // streamlines through a second field
  if (R() < 0.7) {
    const g = makeField(int(2, 3), 3)
    const turn = range(0.6, 2.4),
      heading = R() * TAU,
      step = range(5, 9) * U
    const count = Math.round(range(60, 360) * dens * Math.max(areaK, 0.25))
    const p = new Path2D()
    for (let i = 0; i < count; i++) {
      let px = R() * W,
        py = R() * H
      const dir = R() < 0.5 ? 1 : -1,
        steps = int(8, 70)
      p.moveTo(px, py)
      for (let s = 0; s < steps; s++) {
        const a = heading + (g(px / W, py / H) - 0.5) * TAU * turn * 3
        px += Math.cos(a) * step * dir
        py += Math.sin(a) * step * dir
        p.lineTo(px, py)
      }
    }
    const ink = pick(inks),
      w = range(1, 2.4)
    yield
    yield* stamp(x, offs, () => {
      x.strokeStyle = ink
      x.lineWidth = w
      x.stroke(p)
    })
  }

  // stipple, thickest where the field peaks
  if (R() < 0.6) {
    const thr = q(range(0.5, 0.85)),
      sz = range(2, 4)
    const n = Math.round(range(4000, 16000) * dens * areaK)
    const p = new Path2D()
    for (let i = 0; i < n; i++) {
      const px = R() * W,
        py = R() * H
      const v = f(px / W, py / H)
      if (v > thr && R() < (v - thr) * 14) p.rect(px, py, sz, sz)
    }
    const ink = pick(inks)
    yield
    yield* stamp(x, offs, () => {
      x.fillStyle = ink
      x.fill(p)
    })
  }

  const nh = int(0, Math.round(4 * dens))
  for (let i = 0; i < nh; i++) {
    const cx = R() * W,
      cy = R() * H,
      rad = range(50, 240) * U
    const ang = R() * Math.PI,
      gap = Math.max(6, range(9, 22) * U),
      ink = pick(inks)
    yield* stamp(x, offs, seeded(() => hatch(x, cx, cy, rad, ang, gap, ink)))
  }

  yield* signal(x, W, H, offs, o, f, q, U)
}

// ---------------------------------------------------------------- signal layers
// the same survey as a video synth would set it down, kept in ink on paper.
// all of it goes under the units and the captions, which are drawn after
function* signal(x, W, H, offs, o, f, q, U) {
  const inks = o.inks,
    dens = o.density

  // raster scan: a window of the field read off line by line, each line
  // pushed up by what it finds there, so the reading stands up as relief
  if (R() < 0.65) {
    const rows = int(28, 64),
      gap = H / rows
    const r0 = int(0, rows - 1),
      nr = int(5, Math.max(6, Math.round(rows * 0.3)))
    const x0 = R() * W,
      ww = range(0.25, 0.7) * W
    const amp = gap * range(6, 20),
      mid = q(0.5),
      dx = 7 * U
    const p = new Path2D()
    for (let r = 0; r < nr; r++) {
      const y = (r0 + r + 0.5) * gap
      for (let t = 0; t <= ww; t += dx) {
        const ends = Math.min(1, t / (ww * 0.15), (ww - t) / (ww * 0.15))
        const py = y - amp * ends * Math.max(0, f((x0 + t) / W, y / H) - mid)
        t ? p.lineTo(x0 + t, py) : p.moveTo(x0 + t, py)
      }
    }
    const ink = pick(inks),
      w = range(1.2, 2.2)
    yield
    yield* stamp(x, offs, () => {
      x.strokeStyle = ink
      x.lineWidth = w
      x.stroke(p)
    })
  }

  // feedback tunnels: one outline shrinking into itself, turning as it goes
  const nt = int(0, Math.round(2 * dens))
  for (let i = 0; i < nt; i++) {
    const cx = R() * W,
      cy = R() * H,
      r0 = range(110, 300) * U
    const sides = int(3, 7),
      n = int(8, 22),
      sc = range(0.82, 0.93),
      turn = range(-0.16, 0.16)
    const driftX = range(-5, 5) * U,
      driftY = range(-5, 5) * U
    const rim = []
    for (let k = 0; k < sides; k++) rim.push([(k / sides) * TAU + range(-0.2, 0.2), range(0.75, 1.15)])
    const ink = pick(inks)
    yield* stamp(x, offs, () => {
      x.strokeStyle = ink
      for (let e = 0; e < n; e++) {
        const r = r0 * Math.pow(sc, e)
        x.lineWidth = Math.max(1, 2.4 * Math.pow(sc, e))
        x.beginPath()
        rim.forEach(([a, m], k) => {
          const px = cx + driftX * e + Math.cos(a + turn * e) * r * m,
            py = cy + driftY * e + Math.sin(a + turn * e) * r * m
          k ? x.lineTo(px, py) : x.moveTo(px, py)
        })
        x.closePath()
        x.stroke()
      }
    })
  }

  // test bars: a grey scale, which the dither then turns into dot patterns
  if (R() < 0.5) {
    const cx = R() * W,
      cy = R() * H,
      rot = range(-0.3, 0.3)
    const n = int(5, 9),
      bw = range(34, 60) * U,
      bh = range(40, 90) * U
    const lift = o.inks === INKS_LIGHT ? 0.35 : 1 // the sky's are as pale as the rest of it
    yield* stamp(x, offs, () => {
      x.save()
      x.translate(cx, cy)
      x.rotate(rot)
      for (let k = 0; k < n; k++) {
        const g = Math.round(255 - lift * 255 * (1 - k / n))
        x.fillStyle = `rgb(${g},${g},${g})`
        x.fillRect(k * bw, 0, bw, bh)
      }
      x.strokeStyle = inks[0]
      x.lineWidth = 2
      x.strokeRect(0, 0, n * bw, bh)
      x.restore()
    })
  }

  // horizontal hold: a few rows of everything drawn so far slip sideways, and
  // come back in at the other edge so a tiled sheet still meets itself
  if (R() < 0.75) {
    const c = x.canvas,
      cw = c.width
    const band = document.createElement("canvas")
    band.width = cw
    const bx = band.getContext("2d")
    const n = int(3, 9)
    x.save()
    x.setTransform(1, 0, 0, 1, 0, 0)
    for (let i = 0; i < n; i++) {
      const h = Math.max(4, Math.round(range(0.004, 0.035) * c.height))
      const y = Math.floor(R() * (c.height - h))
      const dx = Math.round(range(0.02, 0.14) * cw) * (R() < 0.5 ? 1 : -1)
      band.height = h
      bx.drawImage(c, 0, y, cw, h, 0, 0, cw, h)
      x.drawImage(band, dx, y)
      x.drawImage(band, dx - Math.sign(dx) * cw, y)
    }
    x.restore()
    yield
  }
}

// ---------------------------------------------------------------- sheets
// tiled, wraps seamlessly: every mark is stamped at nine offsets
function* floorSheet() {
  const S = 2048
  const { c, x } = sheet(S, S, 1.5)
  const T = wrapXY(S, S)
  yield* ground(x, S, S, T, { inks: INKS, density: 1 })

  // a network of nodes, each tied to its nearest neighbours across the wrap
  const nodes = []
  const nn = int(4, 12)
  for (let i = 0; i < nn; i++) nodes.push([R() * S, R() * S])
  const links = new Path2D(),
    dots = new Path2D()
  nodes.forEach(([ax, ay], i) => {
    const near = nodes
      .map(([bx, by], j) => {
        let dx = bx - ax,
          dy = by - ay
        if (dx > S / 2) dx -= S
        if (dx < -S / 2) dx += S
        if (dy > S / 2) dy -= S
        if (dy < -S / 2) dy += S
        return { j, dx, dy, d: Math.hypot(dx, dy) }
      })
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, int(1, 2))
    near.forEach((o) => {
      links.moveTo(ax, ay)
      links.lineTo(ax + o.dx, ay + o.dy)
    })
    dots.moveTo(ax + 9, ay)
    dots.arc(ax, ay, 9, 0, TAU)
  })
  const linkInk = pick(["#3a3a3a", "#5e5e5e", "#7a7a7a"]),
    dashed = R() < 0.5
  copies(x, T, () => {
    x.strokeStyle = linkInk
    x.lineWidth = 2.5
    x.setLineDash(dashed ? [14, 10] : [])
    x.stroke(links)
    x.setLineDash([])
    x.fillStyle = "#000"
    x.fill(dots)
    nodes.forEach((n, i) => label(x, "n" + i, n[0] + 18, n[1] - 16, 30, "left"))
  })
  yield

  // drawing units, scattered so no two crowd each other, measured around the wrap
  const placed = []
  const nu = int(2, 4)
  for (let t = 0; t < 80 && placed.length < nu; t++) {
    const px = R() * S,
      py = R() * S
    if (placed.some(([qx, qy]) => Math.hypot(wrapDist(qx - px, S), wrapDist(qy - py, S)) < 760)) continue
    placed.push([px, py])
    copies(
      x,
      T,
      seeded(() => unit(x, px, py, range(0.55, 0.95), pick(["#111", "#2b2b2b", "#4e4e4e"]), null, range(-0.7, 0.7))),
    )
  }
  yield

  const nm = int(3, 8)
  for (let i = 0; i < nm; i++) {
    const px = R() * S,
      py = R() * S
    copies(x, T, seeded(() => regMark(x, px, py, range(14, 26))))
  }
  const nc = int(3, 7)
  for (let i = 0; i < nc; i++) {
    const px = R() * S,
      py = R() * S
    copies(
      x,
      T,
      seeded(() => {
        x.save()
        x.translate(px, py)
        x.rotate(range(-0.5, 0.5))
        label(x, caption(), 0, 0, int(26, 38), "left")
        x.restore()
      }),
    )
  }
  const nr = int(0, 2)
  for (let i = 0; i < nr; i++) {
    const px = R() * S,
      py = R() * S
    copies(x, T, seeded(() => ruler(x, px, py, range(260, 620), R() * Math.PI, int(10, 24), 5)))
  }
  yield

  if (DITHER) yield* ditherGen(c)
  return c
}

function* skySheet() {
  const W = 2048,
    H = 1024
  const { c, x } = sheet(W, H, 1.5)

  // the generative layer only covers the part of the dome you can see
  x.save()
  x.beginPath()
  x.rect(0, H * 0.04, W, H * 0.56)
  x.clip()
  yield* ground(x, W, H, wrapX(W), { inks: INKS_LIGHT, density: 0.6 })
  x.restore()

  // equirectangular squeezes horizontally toward the poles, so anything drawn
  // near the top has to be pre-stretched or it smears into a point
  const dome = (fn, cx, cy) => {
    const k = 1 / Math.max(0.3, Math.sin(Math.PI * (cy / H)))
    x.save()
    x.translate(cx, cy)
    x.scale(k, 1)
    x.translate(-cx, -cy)
    fn()
    x.restore()
  }

  // nothing lands on top of anything else
  const taken = []
  const slot = (w, h, vMin, vMax) => {
    for (let t = 0; t < 90; t++) {
      const cy = H * (vMin + R() * (vMax - vMin))
      const cx = 40 + R() * (W - 80)
      const k = 1 / Math.max(0.3, Math.sin(Math.PI * (cy / H)))
      const ww = w * k
      if (taken.some((q) => Math.abs(q.x - cx) < (q.w + ww) / 2 + 30 && Math.abs(q.y - cy) < (q.h + h) / 2 + 24))
        continue
      taken.push({ x: cx, y: cy, w: ww, h })
      return [cx, cy]
    }
    return null
  }

  const marks = []
  const count = int(12, 24)
  for (let i = 0; i < count; i++) {
    const sc = range(0.4, 0.68)
    const at = slot(620 * sc, 230 * sc, 0.16, 0.58)
    if (!at) continue
    const ink = pick(["#8e8e8e", "#a2a2a2", "#b6b6b6"])
    marks.push(at)
    const draw = seeded((cx) => unit(x, cx, at[1], sc, ink, null, range(-0.25, 0.25)))
    dome(() => draw(at[0]), at[0], at[1])
    if (at[0] < 420) dome(() => draw(at[0] + W), at[0] + W, at[1])
    if (at[0] > W - 420) dome(() => draw(at[0] - W), at[0] - W, at[1])
  }
  yield

  // links between neighbouring marks
  x.strokeStyle = "#c6c6c6"
  x.lineWidth = 2.5
  for (let i = 0; i + 1 < marks.length; i += 2) {
    const a = marks[i],
      b = marks[i + 1]
    if (Math.abs(a[0] - b[0]) > 700) continue
    x.beginPath()
    x.moveTo(a[0], a[1])
    x.lineTo(b[0], b[1])
    x.stroke()
  }

  x.font = `32px ${FONT}`
  const nn = int(6, 13)
  for (let i = 0; i < nn; i++) {
    const note = caption()
    x.font = `32px ${FONT}`
    const at = slot(x.measureText(note).width, 44, 0.16, 0.55)
    if (!at) continue
    dome(() => label(x, note, at[0], at[1], 32), at[0], at[1])
  }
  yield

  if (DITHER) yield* ditherGen(c)
  return c
}

function* slabSheet(deg, sides) {
  const S = 1024
  const { c, x } = sheet(S, S, 1.25)
  yield* ground(x, S, S, wrapXY(S, S), { inks: INKS_MID, density: 0.7 })

  const cx = S / 2 + range(-40, 40),
    cy = S / 2 + range(-40, 40),
    Rr = range(260, 340),
    pts = []
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TAU + range(-0.2, 0.2)
    pts.push([cx + Math.cos(a) * Rr * range(0.75, 1.15), cy + Math.sin(a) * Rr * range(0.75, 1.15)])
  }
  x.strokeStyle = "#000"
  x.lineWidth = 3
  x.beginPath()
  pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])))
  x.closePath()
  x.stroke()
  pts.forEach((p, i) => {
    x.fillStyle = "#000"
    x.beginPath()
    x.arc(p[0], p[1], 7, 0, TAU)
    x.fill()
    label(x, "v" + i, p[0] + 14, p[1] - 12, 26, "left")
  })

  unit(x, S / 2 + range(-60, 60), S / 2 + range(-60, 60), range(0.5, 0.66), "#000", null, range(-0.4, 0.4))

  // the printed angle is the tilt the plate is actually built at
  const rad = (deg * Math.PI) / 180
  x.fillStyle = "#fff"
  x.fillRect(100, S - 290, 350, 180)
  x.strokeStyle = "#000"
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(120, S - 140)
  x.lineTo(420, S - 140)
  x.moveTo(120, S - 140)
  x.lineTo(120 + Math.cos(rad) * 300, S - 140 - Math.sin(rad) * 300)
  x.stroke()
  x.beginPath()
  x.arc(120, S - 140, 86, -rad, 0)
  x.stroke()
  label(x, deg.toFixed(1) + "°", 216, S - 162, 34, "left")
  label(x, "plane " + sides + "-gon / tilt as built", 118, 132, 28, "left")
  yield

  if (DITHER) yield* ditherGen(c)
  return c
}

function* stoneSheet() {
  const S = 1024
  const { c, x } = sheet(S, S, 1.5)
  yield* ground(x, S, S, wrapXY(S, S), { inks: INKS, density: 0.8 })
  unit(x, S * range(0.4, 0.6), S * range(0.28, 0.4), range(0.62, 0.82), "#000", null, range(-0.5, 0.5))
  label(x, caption(), 90, S * 0.68, 30, "left")
  ruler(x, S / 2, S * 0.78, S - 180, range(-0.08, 0.08), 20, 5)
  label(x, "surface reading / continuous", 90, S * 0.9, 26, "left")
  yield
  if (DITHER) yield* ditherGen(c)
  return c
}

// a sheet for things that grow. same drawing, different nouns, plus a callout
function* specimenSheet(notes, headline, bank) {
  const S = 1024
  const { c, x } = sheet(S, S, 1.25)
  yield* ground(x, S, S, wrapXY(S, S), { inks: INKS_MID, density: 0.8 })
  unit(x, S * range(0.42, 0.58), S * range(0.24, 0.34), range(0.6, 0.78), "#000", bank, range(-0.5, 0.5))
  label(x, pick(notes), 88, S * 0.6, 30, "left")

  const cx = S * range(0.18, 0.3),
    cy = S * range(0.74, 0.84),
    r = range(50, 80)
  x.strokeStyle = "#000"
  x.lineWidth = 3
  wobble(x, cx, cy, r, 0.08, 40)
  x.stroke()
  arrow(x, cx + r + 6, cy, S * 0.52, S * 0.77, 14, range(-40, 40))
  label(x, headline, S * 0.545, S * 0.782, 32, "left")
  ruler(x, S / 2, S * 0.92, S - 176, range(-0.03, 0.03), 16, 4)
  yield
  if (DITHER) yield* ditherGen(c)
  return c
}

// ---------------------------------------------------------------- dissolve shader
// every drawn surface samples two sheets and swaps between them cell by cell,
// in drifting patches rather than a uniform fade. while they do, the sheet
// loses its horizontal hold: a few of its rows slip sideways, on the surface
// itself, and settle as the new edition takes
const DISSOLVE_UNIFORMS = `
uniform sampler2D uMapNext;
uniform float uMix;
uniform float uGrain;
`
const DISSOLVE_MAP = `
#ifdef USE_MAP
  float fault = sin( 3.14159265 * uMix );
  fault *= fault;
  vec2 row = vec2( floor( vMapUv.y * uGrain * 0.5 ), floor( uMix * 24.0 ) );
  float slip = fract( sin( dot( row, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  float pull = fract( sin( dot( row, vec2( 39.3468, 11.1351 ) ) ) * 24634.6345 ) - 0.5;
  vec2 heldUv = vMapUv + vec2( step( 1.0 - 0.3 * fault, slip ) * pull * fault * 4.0 / uGrain, 0.0 );
  vec2 cell = floor( heldUv * uGrain );
  float grain = fract( sin( dot( cell, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  float drift = 0.5 + 0.5 * sin( cell.x * 0.23 + cell.y * 0.17 + 3.0 * sin( cell.y * 0.11 ) );
  float edge = grain * 0.4 + drift * 0.6;
  vec4 sampledDiffuseColor = mix( texture2D( map, heldUv ), texture2D( uMapNext, heldUv ), uMix > edge ? 1.0 : 0.0 );
  diffuseColor *= sampledDiffuseColor;
#endif
`

// ---------------------------------------------------------------- bloom shader
// bloom, both ways, as in the home game world: the frame is shrunk to a haze
// and to a wider one. the wide haze goes back wherever it is the darker, so
// ink throws a soft glow onto the paper round it; then the tight one wherever
// it is the lighter, so paper glows into the ink's edge
const BLOOM = 0.2 // paper into ink
const GLOW_INK = 0.2 // ink onto paper
const INK_GAIN = 2.5 // the lines here are hair thin, so their haze is deepened to show
const POST_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`
// the scene target is linear. the haze is kept display-encoded, so the blur
// and the darken/lighten weigh ink and paper the way the eye does
const POST_ENCODE = `
vec3 encode( vec3 c ) {
  c = clamp( c, 0.0, 1.0 );
  return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) );
}
`
const SHRINK_FRAG = `
uniform sampler2D uMap;
uniform vec2 uTexel;
uniform bool uEncode;
varying vec2 vUv;
${POST_ENCODE}
vec3 tap( vec2 o ) {
  vec3 c = texture2D( uMap, vUv + o * uTexel ).rgb;
  return uEncode ? encode( c ) : c;
}
void main() {
  gl_FragColor = vec4( ( tap( vec2( -1.0, -1.0 ) ) + tap( vec2( 1.0, -1.0 ) ) + tap( vec2( -1.0, 1.0 ) ) + tap( vec2( 1.0, 1.0 ) ) ) * 0.25, 1.0 );
}
`
const BLOOM_FRAG = `
uniform sampler2D uMap;
uniform sampler2D uHaze;
uniform sampler2D uWide;
uniform vec2 uHazeTexel;
uniform vec2 uWideTexel;
uniform float uBloom;
uniform float uGlowInk;
uniform float uInkGain;
varying vec2 vUv;
${POST_ENCODE}
// a tent over the neighbours, so the small haze scales back up without blocks
vec3 tent( sampler2D t, vec2 px ) {
  vec3 c = texture2D( t, vUv ).rgb * 4.0;
  c += ( texture2D( t, vUv + vec2( px.x, 0.0 ) ).rgb + texture2D( t, vUv - vec2( px.x, 0.0 ) ).rgb
       + texture2D( t, vUv + vec2( 0.0, px.y ) ).rgb + texture2D( t, vUv - vec2( 0.0, px.y ) ).rgb ) * 2.0;
  c += texture2D( t, vUv + px ).rgb + texture2D( t, vUv - px ).rgb
     + texture2D( t, vUv + vec2( px.x, -px.y ) ).rgb + texture2D( t, vUv + vec2( -px.x, px.y ) ).rgb;
  return c / 16.0;
}
void main() {
  vec3 c = encode( texture2D( uMap, vUv ).rgb );
  vec3 ink = 1.0 - min( ( 1.0 - tent( uWide, uWideTexel ) ) * uInkGain, 1.0 );
  c = mix( c, min( c, ink ), uGlowInk );
  c = mix( c, max( c, tent( uHaze, uHazeTexel ) ), uBloom );
  gl_FragColor = vec4( c, 1.0 );
}
`

// ---------------------------------------------------------------- geometry helpers
const YUP = new THREE.Vector3(0, 1, 0)

function blob(a1, a2, a3, detail) {
  const g = new THREE.IcosahedronGeometry(1, detail === undefined ? 3 : detail)
  const p = g.attributes.position,
    v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const n =
      0.2 * Math.sin(v.x * 2.7 + a1) * Math.cos(v.y * 2.3 + a2) +
      0.13 * Math.sin(v.z * 3.9 + a3) +
      0.07 * Math.cos(v.x * 6.1 + v.y * 5.3 + a1) +
      0.04 * Math.sin(v.z * 8.4 + v.x * 7.1 + a2)
    v.multiplyScalar(1 + n)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  return g
}

// positions only. everything gets its normals and uvs after the merge
function mergeGeos(list) {
  let n = 0
  const gs = list.map((g) => (g.index ? g.toNonIndexed() : g))
  gs.forEach((g) => (n += g.attributes.position.array.length))
  const pos = new Float32Array(n)
  let o = 0
  for (const g of gs) {
    pos.set(g.attributes.position.array, o)
    o += g.attributes.position.array.length
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  return out
}

// the geometry is non-indexed for box projection, so computeVertexNormals gives
// one normal per face and the model reads as a die. average across shared
// positions instead: same facets, no faceted shading.
function smoothNormals(geo) {
  const p = geo.attributes.position
  const key = (i) =>
    Math.round(p.getX(i) * 1e4) + "," + Math.round(p.getY(i) * 1e4) + "," + Math.round(p.getZ(i) * 1e4)
  const acc = new Map()
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3()
  const ab = new THREE.Vector3(),
    ac = new THREE.Vector3(),
    n = new THREE.Vector3()
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i)
    b.fromBufferAttribute(p, i + 1)
    c.fromBufferAttribute(p, i + 2)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    n.crossVectors(ab, ac) // unnormalised, so area weights it
    for (let k = 0; k < 3; k++) {
      const kk = key(i + k)
      let v = acc.get(kk)
      if (!v) {
        v = new THREE.Vector3()
        acc.set(kk, v)
      }
      v.add(n)
    }
  }
  const out = new Float32Array(p.count * 3)
  const t = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    t.copy(acc.get(key(i))).normalize()
    out[i * 3] = t.x
    out[i * 3 + 1] = t.y
    out[i * 3 + 2] = t.z
  }
  geo.setAttribute("normal", new THREE.BufferAttribute(out, 3))
}

// box projection, so the drawing wraps the model instead of pinching at the poles
function boxUV(geo, scale) {
  const p = geo.attributes.position
  const uv = new Float32Array(p.count * 2)
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3()
  const ab = new THREE.Vector3(),
    ac = new THREE.Vector3(),
    n = new THREE.Vector3()
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i)
    b.fromBufferAttribute(p, i + 1)
    c.fromBufferAttribute(p, i + 2)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    n.crossVectors(ab, ac).normalize()
    const ax = Math.abs(n.x),
      ay = Math.abs(n.y),
      az = Math.abs(n.z)
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c
      let u, w
      if (ax >= ay && ax >= az) {
        u = n.x > 0 ? -v.z : v.z
        w = v.y
      } else if (ay >= ax && ay >= az) {
        u = v.x
        w = n.y > 0 ? -v.z : v.z
      } else {
        u = n.z > 0 ? v.x : -v.x
        w = v.y
      }
      uv[(i + k) * 2] = u / scale + 0.5
      uv[(i + k) * 2 + 1] = w / scale + 0.5
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
}

function stoneGeometry(a1, a2, a3, uvTile) {
  const g = blob(a1, a2, a3)
  smoothNormals(g)
  boxUV(g, uvTile || 2.6)
  return g
}

// ---------------------------------------------------------------- the world
// builds the whole scene into `host`. returns start and dispose.
function buildWorld(host, ui) {
  const rng = mulberry32(20260914) // layout only. the drawings use their own seeds
  let alive = true

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  const MAXANISO = renderer.capabilities.getMaxAnisotropy()

  function makeTex(c, rep) {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = MAXANISO
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.magFilter = THREE.LinearFilter
    t.generateMipmaps = true
    if (rep) t.repeat.set(rep, rep)
    return t
  }

  // ---------------------------------------------------------------- living surfaces
  // a surface is a material plus the sheet generator that feeds it. every
  // edition regenerates all of them from a fresh seed.
  const BASE = (Math.random() * 4294967296) >>> 0
  const seedFor = (ed, i) => (BASE ^ Math.imul(ed + 1, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca77)) >>> 0
  const slots = []

  function surface(mat, make, repeat, grain) {
    const slot = { mat, make, repeat, uNext: { value: null }, uMix: { value: 0 }, uGrain: { value: grain } }
    const t = makeTex(runSync(make(), seedFor(0, slots.length)), repeat)
    mat.map = t
    slot.uNext.value = t
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uMapNext = slot.uNext
      shader.uniforms.uMix = slot.uMix
      shader.uniforms.uGrain = slot.uGrain
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\n" + DISSOLVE_UNIFORMS)
        .replace("#include <map_fragment>", DISSOLVE_MAP)
    }
    slots.push(slot)
    return mat
  }

  const cycle = { edition: 0, state: "idle", nextAt: Infinity, fade: 0 }
  const now = () => performance.now() / 1000
  const schedule = () => {
    cycle.nextAt = now() + REDRAW_MIN + Math.random() * (REDRAW_MAX - REDRAW_MIN)
    cycle.state = "idle"
  }

  // generate the next edition a few ms at a time, upload it, then let the
  // render loop dissolve it in
  async function redraw() {
    cycle.state = "drawing"
    const ed = cycle.edition + 1
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      const c = await runAsync(s.make(), seedFor(ed, i), () => alive)
      if (!c) return
      const t = makeTex(c, s.repeat)
      renderer.initTexture(t) // upload now, not on the first frame it's seen
      s.uNext.value = t
      await breath()
      if (!alive) return
    }
    cycle.fade = 0
    cycle.state = "fading"
  }

  function commit() {
    for (const s of slots) {
      const old = s.mat.map
      s.mat.map = s.uNext.value
      s.uMix.value = 0
      if (old !== s.mat.map) old.dispose()
    }
    cycle.edition++
    schedule()
  }

  // ---------------------------------------------------------------- renderer
  const size = () => [host.clientWidth || innerWidth, host.clientHeight || innerHeight]
  let [vw, vh] = size()
  let ratio = Math.min(devicePixelRatio, 2) // the loop lowers this if the frame rate can't hold
  renderer.setPixelRatio(ratio)
  renderer.setSize(vw, vh)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap // blurable, gives a true drop shadow
  // nothing that casts a shadow moves, so the map is only drawn again when the
  // sun steps to follow you, and now and then for anything that loaded late
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderer.xr.enabled = true
  const view = renderer.domElement
  view.tabIndex = 0
  view.className = "fns-canvas"
  host.appendChild(view)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)
  scene.fog = new THREE.Fog(0xffffff, 60, 265)

  const camera = new THREE.PerspectiveCamera(72, vw / vh, 0.05, 900)
  const dolly = new THREE.Group()
  dolly.position.set(0, 0, 16)
  const head = new THREE.Group()
  head.position.y = 1.65
  head.add(camera)
  dolly.add(head)
  scene.add(dolly)

  // three uses physical light units: diffuse response is intensity / PI, so white
  // paper needs roughly PI worth of light before it actually reads as white
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf2f2f2, 2.05))
  const fill = new THREE.DirectionalLight(0xffffff, 0.35)
  fill.position.set(-22, 16, -26)
  scene.add(fill)
  const sun = new THREE.DirectionalLight(0xffffff, 1.35)
  sun.position.set(58, 96, 38)
  sun.castShadow = true
  sun.shadow.mapSize.set(3072, 3072)
  sun.shadow.radius = 6 // VSM blur width
  sun.shadow.blurSamples = 20
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 320
  const SH = 62 // wide enough for the big bodies
  sun.shadow.camera.left = -SH
  sun.shadow.camera.right = SH
  sun.shadow.camera.top = SH
  sun.shadow.camera.bottom = -SH
  sun.shadow.bias = 0
  sun.shadow.normalBias = 0.01
  scene.add(sun)
  scene.add(sun.target)

  // ---------------------------------------------------------------- surfaces
  // the floor tile covers 25 units; the layers wrap, so the seam never shows
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    surface(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 }), floorSheet, 24, 40),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // the sky is a shell of flat plates, few enough that it reads as built
  // rather than as a dome, with every join ruled in
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(360, 10, 6),
    surface(
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, toneMapped: false }),
      skySheet,
      0,
      72,
    ),
  )
  const skyEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(sky.geometry, 1),
    new THREE.LineBasicMaterial({ color: 0x9a9a9a, fog: false, toneMapped: false }),
  )
  skyEdges.scale.setScalar(0.995)
  sky.add(skyEdges)
  scene.add(sky)

  // six sheets shared by every plate. the printed angle matches the tilt
  // because the tilt is taken from the sheet rather than the other way round
  const SLAB_SHEETS = []
  for (let i = 0; i < 6; i++) {
    const deg = 5 + i * 4,
      sides = 5 + (i % 4)
    SLAB_SHEETS.push({
      deg,
      sides,
      mat: surface(
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 }),
        () => slabSheet(deg, sides),
        0,
        32,
      ),
    })
  }

  const treeMats = [
    surface(
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 }),
      () => specimenSheet(TREE_NOTES, "trunk, at height", OBJECTS),
      0,
      32,
    ),
    surface(
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 }),
      () => specimenSheet(TREE_NOTES, "crown, conical", OBJECTS),
      0,
      32,
    ),
  ]

  const stoneMats = [0xffffff, 0xfdfdfd, 0xfafafa, 0xffffff].map((color) =>
    surface(new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0 }), stoneSheet, 0, 32),
  )

  // ---------------------------------------------------------------- clusters
  const blockers = [] // big bodies you cannot walk through
  // a plain radial gradient laid on the floor. the shadow map handles the light,
  // this only restores contact where the blur washes it out.
  const DROP_OPACITY = 0.3
  const dropMap = (() => {
    const S = 512,
      c = document.createElement("canvas")
    c.width = c.height = S
    const x = c.getContext("2d")
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, "rgba(0,0,0,1)")
    g.addColorStop(0.45, "rgba(0,0,0,0.55)")
    g.addColorStop(1, "rgba(0,0,0,0)")
    x.fillStyle = g
    x.fillRect(0, 0, S, S)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })()
  function dropShadow(radius) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({
        map: dropMap,
        transparent: true,
        opacity: DROP_OPACITY,
        depthWrite: false,
        color: 0x000000,
        fog: true,
      }),
    )
    m.rotation.x = -Math.PI / 2
    m.renderOrder = 1
    return m
  }

  function makeCluster(px, pz, k, hang) {
    const cluster = new THREE.Group()
    cluster.position.set(px, 0, pz)

    const plate = SLAB_SHEETS[Math.floor(rng() * SLAB_SHEETS.length)]
    const sides = plate.sides,
      tiltDeg = plate.deg
    const Rad = (1.5 + rng() * 1.3) * k

    const shape = new THREE.Shape()
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + (rng() - 0.5) * 0.22
      const r = Rad * (0.74 + rng() * 0.46)
      const sx = Math.cos(a) * r,
        sy = Math.sin(a) * r
      i ? shape.lineTo(sx, sy) : shape.moveTo(sx, sy)
    }
    shape.closePath()

    const depth = (0.1 + rng() * 0.2) * Math.sqrt(k)
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 })
    geo.computeBoundingBox()
    const bb = geo.boundingBox,
      uv = geo.attributes.uv,
      gp = geo.attributes.position
    const w = bb.max.x - bb.min.x,
      h = bb.max.y - bb.min.y
    const rep = Math.max(1, Math.round(Math.sqrt(k))) // keep the drawing near a constant size
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, ((gp.getX(i) - bb.min.x) / w) * rep, ((gp.getY(i) - bb.min.y) / h) * rep)
    }
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, depth, 0)

    const slab = new THREE.Mesh(geo, plate.mat)
    slab.castShadow = slab.receiveShadow = true

    const yaw = new THREE.Group()
    yaw.rotation.y = rng() * Math.PI * 2
    const lean = new THREE.Group()
    lean.rotation.z = (tiltDeg * Math.PI) / 180
    yaw.add(lean)
    lean.add(slab)
    cluster.add(yaw)

    if (hang) {
      cluster.position.y = hang
      cluster.rotation.set((rng() - 0.5) * 1.3, rng() * 6.283, (rng() - 0.5) * 1.3)
    } else {
      cluster.position.y = Rad * Math.sin((tiltDeg * Math.PI) / 180) + 0.02
      const drop = dropShadow(Rad * 1.5)
      drop.position.y = -cluster.position.y + 0.008 // sits on the floor, not the plate
      cluster.add(drop)
    }

    const n = 1 + Math.floor(rng() * (k > 2.5 ? 3 : 2))
    for (let i = 0; i < n; i++) {
      const sc = (0.36 + rng() * 0.55) * k * (i ? 0.55 + rng() * 0.5 : 1)
      const st = new THREE.Mesh(
        stoneGeometry(rng() * 10, rng() * 10, rng() * 10, Math.min(3.0, 1.9 / sc)),
        stoneMats[Math.floor(rng() * stoneMats.length)],
      )
      st.scale.set(sc * (0.85 + rng() * 0.4), sc * (0.72 + rng() * 0.5), sc * (0.85 + rng() * 0.4))
      st.position.set((rng() - 0.5) * Rad * 0.8, depth + sc * 0.6, (rng() - 0.5) * Rad * 0.8)
      st.rotation.set(rng() * 3, rng() * 3, rng() * 3)
      st.castShadow = st.receiveShadow = true
      lean.add(st)
      const worldR = sc * 0.9
      if (!hang && worldR > 1.1) blockers.push({ x: px + st.position.x, z: pz + st.position.z, r: worldR })
    }
    scene.add(cluster)
  }

  // size is heavy tailed: mostly knee height, a few the size of a building
  const sizes = []
  for (let i = 0; i < 26; i++) sizes.push(0.5 + Math.pow(rng(), 3.1) * 8.5)
  sizes.sort((a, b) => b - a) // place the big ones while there is room

  const spots = []
  for (const k of sizes) {
    const rad = 2.8 * k + 1.5
    let guard = 0
    while (guard++ < 400) {
      const x = (rng() - 0.5) * 132,
        z = (rng() - 0.5) * 132
      if (Math.hypot(x, z - 16) < 7 + rad) continue // keep the spawn clear
      if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < rad + p.rad + 3)) continue
      spots.push({ x, z, k, rad })
      break
    }
  }
  spots.forEach((p) => makeCluster(p.x, p.z, p.k))

  // footprints already occupied on the ground plane
  const taken2D = spots.map((p) => ({ x: p.x, z: p.z, r: p.rad }))

  // suspended bodies. no support, no explanation, they cast down onto the floor
  const air = []
  for (let i = 0; i < 14; i++) {
    const k = 0.5 + Math.pow(rng(), 2.4) * 5.5
    const r = 3.0 * k
    for (let t = 0; t < 200; t++) {
      const a = rng() * Math.PI * 2,
        d = 12 + rng() * 62
      const px = Math.cos(a) * d,
        pz = Math.sin(a) * d + 8
      const y = Math.max(r + 3, 7 + Math.pow(rng(), 1.4) * 44)
      if (air.some((q) => Math.hypot(q.x - px, q.y - y, q.z - pz) < q.r + r + 3)) continue
      if (y - r < 6 && taken2D.some((q) => Math.hypot(q.x - px, q.z - pz) < q.r + r)) continue
      air.push({ x: px, y, z: pz, r })
      makeCluster(px, pz, k, y)
      break
    }
  }

  for (let i = 0; i < 55; i++) {
    const s = 0.1 + Math.pow(rng(), 2.6) * 3.4
    const m = new THREE.Mesh(
      stoneGeometry(rng() * 10, rng() * 10, rng() * 10, Math.min(3.0, 1.9 / s)),
      stoneMats[Math.floor(rng() * stoneMats.length)],
    )
    m.scale.set(s, s * (0.6 + rng() * 0.4), s)
    let sx = 0,
      sz = 0,
      ok = false
    for (let t = 0; t < 120 && !ok; t++) {
      sx = (rng() - 0.5) * 138
      sz = (rng() - 0.5) * 138
      ok = !taken2D.some((q) => Math.hypot(q.x - sx, q.z - sz) < q.r + s * 1.6 + 1.2)
    }
    if (!ok) continue
    taken2D.push({ x: sx, z: sz, r: s * 1.6 })
    m.position.set(sx, s * 0.55, sz)
    m.rotation.set(rng() * 3, rng() * 3, rng() * 3)
    m.castShadow = m.receiveShadow = true
    scene.add(m)
    const d = dropShadow(s * 2.2)
    d.position.set(m.position.x, 0.006, m.position.z)
    scene.add(d)
    if (s > 1.1) blockers.push({ x: m.position.x, z: m.position.z, r: s * 0.9 })
  }

  // ---------------------------------------------------------------- growth
  // a conifer: one tapered trunk that leans a little, whorls of branches that
  // shorten and lift toward the top, each carrying sprigs of needles, and a
  // leader spike above the lot. merged into one mesh per tree so the draw
  // count stays low.
  function treeGeometry(k) {
    const parts = []
    const H = (4.2 + rng() * 2.2) * k
    const swayX = (rng() - 0.5) * 0.5 * k,
      swayZ = (rng() - 0.5) * 0.5 * k
    // the trunk is not a straight line: it drifts as it rises
    const axis = (t) => new THREE.Vector3(swayX * t * t, H * t, swayZ * t * t)

    const tube = (a, b, r0, r1, radial) => {
      const dir = new THREE.Vector3().subVectors(b, a)
      const len = dir.length()
      const g = new THREE.CylinderGeometry(r1, r0, len, radial, 1, true)
      g.translate(0, len / 2, 0)
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(YUP, dir.normalize()))
      g.translate(a.x, a.y, a.z)
      return g
    }
    // one sprig of needles: a slim open cone, tip pointing the way it grows
    const sprig = (at, dir, len, rad) => {
      const g = new THREE.ConeGeometry(rad, len, 6, 1, true)
      g.translate(0, len / 2, 0)
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(YUP, dir))
      g.translate(at.x, at.y, at.z)
      return g
    }

    const rBase = 0.16 * k
    const SEG = 6
    for (let i = 0; i < SEG; i++) {
      const t0 = i / SEG,
        t1 = (i + 1) / SEG
      parts.push(tube(axis(t0), axis(t1), rBase * (1 - 0.85 * t0), rBase * (1 - 0.85 * t1), 7))
    }

    const crown = (1.5 + rng() * 0.9) * k
    const whorls = 6 + Math.floor(rng() * 4)
    for (let w = 0; w < whorls; w++) {
      const t = 0.2 + (w / whorls) * 0.76
      const base = axis(t)
      const len = crown * Math.pow(1 - t, 0.8) * (0.75 + rng() * 0.5)
      if (len < 0.12 * k) continue
      const n = 4 + Math.floor(rng() * 3)
      const off = rng() * Math.PI * 2
      for (let j = 0; j < n; j++) {
        const az = off + (j / n) * Math.PI * 2 + (rng() - 0.5) * 0.5
        const el = (t - 0.6) * 1.1 + (rng() - 0.5) * 0.25 // droops low down, lifts near the top
        const dir = new THREE.Vector3(
          Math.cos(az) * Math.cos(el),
          Math.sin(el),
          Math.sin(az) * Math.cos(el),
        ).normalize()
        parts.push(tube(base, base.clone().addScaledVector(dir, len), 0.045 * k * (1 - t * 0.5), 0.015 * k, 5))
        const tufts = 2 + Math.floor(rng() * 2)
        for (let s = 0; s < tufts; s++) {
          const at = base.clone().addScaledVector(dir, len * (0.25 + (s / tufts) * 0.7))
          const d = dir
            .clone()
            .add(new THREE.Vector3((rng() - 0.5) * 0.5, (rng() - 0.5) * 0.5 - 0.12, (rng() - 0.5) * 0.5))
            .normalize()
          parts.push(sprig(at, d, len * (0.45 + rng() * 0.4), (0.13 + rng() * 0.12) * k * (1.1 - t * 0.6)))
        }
      }
    }

    parts.push(sprig(axis(1).addScaledVector(YUP, -0.35 * k), YUP, (0.7 + rng() * 0.5) * k, 0.2 * k))

    const merged = mergeGeos(parts)
    parts.forEach((g) => g.dispose())
    smoothNormals(merged)
    boxUV(merged, 2.2)
    return merged
  }

  function freeSpot(r, reach) {
    for (let t = 0; t < 200; t++) {
      const x = (rng() - 0.5) * (reach || 130),
        z = (rng() - 0.5) * (reach || 130)
      if (Math.hypot(x, z - 16) < 6 + r) continue
      if (taken2D.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + r + 1.2)) continue
      taken2D.push({ x, z, r })
      return [x, z]
    }
    return null
  }

  for (let i = 0; i < 24; i++) {
    const k = 0.55 + Math.pow(rng(), 2.2) * 2.6
    const at = freeSpot(2.4 * k)
    if (!at) continue
    const t = new THREE.Mesh(treeGeometry(k), treeMats[Math.floor(rng() * treeMats.length)])
    t.position.set(at[0], 0, at[1])
    t.rotation.y = rng() * 6.283
    t.castShadow = t.receiveShadow = true
    scene.add(t)
    const d = dropShadow(2.2 * k)
    d.position.set(at[0], 0.006, at[1])
    scene.add(d)
    blockers.push({ x: at[0], z: at[1], r: 0.45 * k })
  }

  // ---------------------------------------------------------------- look
  // pointer lock is blocked in some embedded frames, so drag-look is always live
  const euler = new THREE.Euler(0, 0, 0, "YXZ")
  let locked = false,
    dragging = false,
    started = false

  function turn(dx, dy) {
    euler.setFromQuaternion(camera.quaternion)
    euler.y -= dx * 0.0024
    euler.x -= dy * 0.0024
    euler.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, euler.x))
    camera.quaternion.setFromEuler(euler)
  }

  function requestLock() {
    try {
      const r = view.requestPointerLock && view.requestPointerLock()
      if (r && r.catch) r.catch(() => ui.setMode("pointer lock blocked", "drag"))
    } catch {
      ui.setMode("pointer lock blocked", "drag")
    }
  }

  let lockCheck = null
  function start() {
    started = true
    ui.setStarted(true)
    if (cycle.nextAt === Infinity) schedule()
    view.focus()
    requestLock()
    lockCheck = setTimeout(() => {
      if (document.pointerLockElement !== view) ui.setMode("pointer lock blocked", "drag")
    }, 400)
  }

  const listeners = []
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    listeners.push(() => target.removeEventListener(type, fn, opts))
  }

  on(view, "click", () => {
    if (!started) start()
    else if (!locked) requestLock()
  })
  on(document, "pointerlockchange", () => {
    locked = document.pointerLockElement === view
    if (locked) ui.setMode("pointer lock on", "mouse")
    else if (started) ui.setMode("pointer lock off", "drag")
  })
  on(document, "pointerlockerror", () => ui.setMode("pointer lock blocked", "drag"))

  on(view, "pointerdown", (e) => {
    dragging = true
    view.setPointerCapture(e.pointerId)
  })
  on(view, "pointerup", (e) => {
    dragging = false
    view.releasePointerCapture?.(e.pointerId)
  })
  on(view, "pointercancel", () => {
    dragging = false
  })
  on(view, "pointermove", (e) => {
    if (locked) turn(e.movementX, e.movementY)
    else if (dragging && started) turn(e.movementX || 0, e.movementY || 0)
  })

  // ---------------------------------------------------------------- move
  const keys = Object.create(null)
  let fly = false // Q lifts off, E brings you down, and touching the floor is walking again
  const onKey = (e, down) => {
    if (!started) return
    keys[e.code] = down
    if (down && e.code === "KeyQ") fly = true
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault()
  }
  on(window, "keydown", (e) => onKey(e, true))
  on(window, "keyup", (e) => onKey(e, false))
  // drop held keys when the tab loses focus, otherwise you keep walking
  on(window, "blur", () => {
    for (const k in keys) keys[k] = false
  })

  const vel = new THREE.Vector3(),
    fwd = new THREE.Vector3(),
    right = new THREE.Vector3(),
    wish = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  let snapCd = 0

  function move(dt) {
    const speed = keys.ShiftLeft || keys.ShiftRight ? 11 : 4.5
    camera.getWorldDirection(fwd)
    if (!fly) fwd.y = 0
    fwd.normalize()
    right.crossVectors(fwd, UP).normalize()

    wish.set(0, 0, 0)
    if (keys.KeyW || keys.ArrowUp) wish.add(fwd)
    if (keys.KeyS || keys.ArrowDown) wish.sub(fwd)
    if (keys.KeyD || keys.ArrowRight) wish.add(right)
    if (keys.KeyA || keys.ArrowLeft) wish.sub(right)
    if (fly) {
      if (keys.KeyQ) wish.y += 1
      if (keys.KeyE) wish.y -= 1
    }
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed)

    const session = renderer.xr.getSession()
    if (session) {
      for (const src of session.inputSources) {
        const gp = src.gamepad
        if (!gp || gp.axes.length < 4) continue
        const ax = gp.axes[2],
          ay = gp.axes[3]
        if (src.handedness !== "right") {
          if (Math.abs(ax) > 0.15) wish.addScaledVector(right, ax * speed)
          if (Math.abs(ay) > 0.15) wish.addScaledVector(fwd, -ay * speed)
        } else if (Math.abs(ax) > 0.7 && snapCd <= 0) {
          dolly.rotation.y -= (Math.sign(ax) * Math.PI) / 6
          snapCd = 0.3
        }
      }
    }
    snapCd -= dt

    vel.lerp(wish, 1 - Math.pow(0.0008, dt))
    dolly.position.addScaledVector(vel, dt)
    dolly.position.x = THREE.MathUtils.clamp(dolly.position.x, -84, 84)
    dolly.position.z = THREE.MathUtils.clamp(dolly.position.z, -84, 84)

    if (!fly) {
      for (const b of blockers) {
        const dx = dolly.position.x - b.x,
          dz = dolly.position.z - b.z
        const d = Math.hypot(dx, dz),
          reach = b.r + 0.45
        if (d < reach && d > 1e-4) {
          const push = (reach - d) / d
          dolly.position.x += dx * push
          dolly.position.z += dz * push
        }
      }
    }
    if (fly) {
      dolly.position.y = THREE.MathUtils.clamp(dolly.position.y, 0, 66)
      if (keys.KeyE && dolly.position.y <= 0) fly = false
    } else dolly.position.y += (0 - dolly.position.y) * Math.min(1, dt * 9)
  }

  // ---------------------------------------------------------------- vr
  if (navigator.xr) {
    navigator.xr
      .isSessionSupported("immersive-vr")
      .then((ok) => {
        if (!ok || !alive) return
        ui.setVr(async () => {
          const s = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor", "bounded-floor"],
          })
          head.position.y = 0
          renderer.xr.setSession(s)
          if (!started) start()
          s.addEventListener("end", () => {
            head.position.y = 1.65
          })
        })
      })
      .catch(() => {})
  }

  // ---------------------------------------------------------------- bloom
  // the frame goes to a target, is halved four times over, and is put back
  // with the quarter and the sixteenth laid over it
  const frame = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
  const steps = [0, 1, 2, 3].map(() => new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }))
  const [, haze, , wide] = steps
  const postMat = (fragmentShader, uniforms) =>
    new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false })
  const shrinkMat = postMat(SHRINK_FRAG, { uMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uEncode: { value: false } })
  const bloomMat = postMat(BLOOM_FRAG, {
    uMap: { value: frame.texture },
    uHaze: { value: haze.texture },
    uWide: { value: wide.texture },
    uHazeTexel: { value: new THREE.Vector2() },
    uWideTexel: { value: new THREE.Vector2() },
    uBloom: { value: BLOOM },
    uGlowInk: { value: GLOW_INK },
    uInkGain: { value: INK_GAIN },
  })
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shrinkMat)
  postQuad.frustumCulled = false

  function sizeBloom() {
    const { x: w, y: h } = renderer.getDrawingBufferSize(new THREE.Vector2())
    frame.setSize(w, h)
    steps.forEach((t, i) => t.setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1))))
    bloomMat.uniforms.uHazeTexel.value.set(1 / haze.width, 1 / haze.height)
    bloomMat.uniforms.uWideTexel.value.set(1 / wide.width, 1 / wide.height)
  }
  sizeBloom()

  function pass(mat, target) {
    postQuad.material = mat
    renderer.setRenderTarget(target)
    renderer.render(postQuad, postCam)
  }

  function renderBloomed() {
    renderer.setRenderTarget(frame)
    renderer.render(scene, camera)
    let from = frame
    for (const to of steps) {
      shrinkMat.uniforms.uMap.value = from.texture
      shrinkMat.uniforms.uTexel.value.set(0.5 / from.width, 0.5 / from.height)
      shrinkMat.uniforms.uEncode.value = from === frame
      pass(shrinkMat, to)
      from = to
    }
    pass(bloomMat, null)
  }

  // ---------------------------------------------------------------- loop
  const clock = new THREE.Clock()
  const SUN_STEP = 4 // the sun follows in steps this size, so its shadows hold still between them
  let sunX = NaN,
    sunZ = NaN,
    frames = 0,
    slow = 0,
    tick = performance.now(),
    shadowAt = tick
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05)
    move(dt)

    frames++
    const t = performance.now()
    if (t - tick >= 500) {
      const fps = (frames * 1000) / (t - tick)
      ui.setFps(Math.round(fps))
      // two seconds under 40 and the picture is drawn a little smaller. not
      // counted while an edition is being drawn, which costs frames by itself
      slow = fps < 40 && cycle.state !== "drawing" && !renderer.xr.isPresenting ? slow + 1 : 0
      if (slow >= 4 && ratio > 1) {
        ratio = Math.max(1, ratio - 0.25)
        renderer.setPixelRatio(ratio)
        sizeBloom()
        slow = 0
      }
      frames = 0
      tick = t
    }

    if (cycle.state === "idle" && now() >= cycle.nextAt) redraw()
    if (cycle.state === "fading") {
      cycle.fade = Math.min(1, cycle.fade + dt / DISSOLVE)
      const e = cycle.fade * cycle.fade * (3 - 2 * cycle.fade)
      for (const s of slots) s.uMix.value = e
      if (cycle.fade >= 1) commit()
    }

    sky.position.set(dolly.position.x, 0, dolly.position.z)
    const sx = Math.round(dolly.position.x / SUN_STEP) * SUN_STEP,
      sz = Math.round(dolly.position.z / SUN_STEP) * SUN_STEP
    if (sx !== sunX || sz !== sunZ || t - shadowAt > 2000) {
      sunX = sx
      sunZ = sz
      shadowAt = t
      sun.target.position.set(sx, 0, sz)
      sun.position.set(sx + 58, 96, sz + 38)
      renderer.shadowMap.needsUpdate = true
    }
    // a headset draws straight to its own eyes, so no bloom in there
    if (renderer.xr.isPresenting) renderer.render(scene, camera)
    else renderBloomed()
  })

  const status = setInterval(() => {
    const ed = String(cycle.edition + 1).padStart(2, "0")
    const text =
      cycle.state === "drawing"
        ? "redrawing"
        : cycle.state === "fading"
          ? "dissolving"
          : cycle.nextAt === Infinity
            ? "held"
            : `redraw in ${Math.max(0, Math.ceil(cycle.nextAt - now()))}s`
    ui.setSheet(`ed. ${ed} / ${text}`)
  }, 250)

  const ro = new ResizeObserver(() => {
    ;[vw, vh] = size()
    camera.aspect = vw / vh
    camera.updateProjectionMatrix()
    renderer.setSize(vw, vh)
    sizeBloom()
  })
  ro.observe(host)

  return {
    start,
    dispose() {
      alive = false
      clearTimeout(lockCheck)
      clearInterval(status)
      ro.disconnect()
      listeners.forEach((off) => off())
      renderer.setAnimationLoop(null)
      renderer.xr.getSession()?.end()
      if (document.pointerLockElement === view) document.exitPointerLock()
      for (const s of slots) {
        if (s.uNext.value !== s.mat.map) s.uNext.value?.dispose()
        s.mat.map?.dispose()
      }
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose())
      })
      dropMap.dispose()
      ;[frame, ...steps].forEach((t) => t.dispose())
      ;[shrinkMat, bloomMat, postQuad.geometry].forEach((o) => o.dispose())
      renderer.dispose()
      view.remove()
    },
  }
}

// ---------------------------------------------------------------- react shell
export default function FieldNotesStone() {
  const hostRef = useRef(null)
  const worldRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState({ text: "pointer lock: pending", look: "mouse" })
  const [sheet, setSheet] = useState("ed. 01 / held")
  const [fps, setFps] = useState(null)
  const [enterVr, setEnterVr] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // stop the page scrolling under the scene while it's mounted. the body is
    // clipped to the viewport rather than the root being set to hidden, which
    // would drop the root's scrollbar gutter and nudge the nav to the right
    const { overflow: prevOverflow, height: prevHeight } = document.body.style
    document.body.style.overflow = "hidden"
    document.body.style.height = "100dvh"

    try {
      worldRef.current = buildWorld(host, {
        setStarted,
        setSheet,
        setFps,
        setMode: (text, look) => setMode((m) => ({ text, look: look || m.look })),
        setVr: (fn) => setEnterVr(() => fn),
      })
    } catch (e) {
      console.error(e)
      setError("WebGL could not start here. Try another browser, then reload.")
    }

    return () => {
      worldRef.current?.dispose()
      worldRef.current = null
      document.body.style.overflow = prevOverflow
      document.body.style.height = prevHeight
    }
  }, [])

  // once inside, the reticle is the only cursor. hide the site's custom one
  // while the pointer is over the field, so the nav still gets a cursor
  const [hovering, setHovering] = useState(false)
  useEffect(() => {
    if (!started || !hovering) return
    document.body.classList.add("fns-walking")
    return () => document.body.classList.remove("fns-walking")
  }, [started, hovering])

  return (
    <div
      ref={hostRef}
      className="fns-root"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      <style>{`
        .fns-root { position:fixed; left:0; right:0; bottom:0; top:2.5rem; background:#fff; overflow:hidden;
                    font-family:${FONT}; color:#000; }
        .fns-root .fns-canvas { display:block; outline:none; touch-action:none; }
        body.fns-walking #custom-cursor, body.fns-walking #cursor-thought { display:none !important; }
        body.fns-walking .fns-root, body.fns-walking .fns-root * { cursor:none !important; }
        .fns-hud { position:absolute; left:14px; top:12px; z-index:5; font-size:11px; line-height:1.75;
                   letter-spacing:.02em; pointer-events:none; opacity:.7; }
        .fns-hud p { margin:0; color:#000; font-size:11px; line-height:1.75; }
        .fns-hud span { display:inline-block; min-width:78px; }
        .fns-mode { opacity:.45; }
        .fns-fps { position:absolute; right:14px; bottom:12px; z-index:5; font-size:11px; letter-spacing:.02em;
                   color:#000; opacity:.7; pointer-events:none; font-variant-numeric:tabular-nums; }
        .fns-reticle { position:absolute; left:50%; top:50%; z-index:5; width:11px; height:11px;
                       margin:-6px 0 0 -6px; opacity:.45; pointer-events:none; }
        .fns-reticle:before, .fns-reticle:after { content:""; position:absolute; background:#000; }
        .fns-reticle:before { left:5px; top:0; width:1px; height:11px; }
        .fns-reticle:after { top:5px; left:0; height:1px; width:11px; }
        .fns-gate { position:absolute; inset:0; z-index:10; background:#fff; display:flex; flex-direction:column;
                    align-items:center; justify-content:center; gap:20px; padding:0 16px; }
        .fns-gate h1 { font-family:${FONT}; font-weight:400; font-size:15px; letter-spacing:.14em; margin:0; }
        .fns-gate p { margin:0; font-size:11px; opacity:.6; max-width:36ch; text-align:center; line-height:1.9; color:#000; }
        .fns-box { border:1px solid #000; padding:9px 20px; font-size:11px; letter-spacing:.1em; background:#fff;
                   color:#000; font-family:${FONT}; }
        .fns-back { font-size:11px; letter-spacing:.08em; color:#000; text-decoration:underline; }
        .fns-vr { position:absolute; right:14px; top:12px; z-index:6; border:1px solid #000; background:#fff;
                  color:#000; font-size:11px; letter-spacing:.08em; padding:7px 13px; font-family:${FONT}; }
        .fns-err { position:absolute; inset:0; display:grid; place-items:center; padding:30px; z-index:20;
                   background:#fff; font-size:12px; text-align:center; line-height:1.8; }
      `}</style>

      <div className="fns-reticle" />

      <div className="fns-hud">
        <p>
          <b>field notes / stone</b>
        </p>
        <p>
          <span>move</span>W A S D
        </p>
        <p>
          <span>look</span>
          <i>{mode.look}</i>
        </p>
        <p>
          <span>run</span>shift
        </p>
        <p>
          <span>up / down</span>Q / E
        </p>
        <p>
          <span>sheet</span>
          {sheet}
        </p>
        <p className="fns-mode">{mode.text}</p>
      </div>

      {fps !== null && <div className="fns-fps">{fps} fps</div>}

      {enterVr && (
        <button className="fns-vr" onClick={enterVr}>
          enter vr
        </button>
      )}

      {!started && (
        <div className="fns-gate">
          <h1>field notes / stone</h1>
          <p>
            White, everywhere. The only marks are the drawing and its captions, wrapped onto the floor, the tilted
            plates, the sky, and the stones themselves. None of it holds still: every twenty to forty seconds the
            survey is drawn again.
          </p>
          <button className="fns-box" onClick={() => worldRef.current?.start()}>
            click to walk
          </button>
          <a className="fns-back" href="/blog">
            back to blog
          </a>
        </div>
      )}

      {error && <div className="fns-err">{error}</div>}
    </div>
  )
}
