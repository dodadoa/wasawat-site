import { genreLayers } from "./homeQuadrant3d.js"

/**
 * The selected works shown on the home page, in their fixed numbering order
 * (installations, netart, performance, print).
 * @returns {(import('./homeQuadrant3d.js').QuadrantWork & { genreId: string, genre: string, no: string })[]}
 */
export function collectSelectedWorks() {
  return genreLayers
    .filter((l) => l.id !== "all")
    .flatMap((layer) => layer.works.map((w) => ({ ...w, genreId: layer.id, genre: layer.title })))
    .map((w, i) => ({ ...w, no: String(i + 1) }))
}
