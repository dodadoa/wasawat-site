/** @typedef {'land' | 'water' | 'grass' | 'tall_grass'} GroundType */
/** @typedef {'ground' | 'overlay'} ElementLayer */

/**
 * Every map cell has a ground element. Overlays (tree, interactable) sit on top.
 * The player walks on ground elements; blocking overlays prevent entry.
 */
export const GROUND_ELEMENTS = {
  land: {
    layer: "ground",
    char: ".",
    color: "#78716C",
    fill: 0xffffff,
    walkable: true,
    label: "Land",
  },
  water: {
    layer: "ground",
    char: "~",
    color: "#1D4ED8",
    fill: 0xffffff,
    walkable: false,
    label: "Water",
  },
  grass: {
    layer: "ground",
    char: ",",
    color: "#15803D",
    fill: 0xffffff,
    walkable: true,
    label: "Grass",
  },
  tall_grass: {
    layer: "ground",
    char: "#",
    color: "#166534",
    fill: 0xffffff,
    walkable: true,
    label: "Tall Grass",
  },
}

export const OVERLAY_ELEMENTS = {
  tree: {
    layer: "overlay",
    char: "T",
    color: "#166534",
    blocks: true,
    label: "Tree",
  },
}

/** @type {Record<string, GroundType>} */
export const GROUND_KEYS = {
  ".": "land",
  L: "land",
  "~": "water",
  W: "water",
  ",": "grass",
  G: "grass",
  "#": "tall_grass",
  H: "tall_grass",
}

export const TILE_SIZE = 24
export const FONT_FAMILY = "JetBrains Mono, monospace"
export const FONT_SIZE = 18

export const TEXT_RESOLUTION = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2)

export const THEME = {
  background: "#FFFFFF",
  player: "#171717",
  hud: "#525252",
  hudHint: "#737373",
  dialogBg: 0xffffff,
  dialogBorder: 0xe5e5e5,
  dialogName: "#171717",
  dialogText: "#171717",
  dialogHint: "#737373",
}

/** @param {GroundType} type */
export function getGround(type) {
  return GROUND_ELEMENTS[type]
}

/** @param {keyof typeof OVERLAY_ELEMENTS} type */
export function getOverlay(type) {
  return OVERLAY_ELEMENTS[type]
}
