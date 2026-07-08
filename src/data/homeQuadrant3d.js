/** @typedef {{ label: string, slug?: string, x: number, y: number, z: number, date?: string }} QuadrantWork */
/** @typedef {{ id: string, title: string, z: number, works: QuadrantWork[], layout?: "quadrant" | "chronology" }} GenreLayer */

import { XY_SCALE, QUADRANT_LABELS } from "./quadrantAxis.js"
import all from "./genres/all.js"
import index from "./genres/index.js"
import installations from "./genres/installations.js"
import netart from "./genres/netart.js"
import performance from "./genres/performance.js"

export { XY_SCALE, QUADRANT_LABELS }

/** World-space scale for the z axis (same as x/y for a cube space) */
export const Z_SCALE = XY_SCALE

/** Labels for the z axis ends: durational (-1) ↔ still (+1) */
export const Z_AXIS_LABELS = { pos: "still", neg: "durational" }

/** @type {GenreLayer[]} */
export const genreLayers = [all, installations, netart, performance]

export const indexLayer = index

/** @param {number} v @param {"x"|"y"} _axis */
export const toWorldXY = (v, _axis) => v * XY_SCALE
