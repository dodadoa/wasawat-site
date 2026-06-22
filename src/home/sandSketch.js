const EMPTY = 0
const WALL = 1
const SAND = 2

const CELL = 3
const NAME = "Wasawat Somno"
const FONT = '"JetBrains Mono", monospace'
const NAV_HEIGHT = 64
const SETTLE_FRAMES = 5

const HTML_TAGS = [
  "<div>",
  "<span>",
  "<p>",
  "<a>",
  "</div>",
  "<br/>",
  "<h1>",
  "{ }",
  "()",
  "[]",
  "=>",
  "/>",
  "npm",
  "git",
  "const",
  "fn()",
]

/**
 * @param {HTMLElement | string} target
 */
export function startSandSketch(target) {
  const container =
    typeof target === "string" ? document.getElementById(target) : target
  if (!container) return null
  if (container.dataset.sandInit) return null   // guard against bfcache double-init
  container.dataset.sandInit = "1"

  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-label", NAME)

  const overlay = document.createElement("div")
  overlay.className = "home-sand-html-layer"
  overlay.setAttribute("aria-hidden", "true")

  container.replaceChildren(canvas, overlay)

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const maskCanvas = document.createElement("canvas")
  const maskCtx = maskCanvas.getContext("2d")
  if (!maskCtx) return null

  const blitCanvas = document.createElement("canvas")
  const blitCtx = blitCanvas.getContext("2d")
  if (!blitCtx) return null

  let gridW = 0
  let gridH = 0
  /** @type {Uint8Array} */
  let grid = new Uint8Array(0)
  let spawnRate = 0
  /** @type {ImageData | null} */
  let frame = null
  let running = true
  let frameId = 0
  /** @type {HtmlGrain[]} */
  let htmlGrains = []

  const idx = (x, y) => y * gridW + x

  class HtmlGrain {
    /** @param {number} gx @param {number} gy @param {string} tag */
    constructor(gx, gy, tag) {
      this.gx = gx
      this.gy = gy
      this.tag = tag
      this.stillFrames = 0
      this.dissolving = false
      this.removed = false
      this.el = document.createElement("span")
      this.el.className = "home-sand-html-grain"
      this.el.textContent = tag
      this.el.style.fontSize = `${9 + Math.floor(Math.random() * 5)}px`
      overlay.appendChild(this.el)

      const rect = this.el.getBoundingClientRect()
      this.gw = Math.max(3, Math.min(16, Math.ceil(rect.width / CELL)))
      this.gh = Math.max(2, Math.min(6, Math.ceil(rect.height / CELL)))

      this.syncElement()
    }

    /** @param {number} atGx @param {number} atGy */
    cellsAt(atGx, atGy) {
      /** @type {[number, number][]} */
      const cells = []
      for (let dy = 0; dy < this.gh; dy++) {
        for (let dx = 0; dx < this.gw; dx++) {
          cells.push([atGx + dx, atGy + dy])
        }
      }
      return cells
    }

    syncElement() {
      this.el.style.transform = `translate(${this.gx * CELL}px, ${this.gy * CELL}px)`
    }

    /** @param {number} atGx @param {number} atGy */
    canOccupy(atGx, atGy) {
      for (const [x, y] of this.cellsAt(atGx, atGy)) {
        if (x < 0 || x >= gridW || y < 0 || y >= gridH) return false
        if (grid[idx(x, y)] !== EMPTY) return false
      }

      for (const other of htmlGrains) {
        if (other === this || other.removed || other.dissolving) continue
        for (const [x, y] of this.cellsAt(atGx, atGy)) {
          for (const [ox, oy] of other.cellsAt(other.gx, other.gy)) {
            if (x === ox && y === oy) return false
          }
        }
      }

      return true
    }

    /** @returns {boolean} still active */
    update() {
      if (this.dissolving) return true

      let moved = false

      if (this.canOccupy(this.gx, this.gy + 1)) {
        this.gy += 1
        moved = true
      } else {
        const leftFirst = Math.random() < 0.5
        const dirs = leftFirst
          ? [
              [-1, 1],
              [1, 1],
            ]
          : [
              [1, 1],
              [-1, 1],
            ]

        for (const [dx, dy] of dirs) {
          if (this.canOccupy(this.gx + dx, this.gy + dy)) {
            this.gx += dx
            this.gy += dy
            moved = true
            break
          }
        }
      }

      if (moved) {
        this.stillFrames = 0
        this.syncElement()
        return true
      }

      this.stillFrames++
      if (this.stillFrames >= SETTLE_FRAMES) {
        this.dissolve()
        return false
      }

      return true
    }

    dissolve() {
      this.dissolving = true
      this.el.classList.add("home-sand-html-grain--sand")

      for (const [x, y] of this.cellsAt(this.gx, this.gy)) {
        const cell = idx(x, y)
        if (grid[cell] === EMPTY) grid[cell] = SAND
      }

      window.setTimeout(() => {
        this.el.remove()
        this.dissolving = false
        this.removed = true
      }, 200)
    }
  }

  const buildConcreteMask = () => {
    grid.fill(EMPTY)
    maskCanvas.width = gridW
    maskCanvas.height = gridH

    maskCtx.fillStyle = "#ffffff"
    maskCtx.fillRect(0, 0, gridW, gridH)
    maskCtx.fillStyle = "#000000"
    maskCtx.textAlign = "center"
    maskCtx.textBaseline = "middle"

    let fontSize = 8
    maskCtx.font = `700 ${fontSize}px ${FONT}`
    while (maskCtx.measureText(NAME).width < gridW * 0.94 && fontSize < gridH * 2) {
      fontSize += 1
      maskCtx.font = `700 ${fontSize}px ${FONT}`
    }
    while (maskCtx.measureText(NAME).width > gridW * 0.94 && fontSize > 4) {
      fontSize -= 1
      maskCtx.font = `700 ${fontSize}px ${FONT}`
    }

    maskCtx.fillText(NAME, gridW / 2, gridH * 0.5)

    const { data } = maskCtx.getImageData(0, 0, gridW, gridH)
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const pi = (x + y * gridW) * 4
        const r = data[pi]
        const g = data[pi + 1]
        const b = data[pi + 2]
        if (r < 160 && g < 160 && b < 160) grid[idx(x, y)] = WALL
      }
    }
  }

  const clearHtmlGrains = () => {
    htmlGrains.forEach((g) => g.el.remove())
    htmlGrains = []
  }

  const resize = () => {
    const w = window.innerWidth
    const h = Math.max(200, window.innerHeight - NAV_HEIGHT)

    canvas.width = w
    canvas.height = h

    gridW = Math.max(1, Math.floor(w / CELL))
    gridH = Math.max(1, Math.floor(h / CELL))
    grid = new Uint8Array(gridW * gridH)
    frame = new ImageData(gridW, gridH)
    blitCanvas.width = gridW
    blitCanvas.height = gridH
    spawnRate = Math.max(6, Math.floor(gridW * 0.08))
    clearHtmlGrains()
    buildConcreteMask()
  }

  const spawnHtmlGrains = () => {
    const attempts = spawnRate * 4
    for (let i = 0; i < attempts; i++) {
      if (htmlGrains.filter((g) => !g.removed && !g.dissolving).length >= spawnRate * 6) break

      const tag = HTML_TAGS[Math.floor(Math.random() * HTML_TAGS.length)]
      const grain = new HtmlGrain(0, 0, tag)

      if (grain.gw > gridW) {
        grain.el.remove()
        continue
      }

      grain.gx = Math.floor(Math.random() * (gridW - grain.gw + 1))
      grain.gy = 0

      if (!grain.canOccupy(grain.gx, grain.gy)) {
        grain.el.remove()
        continue
      }

      grain.syncElement()
      htmlGrains.push(grain)
    }
  }

  const swap = (ax, ay, bx, by) => {
    const a = idx(ax, ay)
    const b = idx(bx, by)
    const tmp = grid[a]
    grid[a] = grid[b]
    grid[b] = tmp
  }

  const updateSand = () => {
    for (let y = gridH - 2; y >= 0; y--) {
      for (let x = 0; x < gridW; x++) {
        if (grid[idx(x, y)] !== SAND) continue

        const below = grid[idx(x, y + 1)]
        if (below === EMPTY) {
          swap(x, y, x, y + 1)
          continue
        }

        if (below === WALL || below === SAND) {
          const leftFirst = Math.random() < 0.5
          const dirs = leftFirst
            ? [
                [-1, 1],
                [1, 1],
              ]
            : [
                [1, 1],
                [-1, 1],
              ]

          for (const [dx, dy] of dirs) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= gridW || ny >= gridH) continue
            if (grid[idx(nx, ny)] === EMPTY) {
              swap(x, y, nx, ny)
              break
            }
          }
        }
      }
    }
  }

  const updateHtmlGrains = () => {
    htmlGrains = htmlGrains.filter((grain) => {
      if (grain.removed) return false
      if (grain.dissolving) return true
      return grain.update()
    })
  }

  const drawGrid = () => {
    if (!frame) return
    const px = frame.data

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const pi = (x + y * gridW) * 4
        switch (grid[idx(x, y)]) {
          case WALL:
            px[pi] = 140
            px[pi + 1] = 140
            px[pi + 2] = 140
            px[pi + 3] = 255
            break
          case SAND:
            px[pi] = 0
            px[pi + 1] = 0
            px[pi + 2] = 0
            px[pi + 3] = 255
            break
          default:
            px[pi] = 255
            px[pi + 1] = 255
            px[pi + 2] = 255
            px[pi + 3] = 255
            break
        }
      }
    }

    blitCtx.putImageData(frame, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(blitCanvas, 0, 0, canvas.width, canvas.height)
  }

  const tick = () => {
    if (!running) return
    spawnHtmlGrains()
    updateHtmlGrains()
    for (let step = 0; step < 3; step++) updateSand()
    drawGrid()
    frameId = requestAnimationFrame(tick)
  }

  const boot = () => {
    resize()
    drawGrid()
    cancelAnimationFrame(frameId)
    frameId = requestAnimationFrame(tick)
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(boot).catch(boot)
  } else {
    boot()
  }

  const onResize = () => {
    resize()
    drawGrid()
  }
  window.addEventListener("resize", onResize)

  return {
    destroy() {
      running = false
      cancelAnimationFrame(frameId)
      window.removeEventListener("resize", onResize)
      clearHtmlGrains()
      delete container.dataset.sandInit
      container.replaceChildren()
    },
  }
}
