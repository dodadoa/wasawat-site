// How a sprite's rows become ink for the home museum.

import { INK, PAPER } from "../data/homeColors.js"

/** which empty art pixels of a sprite are shut in by its ink, and so are part of it */
function enclosed(rows) {
  const w = rows[0].length
  const h = rows.length
  const open = new Uint8Array(w * h)
  const queue = []
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h || open[y * w + x] || rows[y][x] === "#") return
    open[y * w + x] = 1
    queue.push(x, y)
  }
  for (let x = 0; x < w; x++) {
    visit(x, 0)
    visit(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    visit(0, y)
    visit(w - 1, y)
  }
  for (let q = 0; q < queue.length; q += 2) {
    const x = queue[q]
    const y = queue[q + 1]
    visit(x + 1, y)
    visit(x - 1, y)
    visit(x, y + 1)
    visit(x, y - 1)
  }
  return (x, y) => rows[y][x] !== "#" && !open[y * w + x]
}

/**
 * Draw a sprite's art rows, one unit to the art pixel: `ink` where it is lit,
 * and paper in the hollows the ink shuts in, so the ground does not show
 * through a picture frame or a face.
 */
export function inkRows(g, rows, ink = INK) {
  const hollow = enclosed(rows)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const lit = row[x] === "#"
      if (!lit && !hollow(x, y)) continue
      g.fillStyle = lit ? ink : PAPER
      g.fillRect(x, y, 1, 1)
    }
  })
}
