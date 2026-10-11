/**
 * 1-bit palette — ink on paper. There is no hue anywhere: the old accent
 * names are kept as keys so existing callers resolve, but every value is one
 * of the four palette steps. Distinction between genres/axes is carried by
 * dither density and line weight (see DITHER), never by colour.
 */
export const PAPER = "#e4e4e4"
export const INK = "#141414"
export const SOFT = "#666666"
export const LINE = "#b4b4b4"
/** spot colour — fine 1px overlay lines only (axes, guides, x-ray outlines) */
export const RED = "#e1251b"

/** CSS background shorthands for the three dither steps */
export const DITHER = {
  50: "repeating-conic-gradient(var(--ink) 0 25%, var(--bg) 0 50%) 0 0 / 4px 4px",
  25: "conic-gradient(var(--ink) 25%, transparent 0) 0 0 / 4px 4px",
  12: "conic-gradient(at 2px 2px, transparent 75%, var(--ink) 0) 0 0 / 6px 6px",
}

/** hard 2px paper halo for text sitting on a dither */
export const HALO = `2px 0 0 ${PAPER}, -2px 0 0 ${PAPER}, 0 2px 0 ${PAPER}, 0 -2px 0 ${PAPER}`

export const ACCENTS = {
  pink: INK,
  coral: SOFT,
  magenta: INK,
  violet: INK,
  periwinkle: SOFT,
}

export const ACCENT_LIST = [INK]

export const GENRE_COLORS = {
  installations: INK,
  netart: INK,
  performance: INK,
  print: INK,
  audiovisual: INK,
  "tech-art": INK,
  audio: INK,
  visual: INK,
}

export const GENRE_GRADIENTS = { all: INK }

export const AXIS_COLORS = { x: INK, y: INK, z: INK }

export const TEXT = {
  primary: INK,
  secondary: INK,
  tertiary: SOFT,
}

export const TEXT_ACCENTS = {
  pink: INK,
  coral: SOFT,
  magenta: INK,
  violet: INK,
  periwinkle: SOFT,
}

export const TEXT_ACCENT_LIST = [INK]

export const GENRE_TEXT_COLORS = GENRE_COLORS

export const AXIS_TEXT_COLORS = { x: INK, y: INK, z: INK }

export const REQUEST_TYPE_TEXT_COLORS = {
  doc: INK,
  script: INK,
  css: INK,
  img: INK,
  fetch: INK,
  font: INK,
  other: SOFT,
}

/** @param {string} genreId */
export function genreColor(genreId) {
  return GENRE_COLORS[genreId] ?? ACCENTS.pink
}

/** @param {string} genreId */
export function genreGradient(genreId) {
  return GENRE_GRADIENTS[genreId] ?? GENRE_GRADIENTS.all
}

/** @param {string} genreId */
export function genreTextColor(genreId) {
  return GENRE_TEXT_COLORS[genreId] ?? TEXT_ACCENTS.pink
}

/** @param {string} tag @param {number} [i] */
export function tagTextAccent(tag, i = 0) {
  let n = i
  for (let c = 0; c < tag.length; c++) n += tag.charCodeAt(c)
  return TEXT_ACCENT_LIST[n % TEXT_ACCENT_LIST.length]
}

/** @param {string} tag @param {number} [i] */
export function tagAccent(tag, i = 0) {
  let n = i
  for (let c = 0; c < tag.length; c++) n += tag.charCodeAt(c)
  return ACCENT_LIST[n % ACCENT_LIST.length]
}

/**
 * Translucent tints don't exist on paper: anything that used to be a faint
 * wash of an accent is now a hairline, anything stronger is ink.
 * @param {string} hex @param {number} alpha
 */
export function rgba(hex, alpha) {
  return alpha < 0.5 ? LINE : hex
}
