/**
 * Interactable overlays — sit on top of a ground element; the player walks on both.
 *
 * Fields:
 *   id       — unique identifier
 *   x, y     — grid position (ground tile must be walkable)
 *   char     — ASCII glyph shown above the ground element
 *   color    — hex color for the glyph
 *   name     — shown in dialog header
 *   lines    — array of dialog strings (shown one at a time)
 */

/** @typedef {{ id: string; x: number; y: number; char: string; color: string; name: string; lines: string[]; trigger?: string }} Interactable */

/** @type {Interactable[]} */
export const INTERACTABLES = [
  {
    id: "welcome-sign",
    x: 20,
    y: 8,
    char: "!",
    color: "#CA8A04",
    name: "Weathered Sign",
    lines: [
      "Welcome, wanderer.",
      "Arrow keys or click to move.",
      "Press E near objects to talk.",
    ],
  },
  {
    id: "old-tree-spirit",
    x: 9,
    y: 4,
    char: "&",
    color: "#15803D",
    name: "Tree Spirit",
    lines: [
      "...can you hear the roots breathing?",
      "This forest remembers every footstep.",
      "Tread lightly.",
    ],
  },
  {
    id: "pond-whisper",
    x: 3,
    y: 3,
    char: "o",
    color: "#0369A1",
    name: "Pond",
    lines: [
      "The water ripples without wind.",
      "Something watches from below.",
    ],
  },
  {
    id: "tall-grass-rustle",
    x: 31,
    y: 4,
    char: "?",
    color: "#4D7C0F",
    name: "Rustling Grass",
    lines: [
      "*rustle rustle*",
      "You sense movement in the tall grass...",
      "Nothing emerges. For now.",
    ],
  },
  {
    id: "campfire-ashes",
    x: 20,
    y: 16,
    char: "*",
    color: "#C2410C",
    name: "Cold Campfire",
    lines: [
      "Ashes still warm to the touch.",
      "Whoever was here left in a hurry.",
    ],
  },
]
