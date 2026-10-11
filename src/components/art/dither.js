// 8×8 Bayer matrix: ordered dithering down to 1-bit ink on transparent.
const B8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30,
  54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
]

// Matches --ink in layout.astro; sims draw in white, lit pixels come out in ink.
const INK = 0x14

// Canvases are drawn at 1/PX resolution and shown pixelated.
export const PX = 2

// Sizes the canvas to its box and returns a context that draws in CSS pixels
// divided by `zoom`, so a sim keeps its proportions in a smaller box.
// shadowBlur ignores the transform: multiply it by `zoom` yourself.
export function lowRes(canvas, ctx, zoom = 1) {
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const cw = Math.max(1, Math.ceil(w / PX))
  const ch = Math.max(1, Math.ceil(h / PX))
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw
    canvas.height = ch
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, cw, ch)
  ctx.setTransform(zoom / PX, 0, 0, zoom / PX, 0, 0)
  return { w: w / zoom, h: h / zoom }
}

export function dither(canvas, ctx, gain = 1) {
  const { width, height } = canvas
  const img = ctx.getImageData(0, 0, width, height)
  const d = img.data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const lum = ((d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * d[i + 3] * gain) / 255
      const on = lum > (B8[(y & 7) * 8 + (x & 7)] + 0.5) * 4
      d[i] = d[i + 1] = d[i + 2] = INK
      d[i + 3] = on ? 255 : 0
    }
  }
  ctx.putImageData(img, 0, 0)
}

// Calls `draw` every frame while the canvas is on screen. Returns the cleanup.
export function animate(canvas, draw) {
  let raf = 0
  const tick = () => {
    draw()
    raf = requestAnimationFrame(tick)
  }
  const io = new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(raf)
    if (entry.isIntersecting) raf = requestAnimationFrame(tick)
  })
  io.observe(canvas)
  return () => {
    io.disconnect()
    cancelAnimationFrame(raf)
  }
}
