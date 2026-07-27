import { QUADRANT_LABELS } from "../data/quadrantAxis.js"

const Z_LABELS = { pos: "past", neg: "future" }

/** @param {number} x @param {number} y */
export function quadrantFromXY(x, y) {
  if (x < 0 && y >= 0) return QUADRANT_LABELS[0]
  if (x >= 0 && y >= 0) return QUADRANT_LABELS[1]
  if (x < 0 && y < 0) return QUADRANT_LABELS[2]
  return QUADRANT_LABELS[3]
}

/** @param {number} z */
export function zAxisLabel(z) {
  if (z > 0) return Z_LABELS.pos
  if (z < 0) return Z_LABELS.neg
  return "mid"
}

/** @param {{ x: number, y: number, z?: number }} work */
export function workQuadrantMeta(work) {
  const x = work.x
  const y = work.y
  const z = work.z ?? 0
  const corner = quadrantFromXY(x, y)

  return {
    cornerLabel: corner.label.replace(/\n/g, " "),
    xAxis: x < 0 ? "investigative" : "speculative",
    yAxis: y < 0 ? "AI" : "human",
    zAxis: zAxisLabel(z),
    coords: {
      x: x.toFixed(2),
      y: y.toFixed(2),
      z: z.toFixed(2),
    },
  }
}
