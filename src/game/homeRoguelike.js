import { INK, PAPER } from "../data/homeColors.js"
import { collectSelectedWorks } from "../data/selectedWorks.js"
import { workQuadrantMeta } from "../utils/quadrantWorkMeta.js"
import { SPRITES as SPRITE_ROWS } from "./rogueSprites.js"
import { WORLD } from "./rogueWorld.js"
import { inkRows } from "./rogueInk.js"

// ─── map ──────────────────────────────────────────────────────────────────────
// A museum of tech and media art standing in a garden. You start outside, on
// the path, in the rain, among grass, shrubs and trees, and walk in through the
// front door to get to the work. Inside it is one open-plan pavilion: an outer
// wall and a handful of short partitions, so the galleries run into each
// other and into the lobby instead of being boxed off. Performance is the
// exception: it isn't hung with the artwork but has a wing of its own off the
// east side, a corridor with four small rooms, each set up as its piece was played.

const W = 78
const H = 40
const GRASS = 0
const WALL = 1
const FLOOR = 2
const PATH = 3

/** the building's outer wall, inclusive */
const BUILDING = { x0: 12, y0: 4, x1: 71, y1: 25 }
/** short partition walls inside it, as [x0, y0, x1, y1] */
const PARTITIONS = [
  [25, 5, 25, 10], [38, 5, 38, 10], // either side of the print room
  [25, 19, 25, 24], [38, 19, 38, 24], // either side of the lobby
  [13, 14, 20, 14], [43, 14, 50, 14], // between the upper and lower galleries
  [51, 5, 51, 24], // between the pavilion and the performance wing
  [52, 12, 70, 12], [52, 16, 70, 16], // either side of the wing's corridor
  [61, 5, 61, 11], [61, 17, 61, 24], // between the performance rooms
]
/** ways through those: into the wing, and into each of its rooms */
const OPENINGS = [
  [51, 13], [51, 15],
  [56, 12], [57, 12], [65, 12], [66, 12], [56, 16], [57, 16], [65, 16], [66, 16],
]
/** the front door, a gap in the south wall */
const DOOR = [[31, 25], [32, 25]]
/** the path from where you start up to the door */
const PATH_RECT = [31, 26, 32, 38]
/** kept clear of wild planting: the forecourt, with its terrace and sculpture */
const FORECOURT = { x0: 20, y0: 26, x1: 44, y1: 34 }

/**
 * named areas of the floor, inclusive; `genre` marks where a genre hangs,
 * `sign` is where the area's sign stands, by the way in
 */
const ZONES = [
  { x0: 26, y0: 12, x1: 37, y1: 24, label: "LOBBY", sign: [33, 23] },
  { x0: 13, y0: 5, x1: 24, y1: 13, label: "INSTALLATIONS", genre: "installations", sign: [24, 13] },
  { x0: 26, y0: 5, x1: 37, y1: 11, label: "PRINT ROOM", genre: "print", sign: [30, 11] },
  { x0: 39, y0: 5, x1: 50, y1: 13, label: "GREEN ROOM", sign: [39, 13] },
  { x0: 13, y0: 15, x1: 24, y1: 24, label: "NETART LAB", genre: "netart", sign: [24, 15] },
  { x0: 39, y0: 15, x1: 50, y1: 24, label: "ARCHIVE", sign: [39, 15] },
  { x0: 52, y0: 13, x1: 70, y1: 15, label: "PERFORMANCE", genre: "performance", sign: [52, 14] },
  // the performance rooms: the sign by each door gives the piece its full title
  { x0: 52, y0: 5, x1: 60, y1: 11, label: "GIMME THE LIGHT", sign: [55, 13], text: "GIMME THE LIGHT, AND YOU SHALL RECEIVE THE PRAISE. PHONES OUT" },
  { x0: 62, y0: 5, x1: 70, y1: 11, label: "SIMULATED WIND", sign: [64, 13], text: "DO THE NPCS HEAR THE SIMULATED WIND. FOUR PCS, ONE TOWER" },
  { x0: 52, y0: 17, x1: 60, y1: 24, label: "FROM SCRATCH", sign: [55, 15], text: "FROM SCRATCH LIVE CODING FROM SCRATCH" },
  { x0: 62, y0: 17, x1: 70, y1: 24, label: "STILL BE HERE", sign: [64, 15], text: "AS IF YOU WOULD STILL BE HERE, IF I KEEP THINKING ABOUT YOU" },
]

/** nothing is written on the ground: you walk up to a sign and read it. [x, y, text] */
const SIGNS = [
  ...ZONES.map((z) => [...z.sign, z.text ?? z.label]),
  [33, 35, "MUSEUM. THE DOOR IS AHEAD"],
]

const SPAWN = { x: 31, y: 37 }
const STAIRS = { x: 45, y: 22, href: "/work" }

/** where each work hangs, by genre, in numbering order */
const WORK_SPOTS = {
  installations: [[16, 9], [21, 9], [18, 11], [14, 11], [23, 11]],
  netart: [[16, 20], [21, 20], [18, 23], [14, 22], [23, 22]],
  print: [[32, 8], [29, 9], [35, 9]],
}
/**
 * A performance isn't hung: it has a room, and the piece is the set standing
 * in it. By slug: `cells` are what you walk up to, each drawn as `sprite`
 * (a two-frame idle, out of step from one cell to the next); the rest of the
 * room is dressed in PROPS.
 */
const SETS = {
  // the performer, lit by nothing but the audience's phones
  "gimme-the-light": { cells: [[56, 6]], sprite: ["performer-a", "performer-b"] },
  // the tower with its four PCs, one to a shelf
  "do-the-npcs-hear-the-simulated-wind": { cells: [[66, 8]], sprite: ["pcstack-a", "pcstack-b"] },
  // a laptop that starts on a blank editor
  "from-scratch-live-coding": { cells: [[56, 21]], sprite: ["livecode-a", "livecode-b"] },
  // the screen where the typed words get eaten
  "as-if-you-would-still-be-here": { cells: [[66, 21]], sprite: ["words-a", "words-b"] },
}
/** anything that doesn't fit its gallery is shown in the lobby */
const OVERFLOW_SPOTS = [[28, 17], [35, 18], [28, 21], [35, 21]]

/**
 * Things you walk round. A two-name entry has a two-frame idle:
 * [sprite | [frameA, frameB], x, y]
 */
const PROPS = [
  // outside: braziers by the door, sculpture on the lawn, a café terrace
  [["flame-a", "flame-b"], 30, 26], [["flame-a", "flame-b"], 33, 26],
  ["monument", 27, 29], ["monument", 36, 29], ["stele", 22, 28], ["stele", 42, 28],
  ["cairn", 23, 32], ["cairn", 42, 33], ["cairn", 8, 22], ["cairn", 74, 20],
  ["table", 38, 30], ["table", 40, 30], ["table", 39, 32], ["bench", 26, 32], ["bench", 27, 32],
  // lobby: the front desk, a bench, the shop's shelves, plants, and the museum cat
  ["desk", 34, 16], ["desk", 35, 16], ["desk", 36, 16],
  ["bench", 28, 19], ["bench", 29, 19], ["shelf", 37, 21], ["shelf", 37, 22], ["shelf", 37, 23],
  ["plant", 26, 24], ["plant", 30, 24], ["plant", 33, 24], [["cat-a", "cat-b"], 27, 22],
  // installations: columns, sculpture, a bench to sit with it
  ["column", 13, 5], ["column", 24, 5], ["statue", 14, 8], ["statue-2", 23, 7], ["cube", 19, 7],
  ["bench", 18, 13], ["bench", 19, 13],
  // print room: flat files
  ["flatfile", 27, 11], ["flatfile", 28, 11], ["flatfile", 35, 11], ["flatfile", 36, 11],
  // green room: flight cases, a rack, spare PA, somewhere to wait
  ["crate", 39, 5], ["crate", 40, 5], ["crate", 39, 6], ["rack", 49, 5], ["rack", 50, 5], ["speaker", 50, 7],
  ["table", 44, 9], ["table", 45, 9], ["bench", 44, 13], ["bench", 45, 13], ["plant", 50, 11],
  // the wing's corridor
  ["plant", 70, 13], ["plant", 70, 15], ["bench", 60, 15], ["bench", 61, 15],
  // gimme the light: no projector, no lights. A PA, and an audience holding
  // up their phones as strobes, with an aisle left down the middle
  ["speaker", 52, 5], ["speaker", 60, 5], ["speaker", 54, 6], ["speaker", 58, 6],
  ["fan", 53, 8], ["fan", 54, 8], ["fan", 58, 8], ["fan", 59, 8],
  ["fan", 52, 9], ["fan", 55, 9], ["fan", 57, 9], ["fan", 60, 9],
  ["fan", 54, 10], ["fan", 59, 10],
  // do the npcs: the laptop on the floor by the tower, a speaker in each
  // corner, benches to listen from
  ["laptop", 65, 9],
  ["speaker", 62, 5], ["speaker", 70, 5], ["speaker", 62, 11], ["speaker", 70, 11],
  ["bench", 68, 10], ["bench", 69, 10],
  // from scratch: the mic, the brick and the chair that get scratched, benches facing
  ["mic", 55, 21], ["brick", 57, 22], ["chair", 58, 21], ["speaker", 52, 24], ["speaker", 60, 24],
  ["bench", 53, 19], ["bench", 54, 19], ["bench", 58, 19], ["bench", 59, 19],
  // as if you would still be here: told late, from the bar
  ["drinks", 70, 18], ["bar", 70, 19], ["drinks", 70, 20], ["bar", 70, 21], ["chair", 69, 19], ["chair", 69, 21],
  ["chair", 65, 22], ["speaker", 62, 24], ["speaker", 70, 24],
  // netart lab: screens, racks, a drone that never lands
  ["monitor", 15, 15], ["monitor", 17, 15], ["monitor", 19, 15], ["rack", 13, 24], ["rack", 14, 24],
  [["drone-a", "drone-b"], 20, 18],
  // archive: shelving, a reading table, crates not yet unpacked
  ["bookshelf", 44, 15], ["bookshelf", 45, 15], ["bookshelf", 46, 15], ["bookshelf", 48, 15],
  ["bookshelf", 49, 15], ["table", 47, 19], ["table", 48, 19],
  ["crate", 49, 24], ["crate", 50, 24],
]

/** track spotlights along the north wall: [x, y] */
const LAMPS = [[16, 4], [21, 4], [29, 4], [34, 4], [42, 4], [47, 4], [64, 4], [68, 4]]

// ─── who else is about ────────────────────────────────────────────────────────

/** people have a place to start; animals turn up wherever on the grass */
const PEOPLE = [
  { kind: "gallerist", x: 35, y: 15 },
  { kind: "curator", x: 18, y: 10 },
  { kind: "visitor", x: 32, y: 33 },
  { kind: "visitor", x: 39, y: 31 },
  { kind: "visitor", x: 30, y: 20 },
  { kind: "visitor", x: 44, y: 10 },
  { kind: "visitor", x: 18, y: 21 },
  { kind: "visitor", x: 44, y: 19 },
  { kind: "visitor", x: 59, y: 14 },
  { kind: "visitor", x: 66, y: 10 },
  { kind: "hare" }, { kind: "hare" }, { kind: "boar" }, { kind: "frog" }, { kind: "robocat" },
]
const ANIMALS = new Set(["hare", "boar", "frog", "robocat"])

/** places people drift to when they aren't looking at a work */
const HAUNTS = {
  visitor: [
    [28, 20], [30, 19], [20, 12], [45, 12], [19, 22], [44, 19], [30, 22],
    [39, 31], [40, 31], [37, 30], [27, 33], [32, 30], [32, 35],
    [58, 14], [56, 10], [63, 9], [55, 20], [64, 20], [68, 19],
  ],
  // the gallerist works the room between the desk, the shop and the door
  gallerist: [[35, 15], [33, 18], [36, 23], [31, 23], [32, 27], [30, 20]],
  curator: [[44, 19], [32, 10]],
}

/** how long someone stands still once they arrive, in ticks: [min, max] */
const LINGER = {
  visitor: [8, 24], curator: [6, 14], gallerist: [10, 30],
  hare: [3, 12], boar: [8, 22], frog: [12, 34], robocat: [5, 16],
}

/** what you get for walking into them */
const BUMP = {
  visitor: [
    "A visitor reads the wall text twice.",
    "A visitor photographs the label, not the work.",
    "A visitor asks you where the toilets are.",
    "A visitor says their nephew could code that.",
    "A visitor is waiting for it to do something.",
  ],
  curator: [
    "The curator moves a label two centimetres to the left.",
    "The curator says the works are in dialogue.",
    "The curator asks you not to lean on the plinth.",
    "The curator is rewriting the wall text again.",
  ],
  gallerist: [
    "The gallerist asks whether you are collecting.",
    "The gallerist says it is the last of the edition.",
    "The gallerist hands you a card. It is blank on both sides.",
    "The gallerist mentions an institution is very interested.",
  ],
  hare: ["The hare regards you, then doesn't."],
  boar: ["The boar is not on the guest list."],
  frog: ["The frog has already seen the show."],
  robocat: ["The cat robot purrs at 50 hertz."],
}

const T = 16 // tile size in art pixels; sprites are 16 wide and as tall as they need to be
// room the overlays take at the top and bottom of the stage, in CSS pixels:
// on a phone the status panel and the help strip sit over the map; on desktop
// they are in the left column and only the view switcher is in the way
/** how far the paper blooms over the ink, 0 to 1 */
const BLOOM = 0.32
/** how far the ink glows out onto the paper round it, 0 to 1 */
const GLOW_INK = 0.32
const HUD_TOP = 120
const HUD_BOTTOM = 190
const SWITCHER_BOTTOM = 56
const FRAME_MS = 450
const PEOPLE_MS = 300
const STEP_MS = 70
/** a held cross: slower than a walk you asked for, so one step is easy to take */
const DPAD_MS = 150
/** how near you have to come to a work, with nothing in the way, for it to count as seen */
const SIGHT = 7
/** how long a phone's torch stays on at each beat of its strobe */
const FLASH_MS = 90
/** how long a plant goes on swaying after something brushes past it */
const STIR_MS = 560
/** how long a raindrop's splash lasts, and what shakes loose from a plant */
const SPLASH_MS = 270
const BIT_MS = 420
/** rain falls on a slant: sideways drift per pixel of fall */
const SLANT = 0.3
/** how many steps your shoes stay wet once you are in out of the rain */
const WET_STEPS = 14
const STORE_KEY = "home-rogue-v3"

const at = (x, y) => y * W + x
const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H
const within = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1
const pick = (list) => list[Math.floor(Math.random() * list.length)]
/** stable per-cell noise, for which slab, tuft or tree a cell gets */
const hash = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0

const TREES = ["w-tree-round", "w-tree-pine", "w-tree-round", "w-tree-pine", "w-tree-palm"]
const SHRUBS = ["w-bramble", "w-shrub-0", "w-fern", "w-shrub-1"]
// what grows underfoot, commonest first
const TUFTS = [
  "w-grass-s", "w-grass-t", "w-grass-s", "w-leaf-0", "w-grass-t", "w-flower",
  "w-leaf-1", "w-grass-s", "w-sprout", "w-bloom", "w-grass-t", "w-mushroom",
]
/** the pictures a work can be shown as; which one goes by its number */
const PICTURES = ["work", "work-1", "work-2", "work-3"]
const SLABS = 5
const BRICKS = 3

function buildMap() {
  const tiles = new Uint8Array(W * H) // all grass to begin with
  const fill = (x0, y0, x1, y1, t) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[at(x, y)] = t
  }
  const b = BUILDING
  fill(b.x0, b.y0, b.x1, b.y1, WALL)
  fill(b.x0 + 1, b.y0 + 1, b.x1 - 1, b.y1 - 1, FLOOR)
  PARTITIONS.forEach((p) => fill(...p, WALL))
  DOOR.concat(OPENINGS).forEach(([x, y]) => (tiles[at(x, y)] = FLOOR))
  fill(...PATH_RECT, PATH)

  /** floor cell → index into ZONES */
  const zoneOf = new Map()
  ZONES.forEach((z, zi) => {
    for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) zoneOf.set(at(x, y), zi)
  })

  /** @type {Map<number, string | string[]>} cell → sprite name, or its two frames */
  const props = new Map(PROPS.filter(([, x, y]) => tiles[at(x, y)] !== WALL).map(([name, x, y]) => [at(x, y), name]))
  /** @type {Map<number, string>} cell → what the sign standing there says */
  const signs = new Map(SIGNS.map(([x, y, text]) => [at(x, y), text]))
  signs.forEach((_, i) => props.set(i, "sign"))
  const lamps = new Set(LAMPS.filter(([x, y]) => tiles[at(x, y)] === WALL).map(([x, y]) => at(x, y)))

  // the garden plants itself: a hedge of trees round the edge of the map,
  // trees and shrubs scattered over the lawn, and tufts of grass underfoot.
  // The forecourt, the path and a margin round the building are left open.
  /** @type {Map<number, string>} cell → tuft sprite (walked over) */
  const tufts = new Map()
  const reserved = new Set([
    ...Object.values(HAUNTS).flat().map(([x, y]) => at(x, y)),
    ...PEOPLE.filter((p) => p.x !== undefined).map((p) => at(p.x, p.y)),
    at(SPAWN.x, SPAWN.y),
  ])
  const margin = { x0: b.x0 - 1, y0: b.y0 - 1, x1: b.x1 + 1, y1: b.y1 + 1 }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y)
      if (tiles[i] !== GRASS || props.has(i)) continue
      const n = hash(x, y)
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        props.set(i, TREES[n % TREES.length])
        continue
      }
      const open = within(FORECOURT, x, y) || within(margin, x, y) || Math.abs(x - 31.5) < 3 || reserved.has(i)
      if (!open && n % 19 === 0) props.set(i, TREES[(n >>> 5) % TREES.length])
      else if (!open && n % 13 === 0) props.set(i, SHRUBS[(n >>> 5) % SHRUBS.length])
      else if (n % 11 < 5) tufts.set(i, TUFTS[(n >>> 5) % TUFTS.length])
    }
  }

  return { tiles, signs, zoneOf, props, lamps, tufts }
}

// ─── thumbnail ────────────────────────────────────────────────────────────────

/** Show the work's own picture, untouched, once it has loaded. */
function showThumb(img, src) {
  img.hidden = true
  img.onload = () => {
    if (img.dataset.src === src) img.hidden = false
  }
  img.dataset.src = src
  img.src = src
}

// ─── game ─────────────────────────────────────────────────────────────────────

/** @param {HTMLElement} root */
export function startHomeRoguelike(root) {
  const stage = root.querySelector("[data-rogue-stage]")
  const canvas = root.querySelector("canvas[data-rogue-map]")
  const logEl = root.querySelector("[data-rogue-log]")
  const seenEl = root.querySelector("[data-stat-seen]")
  const turnsEl = root.querySelector("[data-stat-turns]")
  const roomEl = root.querySelector("[data-stat-room]")
  const panel = root.querySelector("[data-rogue-panel]")
  const panelNo = panel.querySelector("[data-panel-no]")
  const panelTitle = panel.querySelector("[data-panel-title]")
  const panelMeta = panel.querySelector("[data-panel-meta]")
  const panelLink = panel.querySelector("[data-panel-link]")
  const panelThumb = panel.querySelector("[data-panel-thumb]")
  const indexItems = [...root.querySelectorAll("[data-work-index]")]
  const ctx = canvas.getContext("2d")

  const { tiles, signs, zoneOf, props, lamps, tufts } = buildMap()

  const counters = {}
  let overflow = 0
  const works = collectSelectedWorks().map((w) => {
    const n = counters[w.genreId] ?? 0
    counters[w.genreId] = n + 1
    const set = SETS[w.slug]
    /** the cells the work takes up: one for a picture, more for a set */
    const cells = set?.cells ?? [WORK_SPOTS[w.genreId]?.[n] ?? OVERFLOW_SPOTS[overflow++ % OVERFLOW_SPOTS.length]]
    return { ...w, cells, set, href: `/art/${w.slug}`, meta: workQuadrantMeta(w) }
  })
  /** @type {Map<number, number>} cell → work index */
  const workAt = new Map(works.flatMap((w, i) => w.cells.map(([x, y]) => [at(x, y), i])))
  /** @type {Map<number, string[]>} cell of a set → its two frames */
  const setArt = new Map(
    works.flatMap((w) => (w.set ? w.cells.map(([x, y], k) => [at(x, y), k & 1 ? [...w.set.sprite].reverse() : w.set.sprite]) : [])),
  )

  const found = new Set()
  const player = { ...SPAWN }
  /** where you are drawn: it glides after `player`, and the camera follows it */
  const hv = { ...SPAWN }
  let turns = 0
  /** @type {{ href: string, i?: number } | null} */
  let active = null
  /** @type {{ x: number, y: number }[]} */
  let path = []
  let walkTimer = 0
  let walkWaits = 0
  // flips every FRAME_MS: lamps, and everyone's idle pose
  let frame = 0

  // layout, recomputed on resize
  let cell = 24
  let viewW = 0
  let viewH = 0
  let camX = 0
  let camY = 0
  let dpr = 1
  /** CSS pixels to one art pixel */
  let u = 2
  /** the frame being drawn, as a timestamp */
  let now = 0
  /** tile and sprite art, painted once per layout: key → { c, w, h }, sizes in CSS pixels */
  const art = new Map()
  // the museum holds still under reduced motion: no rain, no gliding, one frame
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  // matches the breakpoint in index.astro where the left column goes away
  const narrow = window.matchMedia("(max-width: 768px)")

  const walkable = (x, y) =>
    inMap(x, y) && tiles[at(x, y)] !== WALL && !workAt.has(at(x, y)) && !props.has(at(x, y))
  const outdoors = (x, y) => tiles[at(x, y)] === GRASS || tiles[at(x, y)] === PATH

  // everywhere on the grass you could actually walk to from the path
  const lawn = (() => {
    const out = []
    const seenCell = new Uint8Array(W * H)
    const queue = [[SPAWN.x, SPAWN.y]]
    seenCell[at(SPAWN.x, SPAWN.y)] = 1
    for (let q = 0; q < queue.length; q++) {
      const [cx, cy] = queue[q]
      out.push([cx, cy])
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx
        const ny = cy + dy
        if (!walkable(nx, ny) || !outdoors(nx, ny) || seenCell[at(nx, ny)]) continue
        seenCell[at(nx, ny)] = 1
        queue.push([nx, ny])
      }
    }
    return out
  })()

  /**
   * `vx`, `vy` are where someone is drawn, gliding after where they are
   * @type {{ kind: string, x: number, y: number, vx: number, vy: number, path: { x: number, y: number }[], linger: number, stuck: number }[]}
   */
  const people = PEOPLE.map((p) => {
    const [x, y] = ANIMALS.has(p.kind) ? pick(lawn) : [p.x, p.y]
    return { kind: p.kind, x, y, vx: x, vy: y, path: [], linger: 2 + Math.floor(Math.random() * 10), stuck: 0 }
  }).filter((p) => walkable(p.x, p.y))
  const personAt = (x, y) => people.find((p) => p.x === x && p.y === y)

  // ── persistence: coming back from a work page resumes the walk ──
  function save() {
    try {
      sessionStorage.setItem(
        STORE_KEY,
        JSON.stringify({ x: player.x, y: player.y, turns, found: [...found] }),
      )
    } catch {}
  }

  function restore() {
    try {
      const s = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "null")
      if (!s || !walkable(s.x, s.y)) return
      player.x = hv.x = s.x
      player.y = hv.y = s.y
      turns = s.turns
      s.found.forEach((i) => found.add(i))
    } catch {}
  }

  // ── seeing the work ──
  // The whole museum is in plain view; what is counted is the work you have
  // actually been up to.
  function lineOfSight(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    let x = x0
    let y = y0
    while (true) {
      const e2 = err * 2
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
      if (x === x1 && y === y1) return true
      if (tiles[at(x, y)] === WALL) return false
    }
  }

  function notice() {
    works.forEach((w, i) => {
      if (found.has(i)) return
      const seen = w.cells.some(([x, y]) => {
        const dx = x - player.x
        const dy = y - player.y
        return dx * dx + dy * dy <= SIGHT * SIGHT && lineOfSight(player.x, player.y, x, y)
      })
      if (seen) found.add(i)
    })
  }

  // ── pathfinding ──
  /** Shortest walk from (sx, sy) to a cell passing `isGoal`, over `passable` cells. */
  function route(sx, sy, isGoal, passable) {
    const start = at(sx, sy)
    const prev = new Int32Array(W * H).fill(-1)
    const queue = [start]
    prev[start] = start
    for (let q = 0; q < queue.length; q++) {
      const cur = queue[q]
      const cx = cur % W
      const cy = (cur - cx) / W
      if (isGoal(cx, cy)) {
        const out = []
        for (let c = cur; c !== start; c = prev[c]) out.unshift({ x: c % W, y: Math.floor(c / W) })
        return out
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx
        const ny = cy + dy
        const n = at(nx, ny)
        if (!passable(nx, ny) || prev[n] !== -1) continue
        prev[n] = cur
        queue.push(n)
      }
    }
    return null
  }

  const findPath = (isGoal) => route(player.x, player.y, isGoal, walkable)

  /** beside any cell of a work, or beside the one cell (x, y) */
  const nextTo = (w) => (x, y) => (w.cells ?? [[w.x, w.y]]).some(([wx, wy]) => Math.abs(x - wx) + Math.abs(y - wy) === 1)

  /** Walk to a cell passing `isGoal`; `then` runs on getting there. */
  function walkTo(isGoal, then) {
    stopWalk()
    const found = findPath(isGoal)
    if (!found) return
    path = found
    if (!path.length) return then?.()
    walkTimer = window.setInterval(() => {
      const next = path[0]
      if (!next) return stopWalk()
      // someone is standing in the way: go round them if there is a way
      // round, otherwise wait for them to move on — but not forever
      if (personAt(next.x, next.y)) {
        const detour = route(player.x, player.y, isGoal, (x, y) => walkable(x, y) && !personAt(x, y))
        if (detour?.length) path = detour
        else if (++walkWaits > 60) stopWalk()
        return
      }
      walkWaits = 0
      path.shift()
      moveTo(next.x, next.y)
      if (!path.length) {
        stopWalk()
        then?.()
      }
    }, STEP_MS)
  }

  function stopWalk() {
    window.clearInterval(walkTimer)
    walkTimer = 0
    walkWaits = 0
    path = []
  }

  // ── the people ──
  function newErrand(p) {
    if (ANIMALS.has(p.kind)) {
      const [x, y] = pick(lawn)
      return (cx, cy) => cx === x && cy === y
    }
    const lookAtWork = p.kind === "curator" ? Math.random() < 0.85 : p.kind === "visitor" && Math.random() < 0.65
    if (lookAtWork && works.length) return nextTo(pick(works))
    const [x, y] = pick(HAUNTS[p.kind])
    return (cx, cy) => cx === x && cy === y
  }

  function peopleTick() {
    for (const p of people) {
      if (p.linger > 0) {
        p.linger--
        continue
      }
      if (!p.path.length) {
        // animals keep to the garden; people go where they like
        const passable = ANIMALS.has(p.kind) ? (x, y) => walkable(x, y) && outdoors(x, y) : walkable
        const found = route(p.x, p.y, newErrand(p), passable)
        if (!found?.length) {
          p.linger = 3
          continue
        }
        p.path = found
      }
      const next = p.path[0]
      const blocked = (next.x === player.x && next.y === player.y) || personAt(next.x, next.y)
      if (blocked) {
        // step aside in time: after a few tries, think of somewhere else to be
        if (++p.stuck > 3) {
          p.path = []
          p.stuck = 0
        }
        continue
      }
      p.stuck = 0
      p.x = next.x
      p.y = next.y
      stir(p.x, p.y)
      p.path.shift()
      if (!p.path.length) {
        const [min, max] = LINGER[p.kind]
        p.linger = min + Math.floor(Math.random() * (max - min))
      }
    }
    render()
  }

  // ── turns ──
  function moveTo(x, y, preferred) {
    player.x = x
    player.y = y
    turns++
    stir(x, y)
    // shoes stay wet for a while indoors, and leave prints
    if (outdoors(x, y)) wet = WET_STEPS
    else if (wet > 0 && !still) prints.push({ x, y, t0: performance.now(), side: wet-- & 1 })
    afterTurn(preferred)
  }

  function afterTurn(preferred) {
    notice()
    updateActive(preferred)
    updateHud()
    save()
    render()
  }

  /** The thing the player is standing next to (or on), if any. */
  function updateActive(preferred) {
    const before = active?.href
    active = null
    if (player.x === STAIRS.x && player.y === STAIRS.y) {
      active = { href: STAIRS.href }
    } else {
      let best = Infinity
      works.forEach((w, i) => {
        for (const [x, y] of w.cells) {
          const dx = Math.abs(x - player.x)
          const dy = Math.abs(y - player.y)
          if (dx > 1 || dy > 1) continue
          const d = i === preferred ? -1 : dx + dy
          if (d < best) {
            best = d
            active = { href: w.href, i }
          }
        }
      })
    }
    if (active?.href === before) return
    updatePanel()
    if (active?.i !== undefined) log(`You stand before ${works[active.i].no} — ${title(works[active.i]).replace(/\.$/, "")}.`)
    else log(active ? "Stairs lead down to the full index." : "")
  }

  const title = (w) => w.planeLabel ?? w.label

  function updatePanel() {
    panel.hidden = !active
    if (!active) return
    panelLink.href = active.href
    if (active.i === undefined) {
      panelNo.textContent = ">"
      panelTitle.textContent = "Full index"
      panelMeta.textContent = "every work, by year"
      panelThumb.hidden = true
      panelThumb.dataset.src = ""
      panelThumb.removeAttribute("src")
      return
    }
    const w = works[active.i]
    panelNo.textContent = w.no
    panelTitle.textContent = title(w)
    panelMeta.textContent = [w.genre, w.date?.slice(0, 4), w.meta.cornerLabel].filter(Boolean).join(" · ")
    // the full picture where there is one: the pre-made thumbs are only 176px wide
    showThumb(panelThumb, w.image ?? `/images/thumbs/${w.slug}.jpg`)
  }

  function log(text) {
    logEl.textContent = text
  }

  const readSign = (i) => log(`The sign reads: ${signs.get(i)}.`)

  /** the sign the player is standing next to, if any */
  const signInReach = () =>
    [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .map(([dx, dy]) => [player.x + dx, player.y + dy])
      .filter(([x, y]) => inMap(x, y) && signs.has(at(x, y)))
      .map(([x, y]) => at(x, y))[0]

  const pad = (n, len) => String(n).padStart(len, "0")

  function updateHud() {
    if (seenEl) seenEl.textContent = `${pad(found.size, 2)}/${pad(works.length, 2)}`
    if (turnsEl) turnsEl.textContent = pad(turns, 4)
    const here = at(player.x, player.y)
    if (roomEl) roomEl.textContent = ZONES[zoneOf.get(here)]?.label ?? (tiles[here] === PATH ? "PATH" : tiles[here] === FLOOR ? "DOORWAY" : "GARDEN")
    indexItems.forEach((el) => {
      const i = Number(el.dataset.workIndex)
      el.toggleAttribute("data-found", found.has(i))
      el.toggleAttribute("data-active", active?.i === i)
    })
  }

  function open() {
    if (active) window.location.href = active.href
  }

  // ── drawing ──
  // Light theme, like the rest of the site: a paper ground with everything
  // drawn in ink, and nothing else — no tone, no second colour, no texture —
  // until the very end, when the paper is let bloom a little over the ink's
  // edges. All of it sits on one grid of art pixels, 16 to the cell, blown
  // up by a whole number of device pixels: sprites, rain, the sway of a
  // plant; even the camera moves a whole art pixel at a time.

  /** onto the art pixel grid */
  const snap = (v) => Math.round(v / u) * u

  /**
   * A picture `w`×`h` art pixels. `paint(g)` draws it once, one unit to the
   * art pixel, and it is kept until the next layout.
   */
  function pic(key, w, h, paint) {
    let p = art.get(key)
    if (!p) {
      const c = document.createElement("canvas")
      c.width = w
      c.height = h
      paint(c.getContext("2d"))
      p = { c, w: w * u, h: h * u }
      art.set(key, p)
    }
    return p
  }

  /** a sprite at its own size */
  function sprite(name) {
    const rows = SPRITE_ROWS[name] ?? WORLD[name]
    return pic(`s:${name}`, rows[0].length, rows.length, (g) => inkRows(g, rows))
  }

  /**
   * A wall block: a cracked ink slab seen from above. `face` = there is floor
   * below it, so only the slab's near edge shows and the rest of the cell is
   * the wall's front, in brick.
   */
  function wallPic(variant, face) {
    return pic(`w${variant}${face ? 1 : 0}`, T, T, (g) => {
      const slab = WORLD[`w-slab-${variant % SLABS}`]
      inkRows(g, face ? [...slab.slice(1, 6), ...WORLD[`w-brick-${variant % BRICKS}`].slice(5)] : slab)
    })
  }

  /** your light: a hard-edged disc of clear paper, a little wider than your cell */
  const GLOW = 22
  const glowPic = () =>
    pic("glow", GLOW, GLOW, (g) => {
      const c = (GLOW - 1) / 2
      g.fillStyle = PAPER
      for (let y = 0; y < GLOW; y++) {
        for (let x = 0; x < GLOW; x++) if ((x - c) ** 2 + (y - c) ** 2 <= (GLOW / 2) ** 2) g.fillRect(x, y, 1, 1)
      }
    })

  // and its rays, in two beats: [x, y, w, h] in art pixels from your cell's corner
  const RAYS = [
    [[7, -6, 2, 2], [7, 20, 2, 2], [-6, 7, 2, 2], [20, 7, 2, 2], [-3, -3, 1, 1], [18, -3, 1, 1], [-3, 18, 1, 1], [18, 18, 1, 1]],
    [[7, -7, 2, 2], [7, 21, 2, 2], [-7, 7, 2, 2], [21, 7, 2, 2], [-3, -3, 1, 1], [-4, -4, 1, 1], [18, -3, 1, 1], [19, -4, 1, 1], [-3, 18, 1, 1], [-4, 19, 1, 1], [18, 18, 1, 1], [19, 19, 1, 1]],
  ]

  const frameOf = (d) => (Array.isArray(d) ? d[frame] : d)

  /**
   * Whether the phone held up at cell `i` is flashing. No two keep time: each
   * runs at its own tempo, somewhere from 120 to 180 BPM, as in the piece.
   */
  function strobing(i) {
    const n = hash(i % W, Math.floor(i / W))
    if (still) return n % 3 === 0
    const beat = 60000 / (120 + (n % 61))
    return (now + (n >>> 8)) % beat < FLASH_MS
  }
  /** which leg is forward, from how far someone has walked */
  const stride = (v) => Math.floor(v * 2) & 1

  function layout() {
    // whole device pixels only, so an art pixel is the same size everywhere
    dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)))
    viewW = stage.clientWidth
    viewH = stage.clientHeight
    // a whole number of device pixels to the art pixel, for a cell of about
    // 24 CSS pixels (20 on a narrow stage). The museum is bigger than the
    // view, and the camera follows you through it
    const scale = Math.max(2, Math.floor(((viewW >= 720 ? 24 : 20) * dpr) / T))
    u = scale / dpr
    cell = T * u
    canvas.width = Math.round(viewW * dpr)
    canvas.height = Math.round(viewH * dpr)
    canvas.style.width = `${viewW}px`
    canvas.style.height = `${viewH}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    if (!viewW || !viewH) return
    drops = still ? [] : Array.from({ length: Math.round((viewW * viewH) / 9000) }, () => newDrop({}, performance.now() - 300))
    draw(performance.now())
  }

  function camera() {
    const mapW = W * cell
    const mapH = H * cell
    const follow = (size, map, p) =>
      map <= size ? (size - map) / 2 : Math.min(0, Math.max(size - map, size / 2 - (p + 0.5) * cell))
    camX = snap(follow(viewW, mapW, hv.x))
    camY = snap(follow(viewH, mapH, hv.y))
    // when the map scrolls, let it scroll far enough that the top and bottom
    // rooms clear whatever sits over the stage
    if (mapH > viewH) {
      const top = narrow.matches ? HUD_TOP : 0
      const bottom = narrow.matches ? HUD_BOTTOM : SWITCHER_BOTTOM
      camY = snap(Math.min(top, Math.max(viewH - mapH - bottom, viewH / 2 - (hv.y + 0.5) * cell)))
    }
  }

  /** a tile filling its cell */
  const put = (p, x, y) => ctx.drawImage(p.c, x * cell, y * cell, p.w, p.h)

  /** a sprite hung from the top edge of its cell */
  const hang = (p, x, y) => ctx.drawImage(p.c, snap(x * cell + (cell - p.w) / 2), y * cell, p.w, p.h)

  /**
   * A sprite standing in a cell: centred, feet on the cell's bottom edge, so
   * anything taller than a cell rises out of it over whatever is behind.
   * `stirred` is when something last brushed past it: for a moment after, it
   * sways from the root, most at the tip, a whole art pixel at a time.
   */
  function stand(p, x, y, stirred) {
    const X = snap(x * cell + (cell - p.w) / 2)
    const Y = snap(y * cell + cell - p.h)
    const age = stirred === undefined ? STIR_MS : Math.max(0, now - stirred)
    if (age >= STIR_MS) return void ctx.drawImage(p.c, X, Y, p.w, p.h)
    const swing = Math.sin(age / 55) * (1 - age / STIR_MS) * 2.2
    const rows = p.c.height
    for (let r = 0; r < rows; r++) {
      const dx = Math.round(swing * (1 - r / rows) ** 1.6) * u
      ctx.drawImage(p.c, 0, r, p.c.width, 1, X + dx, Y + r * u, p.w, u)
    }
  }

  /** out of the map counts as wall, so the building's edge closes cleanly */
  const isWall = (x, y) => !inMap(x, y) || tiles[at(x, y)] === WALL

  // ── weather, and what moves when you pass ──
  // It is raining on the garden and on the roof, not in the galleries. Each
  // drop has somewhere to land: a short stroke comes down the last stretch of
  // its fall and ends in a splash. Like everything else, in whole art pixels.

  /** @type {{ x: number, y: number, t0: number, fall: number, len: number }[]} where each lands, in cells; `len` in art pixels */
  let drops = []
  /** @type {{ x: number, y: number, t0: number }[]} splashes underfoot, in cells */
  let splashes = []
  /** @type {{ x: number, y: number, dx: number, dy: number, t0: number }[]} drops and grass shaken loose; cells, cells per ms */
  let bits = []
  /** @type {{ x: number, y: number, t0: number, side: number }[]} wet footprints on the gallery floor */
  let prints = []
  /** @type {Map<number, number>} cell → when the plant there was last brushed */
  const stirs = new Map()
  let wet = 0

  /** one art pixel of ink at (X, Y) */
  const dot = (X, Y) => ctx.fillRect(snap(X), snap(Y), u, u)

  /** under the roof: rain neither falls nor shows here */
  function dry(X, Y) {
    const x = Math.floor(X / cell)
    const y = Math.floor(Y / cell)
    return !inMap(x, y) || tiles[at(x, y)] === FLOOR
  }

  /** send a drop round again, to land somewhere in or just off the view */
  function newDrop(d, t) {
    d.x = (Math.random() * (viewW + 160) - 80 - camX) / cell
    d.y = (Math.random() * (viewH + 120) - 20 - camY) / cell
    d.t0 = t + Math.random() * 300
    d.fall = 150 + Math.random() * 110
    d.len = 3 + Math.floor(Math.random() * 4)
    return d
  }

  // a splash in three beats, in art pixels: it lands, jumps, spreads
  const SPLASH = [[[0, 0]], [[-1, -1], [1, -1]], [[-2, 0], [2, 0]]]

  /** a splash at (X, Y), `p` of the way through, 0–1 */
  function splash(X, Y, p) {
    for (const [dx, dy] of SPLASH[Math.min(2, Math.floor(p * 3))]) dot(X + dx * u, Y + dy * u)
  }

  /** shake `count` bits loose from the cell at (x, y) */
  function shake(x, y, count) {
    for (let k = 0; k < count && bits.length < 60; k++) {
      bits.push({
        x: x + 0.2 + Math.random() * 0.6,
        y: y + 0.15 + Math.random() * 0.5,
        dx: (Math.random() - 0.5) * 0.0016,
        dy: -0.0015 - Math.random() * 0.0015,
        t0: performance.now(),
      })
    }
  }

  /**
   * Something has stepped into (x, y): the grass there parts, the plants
   * either side are brushed and shed their rain, the wet ground splashes.
   */
  function stir(x, y) {
    if (still) return
    const t = performance.now()
    if (tufts.has(at(x, y))) {
      stirs.set(at(x, y), t)
      shake(x, y, 1)
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!inMap(x + dx, y + dy)) continue
      const i = at(x + dx, y + dy)
      const name = props.get(i)
      if (typeof name !== "string" || !(name.startsWith("w-") || name === "plant")) continue
      stirs.set(i, t)
      if (outdoors(x + dx, y + dy)) shake(x + dx, y + dy - 0.3, 3)
    }
    if (outdoors(x, y)) splashes.push({ x: x + 0.5, y: y + 0.95, t0: t })
  }

  /** wet prints on the floor, drying out: two pixels, then one, then gone */
  function drawPrints() {
    prints = prints.filter((f) => now - f.t0 < 9000)
    for (const f of prints) {
      const X = f.x * cell + (f.side ? 9 : 6) * u
      const Y = f.y * cell + (f.side ? 11 : 12) * u
      dot(X, Y)
      if (now - f.t0 < 5000) dot(X, Y + u)
    }
  }

  function drawWeather() {
    ctx.fillStyle = INK
    const height = cell * 2.4 // how much of the fall you see
    for (const d of drops) {
      const age = now - d.t0
      if (age < 0) continue
      if (age > d.fall + SPLASH_MS) {
        newDrop(d, now)
        continue
      }
      const X = d.x * cell
      const Y = d.y * cell
      if (age >= d.fall) {
        if (!dry(X, Y)) splash(X, Y, (age - d.fall) / SPLASH_MS)
        continue
      }
      const left = (1 - age / d.fall) * height
      for (let k = 0; k < d.len; k++) {
        const sx = X + (left + k * u) * SLANT
        const sy = Y - left - k * u
        if (!dry(sx, sy)) dot(sx, sy)
      }
    }
    splashes = splashes.filter((s) => now - s.t0 < SPLASH_MS)
    for (const s of splashes) splash(s.x * cell, s.y * cell, Math.max(0, now - s.t0) / SPLASH_MS)
    bits = bits.filter((b) => now - b.t0 < BIT_MS)
    for (const b of bits) {
      const age = Math.max(0, now - b.t0)
      dot((b.x + b.dx * age) * cell, (b.y + b.dy * age + 7e-6 * age * age) * cell)
    }
  }

  /** Draw the frame at time `t`. */
  function draw(t) {
    now = t
    if (still) {
      hv.x = player.x
      hv.y = player.y
      for (const p of people) {
        p.vx = p.x
        p.vy = p.y
      }
    }
    camera()
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, viewW, viewH)
    ctx.save()
    ctx.translate(camX, camY)

    // only the cells on screen, plus a margin for tall things just off it
    const x0 = Math.max(0, Math.floor(-camX / cell) - 1)
    const y0 = Math.max(0, Math.floor(-camY / cell))
    const x1 = Math.min(W - 1, Math.ceil((viewW - camX) / cell) + 1)
    const y1 = Math.min(H - 1, Math.ceil((viewH - camY) / cell) + 2)

    // Ground first; everything that stands up goes in a list and is drawn
    // after it, from the back row forward, so a tree overlaps what is behind it.
    /** @type {{ y: number, draw: () => void }[]} */
    const standing = []

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = at(x, y)
        const n = hash(x, y)
        if (tiles[i] === WALL) {
          put(wallPic(n % (SLABS * BRICKS), !isWall(x, y + 1)), x, y)
          // a spotlight hangs off the wall into the room below
          if (lamps.has(i)) {
            const lamp = sprite(frame ? "lamp-b" : "lamp-a")
            standing.push({ y: y + 0.5, draw: () => hang(lamp, x, y + 1) })
          }
        } else if (setArt.has(i)) {
          // a performance is its set, standing in the room
          const p = sprite(frameOf(setArt.get(i)))
          standing.push({ y, draw: () => stand(p, x, y) })
        } else if (workAt.has(i)) {
          // a work is a picture, not a number: which one it is, it tells you up close
          put(sprite(PICTURES[workAt.get(i) % PICTURES.length]), x, y)
        } else if (x === STAIRS.x && y === STAIRS.y) {
          stand(sprite("stairs"), x, y)
        } else if (props.has(i)) {
          const name = props.get(i)
          const p = sprite(name === "fan" ? (strobing(i) ? "fan-lit" : "fan") : frameOf(name))
          standing.push({ y, draw: () => stand(p, x, y, stirs.get(i)) })
        } else if (tufts.has(i)) {
          stand(sprite(tufts.get(i)), x, y, stirs.get(i))
        } else if (tiles[i] === PATH) {
          put(sprite(`w-cobble-${(x + y) & 1}`), x, y)
        } else if (tiles[i] === FLOOR && n % 13 < 2) {
          // the floor is bare but for the odd inlaid mark
          put(sprite(`w-dot-${n % 13}`), x, y)
        }
      }
    }

    // everyone else: a step forward with each half cell they cover
    for (const p of people) {
      const img = sprite(`${p.kind}-${stride(p.vx + p.vy) ? "b" : "a"}`)
      standing.push({ y: p.vy + 0.1, draw: () => stand(img, p.vx, p.vy) })
    }

    // you: drawn in ink like everyone else, but carrying your own light — a
    // disc of clear paper with rays at its edge — and a hard shadow at your feet
    standing.push({
      y: hv.y + 0.2,
      draw: () => {
        const walking = Math.abs(player.x - hv.x) + Math.abs(player.y - hv.y) > 0.02
        const X = snap(hv.x * cell)
        const Y = snap(hv.y * cell)
        const glow = glowPic()
        ctx.drawImage(glow.c, X + (cell - glow.w) / 2, Y + (cell - glow.h) / 2, glow.w, glow.h)
        ctx.fillStyle = INK
        for (const [rx, ry, rw, rh] of RAYS[frame]) ctx.fillRect(X + rx * u, Y + ry * u, rw * u, rh * u)
        ctx.fillRect(X + 3 * u, Y + 15 * u, 10 * u, u)
        ctx.fillRect(X + 4 * u, Y + 16 * u, 8 * u, u)
        stand(sprite((walking ? stride(hv.x + hv.y) : frame) ? "hero-b" : "hero-a"), hv.x, hv.y)
      },
    })

    ctx.fillStyle = INK
    drawPrints()
    standing.sort((a, b) => a.y - b.y).forEach((s) => s.draw())

    // whatever is in reach is held between four corner marks, which pulse
    if (active?.i !== undefined) {
      // a set of several cells is held as one
      const xs = works[active.i].cells.map(([x]) => x)
      const ys = works[active.i].cells.map(([, y]) => y)
      const gap = (2 + frame) * u
      const arm = 4 * u
      ctx.fillStyle = INK
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = sx < 0 ? Math.min(...xs) * cell - gap : (Math.max(...xs) + 1) * cell + gap - u
        const cy = sy < 0 ? Math.min(...ys) * cell - gap : (Math.max(...ys) + 1) * cell + gap - u
        ctx.fillRect(sx < 0 ? cx : cx - arm + u, cy, arm, u)
        ctx.fillRect(cx, sy < 0 ? cy : cy - arm + u, u, arm)
      }
    }
    drawWeather()
    ctx.restore()
    bloom()
  }

  /**
   * Bloom, both ways. The frame is shrunk to a haze, and to a wider one. The
   * wide haze goes back wherever it is the darker, so the ink throws a soft
   * glow onto the paper round it, like a drop shadow with no offset; then the
   * tight one wherever it is the lighter, so paper glows into the ink's edge.
   */
  const haze = document.createElement("canvas")
  const wide = document.createElement("canvas")
  function bloom() {
    const k = Math.round(u * dpr) * 2 // two art pixels to the haze pixel
    haze.width = Math.ceil(canvas.width / k)
    haze.height = Math.ceil(canvas.height / k)
    wide.width = Math.ceil(haze.width / 2)
    wide.height = Math.ceil(haze.height / 2)
    const h = haze.getContext("2d")
    h.imageSmoothingQuality = "high"
    h.drawImage(canvas, 0, 0, haze.width, haze.height)
    const w = wide.getContext("2d")
    w.imageSmoothingQuality = "high"
    w.drawImage(haze, 0, 0, wide.width, wide.height)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.globalCompositeOperation = "darken"
    ctx.globalAlpha = GLOW_INK
    ctx.drawImage(wide, 0, 0, wide.width * k * 2, wide.height * k * 2)
    ctx.globalCompositeOperation = "lighten"
    ctx.globalAlpha = BLOOM
    ctx.drawImage(haze, 0, 0, haze.width * k, haze.height * k)
    ctx.restore()
  }

  /**
   * Redraw after something changed. With the frame loop running that takes
   * care of itself; under reduced motion this is the only time anything is drawn.
   */
  function render() {
    if (still) draw(performance.now())
  }

  // The frame loop: rain, gliding, swaying. About thirty frames a second is
  // plenty for art this stepped, and none at all while another view is up.
  let last = 0
  function tick(t) {
    window.requestAnimationFrame(tick)
    if (document.hidden || !stage.clientWidth || t - last < 30) return
    const dt = Math.min(t - last, 100)
    last = t
    const glide = (v, to, ms) => (Math.abs(to - v) < 0.01 ? to : v + (to - v) * (1 - Math.exp(-dt / ms)))
    hv.x = glide(hv.x, player.x, 45)
    hv.y = glide(hv.y, player.y, 45)
    for (const p of people) {
      p.vx = glide(p.vx, p.x, 80)
      p.vy = glide(p.vy, p.y, 80)
    }
    for (const [i, t0] of stirs) if (t - t0 > STIR_MS) stirs.delete(i)
    draw(t)
  }

  // ── input ──
  const KEYS = {
    ArrowUp: [0, -1], w: [0, -1], k: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], j: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], h: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], l: [1, 0],
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (key === "Enter" || key === "e" || key === "z" || key === "x") {
      // a focused link or button handles its own Enter
      if (key === "Enter" && e.target instanceof HTMLElement && e.target.closest("a, button")) return
      if (act()) e.preventDefault()
      return
    }
    const dir = KEYS[key]
    if (!dir) return
    e.preventDefault()
    step(dir)
  }

  /** Open the work in reach, or read the sign in reach. True if there was either. */
  function act() {
    const sign = signInReach()
    if (active) open()
    else if (sign !== undefined) readSign(sign)
    else return false
    return true
  }

  /** One step by hand, from a key or the cross. True if it took you anywhere. */
  function step(dir) {
    stopWalk()
    const nx = player.x + dir[0]
    const ny = player.y + dir[1]
    // walking into someone gets you a remark instead of a step
    const who = personAt(nx, ny)
    if (who) return log(pick(BUMP[who.kind]))
    if (walkable(nx, ny)) {
      moveTo(nx, ny)
      return true
    }
    // so does walking into a sign: that is how you read it
    if (inMap(nx, ny) && signs.has(at(nx, ny))) return readSign(at(nx, ny))
    // bumping a work turns to face it
    if (inMap(nx, ny) && workAt.has(at(nx, ny))) {
      updateActive(workAt.get(at(nx, ny)))
      updateHud()
      render()
    }
  }

  function onPointer(e) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left - camX) / cell)
    const y = Math.floor((e.clientY - rect.top - camY) / cell)
    if (!inMap(x, y)) return
    if (workAt.has(at(x, y))) {
      const i = workAt.get(at(x, y))
      if (active?.i === i) return open()
      return walkTo(nextTo(works[i]))
    }
    if (signs.has(at(x, y))) return walkTo(nextTo({ x, y }), () => readSign(at(x, y)))
    if (walkable(x, y)) walkTo((cx, cy) => cx === x && cy === y)
  }

  // ── cross: press an arm to step that way, hold it to keep going, and
  // slide the thumb round to turn, as on a Game Boy ──
  const dpad = root.querySelector("[data-rogue-dpad]")
  if (dpad) {
    const ARMS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
    /** @type {string | null} */
    let lean = null
    let dpadTimer = 0
    const setLean = (arm) => {
      if (arm === lean) return
      lean = arm
      window.clearInterval(dpadTimer)
      if (!arm) return delete dpad.dataset.lean
      dpad.dataset.lean = arm
      // held against something, it says so once rather than over and over
      if (!step(ARMS[arm])) return
      dpadTimer = window.setInterval(() => {
        if (!step(ARMS[arm])) window.clearInterval(dpadTimer)
      }, DPAD_MS)
    }
    const onDpad = (e) => {
      const rect = dpad.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      // the hub is dead, then whichever arm the thumb is further along
      if (Math.hypot(dx, dy) < rect.width * 0.12) return setLean(null)
      setLean(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down")
    }
    const release = () => setLean(null)
    dpad.addEventListener("pointerdown", (e) => {
      e.preventDefault()
      dpad.setPointerCapture(e.pointerId)
      onDpad(e)
    })
    dpad.addEventListener("pointermove", (e) => {
      if (dpad.hasPointerCapture(e.pointerId)) onDpad(e)
    })
    dpad.addEventListener("pointerup", release)
    dpad.addEventListener("pointercancel", release)
    dpad.addEventListener("lostpointercapture", release)
    dpad.addEventListener("contextmenu", (e) => e.preventDefault())
  }

  // A does what Enter does; B calls off a walk you tapped for
  root.querySelector("[data-rogue-a]")?.addEventListener("click", act)
  root.querySelector("[data-rogue-b]")?.addEventListener("click", stopWalk)

  indexItems.forEach((el) => {
    el.addEventListener("click", (e) => {
      const i = Number(el.dataset.workIndex)
      // already standing at it: let the link through
      if (active?.i === i) return
      e.preventDefault()
      walkTo(nextTo(works[i]))
    })
  })

  // Stepped two-frame idles, the people going about their day, and the frame
  // loop. Under reduced motion the museum holds still: one frame, everyone
  // where they stand, no rain.
  if (!still) {
    window.setInterval(() => {
      if (!document.hidden) frame ^= 1
    }, FRAME_MS)
    window.setInterval(() => {
      if (!document.hidden) peopleTick()
    }, PEOPLE_MS)
    window.requestAnimationFrame(tick)
  }

  // HUD and legend icons are the map's own sprites, drawn onto small canvases
  root.querySelectorAll("canvas[data-sprite]").forEach((el) => {
    const rows = SPRITE_ROWS[el.dataset.sprite] ?? WORLD[el.dataset.sprite]
    if (!rows) return
    el.width = rows[0].length
    el.height = rows.length
    el.style.width = `${rows[0].length * Number(el.dataset.scale ?? 1)}px`
    const c = el.getContext("2d")
    c.fillStyle = INK
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === "#" && c.fillRect(x, y, 1, 1)))
  })

  window.addEventListener("keydown", onKey)
  canvas.addEventListener("click", onPointer)
  new ResizeObserver(() => {
    art.clear()
    layout()
  }).observe(stage)

  restore()
  notice()
  updateActive()
  updateHud()
  if (!active) log(turns ? "You pick up where you left off." : `You stand outside the museum, in the rain. ${works.length} works hang somewhere inside.`)
  layout()
  root.dataset.ready = ""
}
