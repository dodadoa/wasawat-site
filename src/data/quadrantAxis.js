/** Scale factor mapping normalized [-1, 1] coords to world units */
export const XY_SCALE = 5.5

/**
 * Corner phrase labels for the quadrant diagram.
 * x: investigative (-1) ↔ speculative (+1)
 * y: looking to the past (-1) ↔ looking to the future (+1)
 * @type {{ x: number, y: number, label: string }[]}
 */
export const QUADRANT_LABELS = [
  { x: -0.88, y: 0.88,  label: "Here, with you" },
  { x:  0.88, y: 0.88,  label: "The system is running" },
  { x: -0.88, y: -0.88, label: "I keep thinking\nabout you" },
  { x:  0.88, y: -0.88, label: "Would you still love me\nif I was digital" },
]
