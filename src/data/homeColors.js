/** Site accent palette (matches layout.astro :root) */
export const ACCENTS = {
  pink: "#f90d63",
  coral: "#d25667",
  magenta: "#de6ecb",
  violet: "#8b8be9",
  periwinkle: "#99b0ee",
}

export const ACCENT_LIST = [
  ACCENTS.pink,
  ACCENTS.violet,
  ACCENTS.magenta,
  ACCENTS.coral,
  ACCENTS.periwinkle,
]

export const GENRE_COLORS = {
  installations: ACCENTS.pink,
  netart: ACCENTS.violet,
  performance: ACCENTS.magenta,
  audiovisual: ACCENTS.magenta,
  "tech-art": ACCENTS.coral,
  audio: ACCENTS.violet,
  visual: ACCENTS.periwinkle,
}

export const GENRE_GRADIENTS = {
  all: `linear-gradient(180deg, ${ACCENTS.pink} 0%, ${ACCENTS.violet} 52%, ${ACCENTS.magenta} 100%)`,
  installations: `linear-gradient(180deg, ${ACCENTS.pink}, ${ACCENTS.coral})`,
  netart: `linear-gradient(180deg, ${ACCENTS.violet}, ${ACCENTS.periwinkle})`,
  performance: `linear-gradient(180deg, ${ACCENTS.magenta}, ${ACCENTS.pink})`,
  audiovisual: `linear-gradient(180deg, ${ACCENTS.magenta}, ${ACCENTS.pink})`,
  "tech-art": `linear-gradient(180deg, ${ACCENTS.coral}, ${ACCENTS.pink})`,
  audio: `linear-gradient(180deg, ${ACCENTS.violet}, ${ACCENTS.periwinkle})`,
  visual: `linear-gradient(180deg, ${ACCENTS.periwinkle}, ${ACCENTS.violet})`,
}

export const AXIS_COLORS = {
  x: ACCENTS.pink,
  y: ACCENTS.violet,
  z: ACCENTS.magenta,
}

/** High-contrast text on white (WCAG AA+) */
export const TEXT = {
  primary: "#0a0a0a",
  secondary: "#2a2a2a",
  tertiary: "#404040",
}

/** Accent hues tuned for readable body/small text on white */
export const TEXT_ACCENTS = {
  pink: "#b8004a",
  coral: "#9e3344",
  magenta: "#9a3a8f",
  violet: "#4f4fbf",
  periwinkle: "#4a62a8",
}

export const TEXT_ACCENT_LIST = [
  TEXT_ACCENTS.pink,
  TEXT_ACCENTS.violet,
  TEXT_ACCENTS.magenta,
  TEXT_ACCENTS.coral,
  TEXT_ACCENTS.periwinkle,
]

export const GENRE_TEXT_COLORS = {
  installations: TEXT_ACCENTS.pink,
  netart: TEXT_ACCENTS.violet,
  performance: TEXT_ACCENTS.magenta,
  audiovisual: TEXT_ACCENTS.magenta,
  "tech-art": TEXT_ACCENTS.coral,
  audio: TEXT_ACCENTS.violet,
  visual: TEXT_ACCENTS.periwinkle,
}

export const AXIS_TEXT_COLORS = {
  x: TEXT_ACCENTS.pink,
  y: TEXT_ACCENTS.violet,
  z: TEXT_ACCENTS.magenta,
}

export const REQUEST_TYPE_TEXT_COLORS = {
  doc: TEXT_ACCENTS.pink,
  script: TEXT_ACCENTS.violet,
  css: TEXT_ACCENTS.periwinkle,
  img: TEXT_ACCENTS.magenta,
  fetch: TEXT_ACCENTS.coral,
  font: TEXT_ACCENTS.coral,
  other: TEXT.tertiary,
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

/** @param {string} hex @param {number} alpha */
export function rgba(hex, alpha) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
