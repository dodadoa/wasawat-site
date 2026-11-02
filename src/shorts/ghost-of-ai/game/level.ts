// Sala Saneha, three floors, laid out from photographs taken walking in from
// Decho Road and up through the building. The floors sit side by side in
// world space (walls hide one from another); the stairs fade you between them.
//
//   1F · THE WAY IN (x offset LX)        2F · BOOKSHOP, WINE ROOM, BISTRO (no offset)
//   z=9 ┌──[ stair ↑ ]─────────┐         z=11 ┌landing┬───[ bar ]────────┬─wine─┬curtain┬lift┐
//       │ staff   stair  lift  │              │ bench │ chandelier, rug  │ room │stair↓ │    │
//       │ door           box   │              │ stair↑│ tables      hutch├──────┤       │    │
//       │ folding        notice│              └───────┤                  │ green│ round │book│
//       │ doors          board │                      │ windows          │ bench│ table │case│
//   z=0 └────[ street doors ]──┘         z=0          └──────[ street ]──┴──────┴───────┴────┘
//      x=-4                   4                     x=-16  -12.5            -3.4    0          6
//
//   3F · THE CINEMA (x offset CX)
//   z=11 ┌landing┬─[gate]─┬────────────────────[ SCREEN ]─────┐
//        │ sun   │ toilets│ red wall      seats in five rows   │
//        │ stair↓│ foyer  │ control door  (two on risers)      │
//        │ chairs│  zinc ─┤                                    │
//   z=1.4└───────┘ pot    └─────────── zinc ──────────[curtain]┘
//   z=0           └═══════ windows over Decho Road ════════════┘
//       x=0     3.6      7.8                                   15

export const WALL_H = 3;
export const WALL_T = 0.24;
export const KIT_SCALE = 2; // both Kenney kits are ~half-scale

/** x offset of the ground floor and of the cinema floor */
export const LX = -40;
export const CX = 30;
const L = (x: number) => x + LX;
const C = (x: number) => x + CX;

/** Textures cut from the photos (scripts/photo-textures.mjs → public/textures). */
export const PHOTO_TEXTURES = [
  "noticeboard", "lobby-screen", "folding-doors", "fretwork", "slats", "green-panel", "cream-wall",
  "bookcase", "wine-rack", "kitchen-shelves", "lampshade", "lamp-glow", "terracotta", "carved-panel",
  "hutch", "sheer", "electrical", "concrete", "sun-print", "zinc", "foyer-wall", "control-door",
  "grille", "arch-door", "palm-painting", "dark-painting", "velvet-drape", "swag", "chair-damask",
] as const;
export type PhotoTex = (typeof PHOTO_TEXTURES)[number];
/** Painted in textures.ts. */
export type PaintedTex =
  | "planks" | "wallpaper" | "stone" | "plaster" | "tile" | "panel" | "damask" | "velvet" | "curtain" | "bottles" | "carpet"
  | "parquet" | "laminate" | "marble" | "zinc-bar" | "carpet-dark" | "rug" | "red-wall" | "check" | "embroidery" | "shelf-low" | "frosted" | "pile";
export type Tex = PhotoTex | PaintedTex;

/** `tex` faces +z (walls along x) or +x (walls along z); `back`, if given, the other side. */
export type Seg = { x1: number; z1: number; x2: number; z2: number; tex?: Tex; back?: Tex };
export type Box = { x1: number; x2: number; z1: number; z2: number };

export type FloorId = "lobby" | "bar" | "cinema";
/** Bottom to top. */
export const FLOOR_ORDER: FloorId[] = ["lobby", "bar", "cinema"];
export const FLOOR_LABEL: Record<FloorId, string> = { lobby: "1F", bar: "2F", cinema: "3F" };
export const FLOOR_BOUNDS: Record<FloorId, Box> = {
  lobby: { x1: L(-4), x2: L(4), z1: 0, z2: 9 },
  bar: { x1: -16, x2: 6, z1: 0, z2: 11 },
  cinema: { x1: C(0), x2: C(15), z1: 0, z2: 11 },
};
export const floorAt = (x: number): FloorId => (x < -26 ? "lobby" : x > 18 ? "cinema" : "bar");

// ---------- building blocks

type V3 = [number, number, number];
/** Degrees: a turn about Y, or [x, y, z] applied in YXZ order (so a piece's Y turn just adds on). */
export type Rot = number | V3;
export type Shape = "box" | "cyl" | "sphere" | "tube";

/** Every static thing in the house is one of these, merged per material at render time. `pos` is the centre. */
export type Block = {
  pos: V3;
  /** box: w, h, d · cyl / tube: diameter, height, diameter · sphere: diameter */
  size: V3;
  tex?: Tex;
  color?: string;
  /** texture repeats on every face (ignored with `world`) */
  rep?: [number, number];
  /** the texture keeps its real size whatever the face's size (tiling surfaces) */
  world?: boolean;
  solid?: boolean;
  rot?: Rot;
  shape?: Shape;
  /** cyl: top radius as a fraction of the bottom one */
  taper?: number;
  /** radial segments (cyl, tube, sphere) */
  seg?: number;
  /** self-lit (not shaded by the lamps): true, or a brightness 0..1 */
  glow?: boolean | number;
  /** see-through, e.g. glass */
  opacity?: number;
};

type Face = "+x" | "-x" | "+z" | "-z";
const FACE_ROT: Record<Face, number> = { "+z": 0, "-z": 180, "+x": 90, "-x": -90 };

/** A thin panel on a wall (a picture, a door, a sign), looking toward `face`. */
const panel = (pos: V3, w: number, h: number, face: Face, b: Partial<Block> = {}): Block => ({ pos, size: [w, h, 0.02], rot: FACE_ROT[face], ...b });

const addRot = (r: Rot | undefined, y: number): Rot => (r === undefined ? y : typeof r === "number" ? r + y : [r[0], r[1] + y, r[2]]);

/** Parts laid out around a piece's origin (facing +z), set down at (x, y0, z) turned `rot` degrees. */
function piece(x: number, z: number, rot: number, parts: Block[], y0 = 0): Block[] {
  const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return parts.map((p) => {
    const [px, py, pz] = p.pos;
    return { ...p, pos: [x + px * c + pz * s, y0 + py, z - px * s + pz * c], rot: addRot(p.rot, rot) };
  });
}

const TEAK = "#7a3a20";
const DARK_WOOD = "#3a1c10";
const WOOD = "#5a3018";
const BLACK = "#161414";
const BRASS = "#a8884a";
const LAMP = "#fff0d0";

type Fabric = "green" | "blue" | "red" | "damask" | "mauve" | "cream";
const FABRIC: Record<Fabric, Partial<Block>> = {
  green: { tex: "pile", color: "#6a9a70" },
  blue: { tex: "pile", color: "#7a8e9e" },
  red: { tex: "pile", color: "#c03028" },
  mauve: { tex: "pile", color: "#9a7a88" },
  cream: { color: "#d8d0c0" },
  damask: { tex: "chair-damask", color: "#ffffff" },
};

/** The cinema's mid-century armchairs: a teak frame, a reclined back. `wide` is a loveseat for two. */
function lounge(x: number, z: number, rot: number, fabric: Fabric, y0 = 0, wide = false): Block[] {
  const w = wide ? 1.3 : 0.78;
  const f = FABRIC[fabric];
  const legs = ([-w / 2, w / 2] as const).flatMap((lx) => [
    { pos: [lx, 0.5, 0.02], size: [0.06, 0.05, 0.74], color: TEAK },
    { pos: [lx, 0.25, 0.3], size: [0.05, 0.5, 0.05], color: TEAK },
    { pos: [lx, 0.27, -0.32], size: [0.05, 0.54, 0.05], color: TEAK },
  ] as Block[]);
  return piece(x, z, rot, [
    ...legs,
    { pos: [0, 0.36, 0.04], size: [w - 0.1, 0.14, 0.62], ...f },
    { pos: [0, 0.84, -0.34], size: [w - 0.1, 0.86, 0.13], rot: [-10, 0, 0], ...f },
    ...(wide ? [] : [{ pos: [0, 1.25, -0.4], size: [w - 0.26, 0.15, 0.12], rot: [-10, 0, 0], ...f } as Block]),
  ], y0);
}

/** A small round metal table with a patterned top and a bottle of water. */
function sideTable(x: number, z: number, y0 = 0, bottle = true): Block[] {
  return [
    { pos: [x, y0 + 0.55, z], size: [0.4, 0.025, 0.4], shape: "cyl", seg: 10, tex: "chair-damask", color: "#e8e0d0" },
    { pos: [x, y0 + 0.28, z], size: [0.025, 0.54, 0.025], color: BLACK },
    { pos: [x, y0 + 0.015, z], size: [0.3, 0.02, 0.3], shape: "cyl", seg: 8, color: BLACK },
    ...(bottle ? [{ pos: [x + 0.06, y0 + 0.66, z - 0.03], size: [0.06, 0.2, 0.06], shape: "cyl", seg: 6, color: "#c8d4d8" } as Block] : []),
  ];
}

/** A ladder-back dining chair facing +z before turning. */
function chair(x: number, z: number, rot: number, seat: Partial<Block>, wood = WOOD): Block[] {
  const legs = [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]].map(([lx, lz]) => ({ pos: [lx, 0.22, lz], size: [0.04, 0.44, 0.04], color: wood }) as Block);
  return piece(x, z, rot, [
    { pos: [0, 0.47, 0], size: [0.42, 0.07, 0.42], ...seat },
    ...legs,
    { pos: [-0.18, 0.74, -0.19], size: [0.04, 0.56, 0.04], color: wood },
    { pos: [0.18, 0.74, -0.19], size: [0.04, 0.56, 0.04], color: wood },
    { pos: [0, 0.64, -0.19], size: [0.36, 0.05, 0.03], color: wood },
    { pos: [0, 0.8, -0.19], size: [0.36, 0.05, 0.03], color: wood },
    { pos: [0, 0.98, -0.19], size: [0.42, 0.06, 0.04], color: wood },
  ]);
}

/** Square bistro table on a black pedestal, a candle in a glass. */
function bistroTable(x: number, z: number, candle = true): Block[] {
  return [
    { pos: [x, 0.74, z], size: [0.72, 0.04, 0.72], color: "#3a1e12" },
    { pos: [x, 0.37, z], size: [0.07, 0.72, 0.07], color: BLACK },
    { pos: [x, 0.02, z], size: [0.46, 0.03, 0.46], shape: "cyl", seg: 8, color: BLACK },
    ...(candle ? [{ pos: [x, 0.8, z], size: [0.07, 0.08, 0.07], shape: "cyl", seg: 6, glow: true, color: "#ffb868" } as Block] : []),
  ];
}

function stool(x: number, z: number, seat: string, h = 0.74): Block[] {
  return [
    { pos: [x, h, z], size: [0.36, 0.08, 0.36], shape: "cyl", seg: 10, tex: "pile", color: seat },
    ...[[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]].map(([dx, dz]) => ({ pos: [x + dx, h / 2, z + dz], size: [0.025, h, 0.025], color: BLACK }) as Block),
    { pos: [x, h * 0.32, z], size: [0.26, 0.02, 0.26], color: BLACK },
  ];
}

/** Hung from the ceiling on a cord. */
const cord = (x: number, z: number, from: number): Block => ({ pos: [x, (from + WALL_H) / 2, z], size: [0.014, WALL_H - from, 0.014], color: "#1a1a1a" });

/** A small chandelier: five frosted tulips round a brass stem. */
function chandelier(x: number, y: number, z: number): Block[] {
  const tulips: Block[] = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    tulips.push({ pos: [x + Math.cos(a) * 0.24, y - 0.04, z + Math.sin(a) * 0.24], size: [0.1, 0.12, 0.1], shape: "cyl", seg: 6, taper: 1.6, glow: true, color: LAMP });
    tulips.push({ pos: [x + Math.cos(a) * 0.12, y - 0.1, z + Math.sin(a) * 0.12], size: [0.24, 0.02, 0.02], rot: (-a * 180) / Math.PI, color: BRASS });
  }
  return [{ pos: [x, (y + WALL_H) / 2, z], size: [0.025, WALL_H - y, 0.025], color: BRASS }, ...tulips];
}

/**
 * Straight stairs: `steps` treads from (a, along the axis) climbing in `dir`,
 * `across` wide. Each step is a solid block under a tread; `base` is the
 * floor it stands on (below zero for stairs going down a stairwell).
 */
function stairs(o: { axis: "x" | "z"; at: number; dir: 1 | -1; across: [number, number]; steps: number; rise: number; run: number; base?: number; tread: string; under: string; nosing?: string }): Block[] {
  const out: Block[] = [];
  const [a1, a2] = o.across;
  const mid = (a1 + a2) / 2, w = a2 - a1;
  const base = o.base ?? 0;
  for (let i = 0; i < o.steps; i++) {
    const top = base + (i + 1) * o.rise;
    const along = o.at + o.dir * (i + 0.5) * o.run;
    const lo = o.rise > 0 ? base : top - 3;
    const h = top - 0.04 - lo;
    const at = (u: number, y: number, v: number): V3 => (o.axis === "x" ? [u, y, v] : [v, y, u]);
    const sz = (u: number, y: number, v: number): V3 => (o.axis === "x" ? [u, y, v] : [v, y, u]);
    out.push({ pos: at(along, lo + h / 2, mid), size: sz(o.run, h, w), color: o.under });
    out.push({ pos: at(along - o.dir * 0.015, top - 0.02, mid), size: sz(o.run + 0.03, 0.04, w + 0.02), color: o.tread });
    if (o.nosing) out.push({ pos: at(along - o.dir * (o.run / 2 - 0.02), top - 0.005, mid), size: sz(0.04, 0.012, w), color: o.nosing });
  }
  return out;
}

/** Turned wooden balusters (the old house) or plain black steel (the back stairs), with a rail. */
function rail(from: [number, number], to: [number, number], kind: "turned" | "steel", y1 = 0, y2 = 0, h = 0.92): Block[] {
  const [x1, z1] = from, [x2, z2] = to;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.round(len / (kind === "turned" ? 0.14 : 0.13)));
  const col = kind === "turned" ? "#2e140a" : BLACK;
  const out: Block[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const yb = y1 + (y2 - y1) * t;
    const x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
    if (kind === "turned") {
      out.push({ pos: [x, yb + h * 0.45, z], size: [0.045, h * 0.9, 0.045], color: col });
      out.push({ pos: [x, yb + h * 0.42, z], size: [0.07, 0.14, 0.07], shape: "cyl", seg: 6, color: col });
    } else out.push({ pos: [x, yb + h / 2, z], size: [0.022, h, 0.022], color: col });
  }
  // the rail itself, tilted to follow the stairs
  const yaw = (Math.atan2(x2 - x1, z2 - z1) * 180) / Math.PI;
  const pitch = (-Math.atan2(y2 - y1, len) * 180) / Math.PI;
  const run = Math.hypot(len, y2 - y1);
  out.push({ pos: [(x1 + x2) / 2, (y1 + y2) / 2 + h, (z1 + z2) / 2], size: kind === "turned" ? [0.08, 0.07, run] : [0.04, 0.04, run], rot: [pitch, yaw, 0], color: kind === "turned" ? "#4a2010" : BLACK });
  return out;
}

/** A turned newel post with a ball on top. */
const newel = (x: number, z: number, y = 0): Block[] => [
  { pos: [x, y + 0.55, z], size: [0.12, 1.1, 0.12], color: "#2e140a" },
  { pos: [x, y + 1.17, z], size: [0.13, 0.13, 0.13], shape: "sphere", seg: 6, color: "#3a1a0c" },
];

/**
 * Windows onto the street, rain on the glass (the glass itself is in
 * Storm.tsx). `face` is the direction the window looks into the room.
 * `light`: where the lightning's cold light comes in (one per room is plenty).
 */
export type StreetWindow = { x: number; z: number; y: number; w: number; h: number; face: [number, number]; light?: V3 };

/** Frame, glazing bars and (bookshop) security bars over one window. */
function frame(win: StreetWindow, color = TEAK, panes = 1, bars = 0, transom?: number): Block[] {
  const [fx, fz] = win.face;
  const out: Block[] = [];
  // u runs along the wall, n out from the glass into the room
  const put = (u: number, y: number, n: number, su: number, sy: number, sn: number, c = color): Block =>
    fz !== 0 ? { pos: [win.x + u, y, win.z + n * fz], size: [su, sy, sn], color: c } : { pos: [win.x + n * fx, y, win.z + u], size: [sn, sy, su], color: c };
  const { w, h, y } = win;
  out.push(put(0, y + h / 2 + 0.04, 0.05, w + 0.16, 0.08, 0.08));
  out.push(put(0, y - h / 2 - 0.04, 0.1, w + 0.24, 0.06, 0.2));
  out.push(put(-w / 2 - 0.04, y, 0.05, 0.08, h + 0.16, 0.08));
  out.push(put(w / 2 + 0.04, y, 0.05, 0.08, h + 0.16, 0.08));
  for (let k = 1; k < panes; k++) out.push(put(-w / 2 + (w * k) / panes, y, 0.05, 0.05, h, 0.05));
  if (transom !== undefined) out.push(put(0, transom, 0.05, w, 0.05, 0.05));
  for (let k = 0; k < bars; k++) out.push(put(0, y - h / 2 + (h * (k + 0.5)) / bars, 0.08, w, 0.025, 0.025, "#1a1410"));
  return out;
}

// ======================================================================
// 1F · THE WAY IN
// ======================================================================

const lobbyWalls: Seg[] = [
  { x1: L(-4), z1: 0, x2: L(4), z2: 0, tex: "cream-wall" },
  { x1: L(-4), z1: 0, x2: L(-4), z2: 9, tex: "cream-wall" },
  { x1: L(4), z1: 0, x2: L(4), z2: 9, tex: "cream-wall" },
  { x1: L(-4), z1: 9, x2: L(4), z2: 9, tex: "cream-wall" },
];

const lobbyGlass: StreetWindow[] = [
  { x: L(-0.4), z: 0.16, y: 1.18, w: 0.72, h: 2.16, face: [0, 1], light: [L(0), 2.1, 1.2] },
  { x: L(0.4), z: 0.16, y: 1.18, w: 0.72, h: 2.16, face: [0, 1] },
  { x: L(-1.6), z: 0.16, y: 1.53, w: 1.52, h: 1.44, face: [0, 1] },
  { x: L(1.6), z: 0.16, y: 1.53, w: 1.52, h: 1.44, face: [0, 1] },
];

/** The street front: teak doors and glazing, green panels below, carved transoms above. */
const storefront: Block[] = [
  { pos: [L(0), 2.3, 0.19], size: [4.9, 0.1, 0.08], color: TEAK },
  { pos: [L(0), 2.97, 0.19], size: [4.9, 0.06, 0.08], color: TEAK },
  ...[-2.4, -0.8, 0.8, 2.4].map((x) => ({ pos: [L(x), 1.5, 0.19], size: [0.09, 3.0, 0.09], color: TEAK }) as Block),
  { pos: [L(0), 1.15, 0.19], size: [0.06, 2.3, 0.08], color: TEAK },
  { pos: [L(-0.4), 1.12, 0.19], size: [0.8, 0.07, 0.07], color: TEAK },
  { pos: [L(0.4), 1.12, 0.19], size: [0.8, 0.07, 0.07], color: TEAK },
  { pos: [L(-0.4), 0.06, 0.19], size: [0.8, 0.1, 0.07], color: TEAK },
  { pos: [L(0.4), 0.06, 0.19], size: [0.8, 0.1, 0.07], color: TEAK },
  { pos: [L(-0.12), 1.12, 0.235], size: [0.06, 0.06, 0.02], color: BRASS },
  { pos: [L(0.12), 1.12, 0.235], size: [0.06, 0.06, 0.02], color: BRASS },
  ...[-1.6, 1.6].flatMap((x) => [
    panel([L(x), 0.42, 0.15], 1.5, 0.66, "+z", { tex: "green-panel" }),
    { pos: [L(x), 0.78, 0.19], size: [1.6, 0.06, 0.07], color: TEAK } as Block,
  ]),
  ...([[-2.0, "fretwork"], [-1.2, "slats"], [-0.4, "fretwork"], [0.4, "fretwork"], [1.2, "slats"], [2.0, "fretwork"]] as const).map(([x, tex]) =>
    panel([L(x), 2.645, 0.15], 0.78, 0.58, "+z", { tex })
  ),
  { pos: [L(0), 0.006, 0.75], size: [1.1, 0.012, 0.65], color: "#7a1612" },
];

const lobbyBlocks: Block[] = [
  ...storefront,
  ...lobbyGlass.flatMap((g) => frame(g, TEAK)),
  { pos: [L(-3.0), 2.62, 0.26], size: [0.9, 0.28, 0.24], color: "#d8d4cc" }, // air conditioner
  ...chandelier(L(0), 2.62, 1.7),
  // the old shopfront along the side: tall folding doors, frosted
  ...[1.3, 2.7, 4.1].map((z) => panel([L(-3.85), 1.17, z], 1.4, 2.3, "+x", { tex: "folding-doors" })),
  { pos: [L(-3.85), 2.36, 2.7], size: [0.06, 0.08, 4.3], color: TEAK },
  { pos: [L(-3.86), 2.69, 2.7], size: [0.04, 0.6, 4.3], tex: "laminate", world: true },
  // the noticeboard, lit along its top
  panel([L(3.85), 1.55, 3.4], 2.2, 1.1, "-x", { tex: "noticeboard", glow: 0.82 }),
  // the spirit shelf (หิ้ง) high by the door
  { pos: [L(3.82), 2.0, 1.3], size: [0.32, 0.04, 0.7], color: "#3a2416" },
  { pos: [L(3.78), 2.09, 1.45], size: [0.07, 0.14, 0.07], color: "#c0283a" },
  { pos: [L(3.8), 2.04, 1.6], size: [0.16, 0.04, 0.12], color: "#efe8d0" },
  // the wooden column: the lift for diamonds runs up inside it
  { pos: [L(3.3), 1.5, 6.15], size: [1.4, 3.0, 1.5], tex: "laminate", world: true, solid: true },
  { pos: [L(3.3), 1.45, 5.39], size: [0.58, 0.94, 0.02], color: "#141414" },
  panel([L(3.3), 1.45, 5.37], 0.5, 0.85, "-z", { tex: "lobby-screen", glow: 0.9 }),
  { pos: [L(2.85), 1.35, 5.39], size: [0.08, 0.12, 0.02], color: "#b8a888" },
  { pos: [L(2.59), 1.0, 6.15], size: [0.02, 1.9, 0.62], color: "#5a2c16" },
  { pos: [L(2.575), 1.0, 5.94], size: [0.02, 0.05, 0.16], color: BRASS },
  // the house's own stairs: dark treads, turned balusters, up into the ceiling
  ...stairs({ axis: "x", at: L(1.6), dir: -1, across: [7.95, 8.88], steps: 14, rise: 0.2, run: 0.28, tread: "#2a140a", under: "#b8ac98" }),
  ...rail([L(1.6), 7.97], [L(-2.32), 7.97], "turned", 0.2, 3.0),
  ...newel(L(1.66), 7.97),
  { pos: [L(-0.36), 1.25, 7.94], size: [4.82, 0.26, 0.04], rot: [0, 0, -35.5], color: "#2e140a" }, // stringer
  { pos: [L(-0.4), 0.42, 7.93], size: [0.56, 0.46, 0.02], color: "#4a2414" }, // a little hatch under the stairs
  { pos: [L(-0.4), 0.42, 7.92], size: [0.46, 0.36, 0.01], color: "#101418" },
  panel([L(-3.1), 1.0, 8.865], 0.86, 2.0, "-z", { color: "#4a2014", tex: "planks", rep: [0.6, 1] }), // STAFF ONLY
  { pos: [L(-3.1), 2.04, 8.86], size: [0.98, 0.08, 0.04], color: DARK_WOOD },
  { pos: [L(-2.78), 1.0, 8.84], size: [0.05, 0.05, 0.04], color: BRASS },
  { pos: [L(-3.1), 1.6, 8.85], size: [0.5, 0.08, 0.01], color: "#a02018" },
];

const lobbySolids: Box[] = [{ x1: L(-2.4), x2: L(1.72), z1: 7.88, z2: 9 }];

// ======================================================================
// 2F · BOOKSHOP, WINE ROOM, BISTRO
// ======================================================================

const barWalls: Seg[] = [
  // the street
  { x1: -12.5, z1: 0, x2: -3.4, z2: 0, tex: "terracotta" },
  { x1: -3.4, z1: 0, x2: 6, z2: 0, tex: "cream-wall" },
  { x1: 6, z1: 0, x2: 6, z2: 11, tex: "cream-wall" },
  // the back
  { x1: -12.5, z1: 11, x2: -3.4, z2: 11, tex: "terracotta" },
  { x1: -3.4, z1: 11, x2: 6, z2: 11, tex: "cream-wall" },
  // the bistro's far wall: windows, then the way to the back stairs
  { x1: -12.5, z1: 0, x2: -12.5, z2: 6.2, tex: "terracotta", back: "cream-wall" },
  { x1: -12.5, z1: 8.0, x2: -12.5, z2: 11, tex: "terracotta", back: "cream-wall" },
  // the back landing
  { x1: -16, z1: 4.6, x2: -16, z2: 11, tex: "cream-wall" },
  { x1: -16, z1: 4.6, x2: -12.5, z2: 4.6, tex: "cream-wall" },
  { x1: -16, z1: 11, x2: -12.5, z2: 11, tex: "cream-wall" },
  // bistro | bookshop side: a doorway and a window through
  { x1: -3.4, z1: 0, x2: -3.4, z2: 1.4, tex: "cream-wall", back: "terracotta" },
  { x1: -3.4, z1: 3.0, x2: -3.4, z2: 3.8, tex: "cream-wall", back: "terracotta" },
  { x1: -3.4, z1: 6.4, x2: -3.4, z2: 11, tex: "cream-wall", back: "terracotta" },
  // the wine room (the jeweller's vault)
  { x1: -3.4, z1: 7.2, x2: 0, z2: 7.2, tex: "cream-wall" },
  { x1: 0, z1: 7.2, x2: 0, z2: 8.2, tex: "cream-wall" },
  { x1: 0, z1: 9.6, x2: 0, z2: 11, tex: "cream-wall" },
];

const bookshopGlass: StreetWindow[] = [
  { x: 1.1, z: 0.16, y: 1.7, w: 1.5, h: 1.5, face: [0, 1] },
  { x: 2.9, z: 0.16, y: 1.7, w: 1.5, h: 1.5, face: [0, 1], light: [2.9, 2.0, 1.2] },
  { x: 4.7, z: 0.16, y: 1.7, w: 1.5, h: 1.5, face: [0, 1] },
  { x: -1.75, z: 0.16, y: 1.7, w: 2.6, h: 1.4, face: [0, 1] },
];
const bistroGlass: StreetWindow[] = [
  { x: -10.4, z: 0.16, y: 1.7, w: 3.6, h: 1.8, face: [0, 1], light: [-10.4, 2.0, 1.4] },
  { x: -5.9, z: 0.16, y: 1.7, w: 4.2, h: 1.8, face: [0, 1], light: [-5.9, 2.0, 1.4] },
  { x: -12.34, z: 2.4, y: 1.7, w: 3.8, h: 1.8, face: [1, 0] },
];

/** The round antique table in the bookshop, three chairs, one pushed back. */
const roundTable: Block[] = [
  { pos: [2.6, 0.74, 2.7], size: [1.1, 0.04, 1.1], shape: "cyl", seg: 12, color: "#4a2414" },
  { pos: [2.6, 0.37, 2.7], size: [0.16, 0.72, 0.16], shape: "cyl", seg: 8, color: "#2e160a" },
  { pos: [2.6, 0.04, 2.7], size: [0.62, 0.06, 0.62], shape: "cyl", seg: 8, color: "#2e160a" },
  { pos: [2.85, 0.775, 2.55], size: [0.34, 0.03, 0.34], shape: "cyl", seg: 10, color: "#8ab0a0" },
  { pos: [2.4, 0.87, 2.9], size: [0.1, 0.22, 0.1], shape: "cyl", seg: 6, color: "#c8d0d0", opacity: 0.6 },
  { pos: [2.6, 0.775, 3.0], size: [0.24, 0.03, 0.17], color: "#4a7a70" },
  ...chair(2.6, 1.9, 0, { color: "#a85a30" }, "#7a4020"),
  ...chair(3.45, 3.1, -90, { tex: "check", color: "#ffffff" }, "#7a4020"),
  ...chair(1.6, 3.55, 120, { tex: "check", color: "#ffffff" }, "#7a4020"),
];

/** A globe of opal glass on a cord. */
const globe = (x: number, y: number, z: number): Block[] => [
  { pos: [x, y, z], size: [0.36, 0.36, 0.36], shape: "sphere", seg: 8, glow: true, color: "#fff4dc" },
  { pos: [x, y + 0.2, z], size: [0.1, 0.06, 0.1], shape: "cyl", seg: 6, color: "#2a2a24" },
  cord(x, z, y + 0.22),
];

const bookshop: Block[] = [
  ...bookshopGlass.flatMap((g) => frame(g, "#3a1c10", g.w > 2 ? 2 : 1, 9)),
  { pos: [2.9, 2.75, 0.3], size: [1.0, 0.3, 0.26], color: "#dcd8d0" },
  // low shelves under the windows and along the half wall, books laid face up
  { pos: [3.0, 0.475, 0.37], size: [5.5, 0.95, 0.5], tex: "shelf-low", rep: [6, 1], solid: true },
  { pos: [3.0, 0.96, 0.37], size: [5.56, 0.03, 0.54], color: "#5a3420" },
  { pos: [0.37, 0.475, 2.2], size: [0.5, 0.95, 3.0], tex: "shelf-low", rep: [3, 1], solid: true },
  { pos: [0.37, 0.96, 2.2], size: [0.54, 0.03, 3.04], color: "#5a3420" },
  { pos: [0.37, 0.48, 3.72], size: [0.5, 0.96, 0.5], shape: "cyl", seg: 10, color: "#5a3420", solid: true },
  { pos: [0, 0.53, 1.95], size: [0.2, 1.06, 3.7], tex: "cream-wall", world: true, solid: true }, // the half wall
  ...[[0.9, "#6a8a7a"], [1.8, "#b04a3a"], [3.3, "#d8c8a0"], [4.6, "#3a5a7a"]].map(([x, c]) => ({ pos: [x as number, 0.985, 0.4], size: [0.17, 0.02, 0.24], color: c as string }) as Block),
  { pos: [0.37, 0.985, 1.4], size: [0.24, 0.02, 0.17], color: "#4a7a5a" },
  { pos: [0.37, 1.05, 2.2], size: [0.03, 0.16, 0.12], color: "#5a8a6a" }, // a book stood up: Welcome to the Kingdom
  // the lantern lamp and the clay cat on the curved end
  { pos: [0.37, 0.99, 3.64], size: [0.12, 0.02, 0.12], shape: "cyl", seg: 8, color: BLACK },
  { pos: [0.3, 1.13, 3.64], size: [0.015, 0.28, 0.015], color: BLACK },
  { pos: [0.37, 1.27, 3.64], size: [0.17, 0.12, 0.17], shape: "cyl", seg: 8, taper: 0.35, color: BLACK },
  { pos: [0.37, 1.13, 3.64], size: [0.09, 0.14, 0.09], shape: "cyl", seg: 6, glow: true, color: "#ffe2b0" },
  { pos: [0.37, 1.08, 3.05], size: [0.11, 0.2, 0.09], color: "#c8a888" },
  { pos: [0.37, 1.22, 3.05], size: [0.12, 0.1, 0.1], color: "#c8a888" },
  { pos: [0.35, 1.3, 3.01], size: [0.03, 0.05, 0.02], color: "#c8a888" },
  { pos: [0.35, 1.3, 3.09], size: [0.03, 0.05, 0.02], color: "#c8a888" },
  ...roundTable,
  // the tall bookcase
  { pos: [5.79, 1.35, 2.6], size: [0.38, 2.7, 3.4], color: DARK_WOOD, solid: true },
  panel([5.58, 1.32, 2.6], 3.3, 2.6, "-x", { tex: "bookcase", rep: [2.4, 2.6] }),
  ...globe(2.6, 2.28, 2.7),
  ...globe(3.6, 2.28, 5.3),
];

/** The stairs from the way in arrive here, up through a well with turned balusters. */
const stairHall: Block[] = [
  ...stairs({ axis: "z", at: 7.6, dir: 1, across: [0.32, 1.48], steps: 8, rise: -0.2, run: 0.28, tread: "#2a140a", under: "#3a3028" }),
  { pos: [0.27, -1.5, 9.1], size: [0.1, 3.0, 3.1], color: "#3a3430" },
  { pos: [1.53, -1.5, 9.1], size: [0.1, 3.0, 3.1], color: "#3a3430" },
  { pos: [0.9, -1.5, 10.65], size: [1.36, 3.0, 0.1], color: "#3a3430" },
  { pos: [0.9, -3.0, 9.1], size: [1.36, 0.05, 3.1], color: "#000000", glow: true },
  ...rail([1.5, 7.6], [1.5, 10.6], "turned"),
  ...rail([0.3, 10.6], [1.5, 10.6], "turned"),
  ...newel(1.5, 7.6),
  ...newel(1.5, 10.6),
  // sheer curtains over a tall window, lit from outside
  { pos: [1.7, 1.5, 10.84], size: [3.2, 3.0, 0.06], tex: "sheer", world: true, glow: 0.6 },
  // the column again, with the lift's little hatch
  { pos: [4.0, 1.5, 7.2], size: [1.4, 3.0, 1.4], tex: "laminate", world: true, solid: true },
  { pos: [3.84, 1.05, 6.49], size: [0.3, 0.62, 0.02], color: "#6a3418" },
  { pos: [4.16, 1.05, 6.49], size: [0.3, 0.62, 0.02], color: "#6a3418" },
  { pos: [3.95, 1.0, 6.475], size: [0.04, 0.08, 0.02], color: BRASS },
  { pos: [4.05, 1.0, 6.475], size: [0.04, 0.08, 0.02], color: BRASS },
  { pos: [4.55, 1.3, 6.49], size: [0.07, 0.14, 0.02], color: "#2a2620" },
  { pos: [4.55, 1.32, 6.475], size: [0.03, 0.03, 0.01], glow: true, color: "#ffc860" },
  { pos: [4.0, 2.4, 6.49], size: [0.9, 0.9, 0.02], color: "#7a3c1c" },
  // the corridor behind it, to an old door nobody uses
  { pos: [5.35, 1.04, 10.88], size: [0.96, 2.08, 0.02], color: DARK_WOOD },
  { pos: [5.35, 1.0, 10.85], size: [0.82, 2.0, 0.02], color: "#c8c0a8" },
  { pos: [5.35, 0.6, 10.85], size: [0.84, 0.05, 0.02], color: "#5a5048" },
  { pos: [5.35, 1.45, 10.85], size: [0.84, 0.05, 0.02], color: "#5a5048" },
  { pos: [4.95, 0.28, 10.7], size: [0.14, 0.5, 0.14], shape: "cyl", seg: 8, color: "#b01810" },
];

const passage: Block[] = [
  // a long green banquette under the barred window
  { pos: [-1.75, 0.22, 0.45], size: [2.9, 0.44, 0.6], tex: "pile", color: "#4a7a5a" },
  { pos: [-1.75, 0.74, 0.2], size: [2.9, 0.6, 0.14], tex: "pile", color: "#4a7a5a" },
  { pos: [-1.75, 0.74, 1.15], size: [2.4, 0.04, 0.6], color: "#6e7270" },
  { pos: [-2.85, 0.36, 1.15], size: [0.06, 0.72, 0.5], color: BLACK },
  { pos: [-0.65, 0.36, 1.15], size: [0.06, 0.72, 0.5], color: BLACK },
  { pos: [-1.4, 0.8, 1.2], size: [0.07, 0.08, 0.07], shape: "cyl", seg: 6, glow: true, color: "#ffb868" },
  ...stool(-2.4, 1.85, "#5a8a6a", 0.5),
  ...stool(-1.1, 1.85, "#5a8a6a", 0.5),
  { pos: [-1.75, 2.12, 1.1], size: [0.14, 0.26, 0.14], shape: "cyl", seg: 6, taper: 0.6, glow: true, color: LAMP },
  cord(-1.75, 1.1, 2.25),
  { pos: [-0.6, 2.62, 0.15], size: [0.32, 0.32, 0.05], color: "#d8d4c8" }, // exhaust fan
  { pos: [-0.6, 2.62, 0.18], size: [0.24, 0.24, 0.01], shape: "cyl", rot: [90, 0, 0], color: "#3a3834" },
  // the old sliding door, folded back against the wall
  { pos: [-3.22, 1.05, 3.4], size: [0.05, 2.1, 0.8], color: "#d8d0c0" },
  // paint scraped back through three lives: cream, then pink, then green
  { pos: [-2.0, 1.5, 7.06], size: [0.8, 0.62, 0.01], color: "#d8cdb2" },
  { pos: [-2.04, 1.46, 7.05], size: [0.56, 0.44, 0.01], color: "#c99a9a" },
  { pos: [-2.08, 1.42, 7.04], size: [0.32, 0.26, 0.01], color: "#7d9a84" },
  // lintel and sill of the way through to the bistro
  { pos: [-3.4, 2.6, 2.2], size: [0.24, 0.8, 1.6], tex: "cream-wall", world: true },
  { pos: [-3.4, 0.5, 5.1], size: [0.24, 1.0, 2.6], tex: "cream-wall", world: true, solid: true },
  { pos: [-3.4, 2.6, 5.1], size: [0.24, 0.8, 2.6], tex: "cream-wall", world: true },
];

const wineRoom: Block[] = [
  { pos: [-1.7, 1.3, 10.7], size: [3.2, 2.6, 0.36], tex: "wine-rack", world: true, color: "#9a9090", solid: true },
  { pos: [-3.1, 1.3, 8.9], size: [0.36, 2.6, 3.4], tex: "wine-rack", world: true, color: "#9a9090", solid: true },
  { pos: [-1.7, 0.5, 8.6], size: [1.6, 1.0, 0.55], tex: "laminate", world: true, solid: true },
  { pos: [-1.7, 1.02, 8.6], size: [1.7, 0.04, 0.65], color: "#a8683a" },
  ...stool(-2.1, 9.25, "#c03028"),
  ...stool(-1.3, 9.25, "#c03028"),
  // the vault door, standing open: the cellar was the jeweller's strongroom
  { pos: [-0.24, 1.0, 10.1], size: [0.2, 2.0, 0.9], color: "#2c2f30", solid: true },
  { pos: [-0.35, 1.05, 10.1], size: [0.03, 0.34, 0.34], shape: "cyl", rot: [0, 0, 90], seg: 8, color: "#8a7a52" },
  // its dark surround and glass doors, propped open
  { pos: [0.16, 1.2, 8.1], size: [0.08, 2.4, 0.16], color: "#24140c" },
  { pos: [0.16, 1.2, 9.7], size: [0.08, 2.4, 0.16], color: "#24140c" },
  { pos: [0.16, 2.42, 8.9], size: [0.08, 0.12, 1.76], color: "#24140c" },
  { pos: [0.15, 2.72, 8.9], size: [0.05, 0.5, 2.6], tex: "panel", color: "#5a4030" },
  { pos: [0, 2.65, 8.9], size: [0.24, 0.7, 1.4], tex: "cream-wall", world: true },
  ...([8.24, 9.56] as const).flatMap((z) => [
    { pos: [-0.36, 0.06, z], size: [0.7, 0.08, 0.04], color: "#1c140e" },
    { pos: [-0.36, 2.24, z], size: [0.7, 0.08, 0.04], color: "#1c140e" },
    { pos: [-0.69, 1.15, z], size: [0.05, 2.26, 0.04], color: "#1c140e" },
    { pos: [-0.36, 1.15, z], size: [0.62, 2.1, 0.01], color: "#a8b8c0", opacity: 0.2 },
  ] as Block[]),
];

const ringLamp: Block[] = [
  { pos: [-8.2, 2.52, 4.6], size: [4.6, 0.42, 4.6], shape: "tube", seg: 24, tex: "lampshade", rep: [6, 1], glow: 0.72 },
  { pos: [-8.2, 2.24, 4.6], size: [4.5, 0.16, 4.5], shape: "tube", seg: 24, tex: "lamp-glow", rep: [8, 1], glow: true },
  { pos: [-8.2, 2.74, 4.6], size: [4.64, 0.03, 4.64], shape: "tube", seg: 24, color: "#a8a8a0" },
  ...[0, 1, 2, 3].map((k) => cord(-8.2 + Math.cos((k * Math.PI) / 2 + 0.6) * 2.3, 4.6 + Math.sin((k * Math.PI) / 2 + 0.6) * 2.3, 2.74)),
];

/** The cluster of white enamel shades over the zinc bar. */
const barPendants: Block[] = [9.0, 9.6].flatMap((z, row) =>
  [-10.6, -9.6, -8.6, -7.6, -6.6, -5.6].flatMap((x, k) => {
    const y = 2.18 + ((k + row) % 2) * 0.14;
    return [
      { pos: [x, y, z], size: [0.36, 0.16, 0.36], shape: "cyl", seg: 8, taper: 0.3, color: "#e8e6dc" },
      { pos: [x, y - 0.085, z], size: [0.3, 0.01, 0.3], shape: "cyl", seg: 8, glow: true, color: "#fff6e4" },
      cord(x, z, y + 0.08),
    ] as Block[];
  })
);

/** Small square tables, a chair either side. `wall`: pushed against a wall, the chairs along it, to keep the aisle to the back stairs clear. */
const BISTRO_TABLES: { x: number; z: number; seat: Fabric; wall?: boolean }[] = [
  { x: -11.5, z: 2.8, seat: "green", wall: true },
  { x: -11.5, z: 5.0, seat: "red", wall: true },
  { x: -4.1, z: 4.3, seat: "green", wall: true },
  { x: -4.1, z: 6.05, seat: "red", wall: true },
  { x: -6.9, z: 1.15, seat: "red" },
  { x: -4.5, z: 1.15, seat: "green" },
];

const bistro: Block[] = [
  ...bistroGlass.flatMap((g) => frame(g, "#4a2010", Math.round(g.w / 0.9), 0, 2.2)),
  { pos: [-8.3, 1.5, 0.2], size: [0.6, 3.0, 0.4], tex: "terracotta", world: true, solid: true },
  { pos: [-8.3, 2.05, 0.43], size: [0.1, 0.16, 0.08], glow: true, color: "#ffd8a0" },
  // the way out to the back stairs: glass doors propped open, a green exit sign
  { pos: [-12.5, 2.65, 7.1], size: [0.24, 0.7, 1.8], tex: "terracotta", world: true },
  { pos: [-12.34, 2.47, 7.1], size: [0.02, 0.12, 0.34], glow: true, color: "#38c060" },
  ...([6.25, 7.95] as const).flatMap((z) => [
    { pos: [-12.5, 1.15, z], size: [0.3, 2.3, 0.06], color: "#4a2010" },
    { pos: [-12.88, 1.15, z + (z < 7 ? 0.06 : -0.06)], size: [0.7, 2.2, 0.03], color: "#4a2010" },
  ] as Block[]),
  panel([-12.35, 1.85, 5.6], 0.7, 1.1, "+x", { tex: "frosted", glow: 0.45 }),
  panel([-12.35, 1.85, 9.4], 2.2, 1.1, "+x", { tex: "frosted", glow: 0.45 }),
  // the zinc bar, a marble top, a cold light under it
  { pos: [-8.2, 0.51, 9.2], size: [6.8, 1.02, 0.7], tex: "zinc-bar", world: true, solid: true },
  { pos: [-8.2, 1.05, 9.15], size: [7.0, 0.06, 0.85], tex: "marble", world: true },
  { pos: [-8.2, 0.07, 8.84], size: [6.8, 0.03, 0.02], glow: true, color: "#b8e4ff" },
  ...[-10.6, -9.6, -8.6, -7.6, -6.6, -5.6].map((x) => ({ pos: [x, 1.081, 9.2], size: [0.2, 0.004, 0.2], shape: "cyl", seg: 8, color: "#9aa0a4" }) as Block),
  { pos: [-5.9, 1.095, 9.0], size: [0.1, 0.03, 0.1], shape: "cyl", seg: 8, color: "#e8e0d0" }, // the coasters
  { pos: [-5.76, 1.085, 9.02], size: [0.12, 0.01, 0.012], color: "#1a1a1a" },
  // the open kitchen behind
  { pos: [-8.2, 0.45, 10.7], size: [6.8, 0.9, 0.5], color: "#8a9094", solid: true },
  panel([-8.6, 1.7, 10.85], 6.0, 0.9, "-z", { tex: "kitchen-shelves", rep: [2.5, 1] }),
  { pos: [-8.6, 1.26, 10.75], size: [6.0, 0.03, 0.26], color: "#a8b0b4" },
  { pos: [-8.6, 2.16, 10.75], size: [6.0, 0.03, 0.26], color: "#a8b0b4" },
  { pos: [-5.15, 0.95, 10.65], size: [0.7, 1.9, 0.5], color: "#1a2430", solid: true },
  panel([-5.15, 1.0, 10.38], 0.6, 1.7, "-z", { tex: "bottles", glow: 0.7, color: "#a8c8f0" }),
  ...barPendants,
  { pos: [-4.4, 1.5, 8.5], size: [0.44, 3.0, 0.44], tex: "terracotta", world: true, solid: true },
  // the round rug and the great ring of roses over it
  { pos: [-8.2, 0.006, 4.6], size: [5.4, 0.012, 5.4], shape: "cyl", seg: 24, tex: "rug" },
  ...ringLamp,
  // a long table with benches on the rug
  { pos: [-8.2, 0.75, 4.6], size: [2.2, 0.05, 0.8], color: "#4a2414" },
  ...[[-9.2, 4.3], [-7.2, 4.3], [-9.2, 4.9], [-7.2, 4.9]].map(([x, z]) => ({ pos: [x, 0.37, z], size: [0.07, 0.72, 0.07], color: "#3a1c10" }) as Block),
  { pos: [-8.2, 0.44, 3.95], size: [2.0, 0.06, 0.34], color: "#5a2c16" },
  { pos: [-8.2, 0.44, 5.25], size: [2.0, 0.06, 0.34], color: "#5a2c16" },
  ...[[-9.1, 3.95], [-7.3, 3.95], [-9.1, 5.25], [-7.3, 5.25]].map(([x, z]) => ({ pos: [x, 0.21, z], size: [0.06, 0.42, 0.28], color: "#3a1c10" }) as Block),
  { pos: [-8.7, 0.8, 4.6], size: [0.07, 0.08, 0.07], shape: "cyl", seg: 6, glow: true, color: "#ffb868" },
  { pos: [-7.7, 0.8, 4.6], size: [0.07, 0.08, 0.07], shape: "cyl", seg: 6, glow: true, color: "#ffb868" },
  // small square tables, red velvet and green seats
  ...BISTRO_TABLES.flatMap(({ x, z, seat, wall }) => [
    ...bistroTable(x, z),
    ...(wall
      ? [...chair(x, z - 0.55, 0, FABRIC[seat], "#7a4020"), ...chair(x, z + 0.55, 180, FABRIC[seat], "#7a4020")]
      : [...chair(x - 0.55, z, 90, FABRIC[seat], "#7a4020"), ...chair(x + 0.55, z, -90, FABRIC[seat], "#7a4020")]),
  ]),
  // six stools at the bar; the fourth one wobbles
  ...[-10.6, -9.5, -8.4, -7.3, -6.2, -5.2].flatMap((x, k) => stool(x, 8.35, k % 2 ? "#2a2626" : "#c03028")),
  // the white hutch, and a painting in an old carved panel
  { pos: [-3.7, 1.1, 7.3], size: [0.34, 2.2, 0.8], color: "#d8d4c8", solid: true },
  panel([-3.89, 1.1, 7.3], 0.76, 2.1, "-x", { tex: "hutch" }),
  panel([-3.55, 1.72, 9.3], 2.2, 0.92, "-x", { tex: "carved-panel" }),
  { pos: [-3.55, 0.64, 9.3], size: [0.04, 1.24, 2.2], tex: "panel", color: "#6a4838" },
];

const backLanding: Block[] = [
  // a bench with black cushions, white leaves stitched on them
  { pos: [-15.7, 0.22, 7.2], size: [0.42, 0.44, 2.4], color: "#c8a070" },
  { pos: [-15.7, 0.455, 7.2], size: [0.46, 0.03, 2.44], color: "#1a1a1a" },
  ...[6.05, 6.85, 7.6, 8.35].map((z) => ({ pos: [-15.93, 0.75, z], size: [0.05, 0.6, 0.05], color: "#c8a070" }) as Block),
  ...[6.45, 7.2, 7.95].map((z) => panel([-15.86, 0.84, z], 0.62, 0.24, "+x", { tex: "embroidery", size: [0.62, 0.24, 0.06] })),
  panel([-15.85, 1.85, 7.2], 2.6, 1.3, "+x", { tex: "frosted", glow: 0.5 }),
  ...[5.9, 6.77, 7.63, 8.5].map((z) => ({ pos: [-15.85, 1.85, z], size: [0.06, 1.38, 0.06], color: "#4a2010" }) as Block),
  { pos: [-15.85, 2.53, 7.2], size: [0.06, 0.06, 2.7], color: "#4a2010" },
  { pos: [-15.85, 1.17, 7.2], size: [0.1, 0.05, 2.7], color: "#4a2010" },
  // the electrics, conduits down the wall
  { pos: [-15.0, 1.7, 10.78], size: [1.4, 1.5, 0.18], color: "#b8bcb4" },
  panel([-15.0, 1.7, 10.67], 1.4, 1.5, "-z", { tex: "electrical" }),
  ...[-15.5, -15.3, -14.7, -14.5].map((x) => ({ pos: [x, 0.47, 10.84], size: [0.04, 0.94, 0.04], color: "#8a9090" }) as Block),
  // a standing fan and a little table with a plant
  { pos: [-14.4, 0.6, 10.3], size: [0.04, 1.2, 0.04], color: BLACK },
  { pos: [-14.4, 0.02, 10.3], size: [0.5, 0.04, 0.5], color: BLACK },
  { pos: [-14.4, 1.25, 10.22], size: [0.42, 0.14, 0.42], shape: "cyl", rot: [90, 0, 0], seg: 10, color: "#2a2a2a" },
  { pos: [-15.4, 0.62, 9.8], size: [0.5, 0.03, 0.5], shape: "cyl", seg: 10, color: "#4a2414" },
  { pos: [-15.4, 0.31, 9.8], size: [0.05, 0.6, 0.05], color: "#3a1c10" },
  { pos: [-15.25, 0.75, 9.92], size: [0.14, 0.24, 0.14], shape: "cyl", seg: 8, color: "#d8d0b8" },
  // the back stairs: concrete, painted treads, a black steel rail, up through the ceiling
  ...stairs({ axis: "z", at: 8.6, dir: 1, across: [-13.55, -12.62], steps: 12, rise: 0.25, run: 0.2, tread: "#2a2826", under: "#7a766e", nosing: "#6a6a68" }),
  ...rail([-13.55, 8.6], [-13.55, 11.0], "steel", 0.25, 3.0),
  // the queue for the cinema starts here
  ...[8.4, 9.5].flatMap((z) => [
    { pos: [-13.9, 0.48, z], size: [0.06, 0.95, 0.06], shape: "cyl", seg: 6, color: "#c8ccd0" },
    { pos: [-13.9, 0.015, z], size: [0.3, 0.03, 0.3], shape: "cyl", seg: 8, color: "#c8ccd0" },
  ] as Block[]),
  { pos: [-13.9, 0.86, 8.95], size: [0.02, 0.04, 1.08], color: "#2a3a9a" },
];

const barSolids: Box[] = [
  { x1: 2.1, x2: 3.1, z1: 2.2, z2: 3.2 }, // round table
  { x1: 0.25, x2: 1.6, z1: 7.55, z2: 10.7 }, // the stairwell
  { x1: -3.25, x2: -0.25, z1: 0.1, z2: 0.78 }, // banquette
  { x1: -2.95, x2: -0.55, z1: 0.85, z2: 1.45 }, // its table
  { x1: -9.3, x2: -7.1, z1: 3.75, z2: 5.45 }, // long table and benches
  ...BISTRO_TABLES.map(({ x, z, wall }) => (wall ? { x1: x - 0.32, x2: x + 0.32, z1: z - 0.8, z2: z + 0.8 } : { x1: x - 0.8, x2: x + 0.8, z1: z - 0.32, z2: z + 0.32 })),
  ...[-10.6, -9.5, -8.4, -7.3, -6.2, -5.2].map((x) => ({ x1: x - 0.17, x2: x + 0.17, z1: 8.18, z2: 8.52 })),
  { x1: -15.95, x2: -15.45, z1: 5.95, z2: 8.45 }, // bench
  { x1: -15.7, x2: -14.15, z1: 9.5, z2: 10.9 }, // fan, little table
  { x1: -13.62, x2: -12.55, z1: 8.55, z2: 11 }, // back stairs
  { x1: -13.98, x2: -13.82, z1: 8.33, z2: 9.57 }, // queue rope
  { x1: -2.3, x2: -1.1, z1: 9.08, z2: 9.42 }, // wine room stools
];

// ======================================================================
// 3F · THE CINEMA
// ======================================================================

const cinemaWalls: Seg[] = [
  { x1: C(3.6), z1: 0, x2: C(15), z2: 0, tex: "foyer-wall" },
  { x1: C(3.6), z1: 0, x2: C(3.6), z2: 4.6, tex: "foyer-wall", back: "cream-wall" },
  { x1: C(3.6), z1: 6.0, x2: C(3.6), z2: 11, tex: "foyer-wall", back: "cream-wall" },
  // the landing at the top of the back stairs
  { x1: C(0), z1: 3.6, x2: C(3.6), z2: 3.6, tex: "cream-wall" },
  { x1: C(0), z1: 3.6, x2: C(0), z2: 11, tex: "cream-wall" },
  { x1: C(0), z1: 11, x2: C(3.6), z2: 11, tex: "cream-wall" },
  // the foyer's back, and the passage to the toilets
  { x1: C(3.6), z1: 8.4, x2: C(4.4), z2: 8.4, tex: "foyer-wall" },
  { x1: C(5.6), z1: 8.4, x2: C(7.8), z2: 8.4, tex: "foyer-wall" },
  { x1: C(4.4), z1: 8.4, x2: C(4.4), z2: 11, tex: "foyer-wall" },
  { x1: C(5.6), z1: 8.4, x2: C(5.6), z2: 11, tex: "foyer-wall" },
  { x1: C(4.4), z1: 11, x2: C(5.6), z2: 11, tex: "foyer-wall" },
  // the cinema is a box inside the top floor: zinc outside, velvet in
  { x1: C(7.8), z1: 1.4, x2: C(13.4), z2: 1.4, tex: "velvet-drape", back: "zinc" },
  { x1: C(14.6), z1: 1.4, x2: C(15), z2: 1.4, tex: "velvet-drape", back: "zinc" },
  { x1: C(7.8), z1: 1.4, x2: C(7.8), z2: 6.4, tex: "velvet-drape", back: "zinc" },
  { x1: C(7.8), z1: 6.4, x2: C(7.8), z2: 8.4, tex: "velvet-drape", back: "red-wall" },
  { x1: C(7.8), z1: 8.4, x2: C(7.8), z2: 11, tex: "velvet-drape", back: "foyer-wall" },
  { x1: C(7.8), z1: 11, x2: C(15), z2: 11, tex: "velvet-drape" },
  { x1: C(15), z1: 0, x2: C(15), z2: 1.4, tex: "foyer-wall" },
  { x1: C(15), z1: 1.4, x2: C(15), z2: 11, tex: "velvet-drape" },
];

const corridorGlass: StreetWindow[] = [
  { x: C(5.7), z: 0.16, y: 1.95, w: 3.6, h: 1.3, face: [0, 1] },
  { x: C(9.3), z: 0.16, y: 1.95, w: 3.6, h: 1.3, face: [0, 1], light: [C(9.3), 2.0, 0.8] },
  { x: C(12.9), z: 0.16, y: 1.95, w: 3.6, h: 1.3, face: [0, 1] },
];
const landingGlass: StreetWindow[] = [{ x: C(0.16), z: 5.7, y: 2.0, w: 2.6, h: 1.1, face: [1, 0], light: [C(0.9), 2.0, 5.7] }];

const landing: Block[] = [
  // the back stairs coming up, a black steel rail round the well
  ...stairs({ axis: "z", at: 8.0, dir: 1, across: [1.02, 2.18].map(C) as [number, number], steps: 10, rise: -0.22, run: 0.26, tread: "#2a2826", under: "#5a5650", nosing: "#6a6a68" }),
  { pos: [C(0.97), -1.5, 9.4], size: [0.1, 3.0, 2.9], color: "#2e2c2a" },
  { pos: [C(2.23), -1.5, 9.4], size: [0.1, 3.0, 2.9], color: "#2e2c2a" },
  { pos: [C(1.6), -1.5, 10.85], size: [1.36, 3.0, 0.1], color: "#2e2c2a" },
  { pos: [C(1.6), -3.0, 9.4], size: [1.36, 0.05, 2.9], color: "#000000", glow: true },
  ...rail([C(1.0), 8.0], [C(1.0), 10.8], "steel"),
  ...rail([C(2.2), 8.0], [C(2.2), 10.8], "steel"),
  ...rail([C(1.0), 10.8], [C(2.2), 10.8], "steel"),
  // a print of a low sun over the stairwell, a little chandelier above it
  panel([C(1.6), 1.9, 10.85], 0.8, 1.2, "-z", { tex: "sun-print" }),
  ...chandelier(C(1.6), 2.68, 10.15),
  // two chairs for whoever is waiting to go in
  ...piece(C(1.2), 4.15, 0, [
    { pos: [0, 0.45, 0], size: [0.5, 0.08, 0.48], color: "#d8d0c0" },
    { pos: [0, 0.8, -0.22], size: [0.46, 0.62, 0.06], rot: [-8, 0, 0], color: "#d8d0c0" },
    ...[-0.25, 0.25].flatMap((x) => [
      { pos: [x, 0.62, 0], size: [0.04, 0.04, 0.5], color: TEAK },
      { pos: [x, 0.3, 0.2], size: [0.04, 0.6, 0.04], color: TEAK },
      { pos: [x, 0.3, -0.2], size: [0.04, 0.6, 0.04], color: TEAK },
    ] as Block[]),
  ]),
  ...lounge(C(2.2), 4.2, 0, "mauve"),
  ...sideTable(C(3.0), 4.0),
  ...landingGlass.flatMap((g) => frame(g, TEAK, 3)),
  panel([C(0.15), 0.95, 5.7], 2.6, 0.9, "+x", { tex: "frosted", glow: 0.35 }),
  // the arched teak doors into the foyer, folded back
  { pos: [C(3.13), 1.17, 4.66], size: [0.7, 2.34, 0.05], tex: "arch-door", solid: true },
  { pos: [C(3.13), 1.17, 5.94], size: [0.7, 2.34, 0.05], rot: 180, tex: "arch-door", solid: true },
  { pos: [C(3.6), 2.67, 5.3], size: [0.24, 0.66, 1.4], tex: "foyer-wall", world: true },
];

const foyer: Block[] = [
  panel([C(3.75), 1.65, 2.2], 1.2, 0.9, "+x", { tex: "palm-painting" }),
  panel([C(3.75), 1.7, 7.2], 0.5, 0.72, "+x", { tex: "dark-painting" }),
  panel([C(7.65), 1.0, 7.4], 0.86, 2.0, "-x", { tex: "control-door" }),
  panel([C(5.0), 1.05, 10.85], 1.0, 2.1, "-z", { tex: "grille" }),
  { pos: [C(5.0), 2.42, 9.8], size: [0.12, 0.22, 0.12], shape: "cyl", seg: 6, glow: true, color: "#f4f0e8" },
  cord(C(5.0), 9.8, 2.53),
  { pos: [C(5.62), 1.6, 8.9], size: [0.02, 0.1, 0.36], color: "#c8b088" }, // TOILETS →
  // light strips between the rows of zinc panels
  ...[0.62, 1.24, 1.86, 2.48].flatMap((y) => [
    { pos: [C(10.6), y, 1.25], size: [5.6, 0.012, 0.01], glow: 0.55, color: "#fff2dc" },
    { pos: [C(14.8), y, 1.25], size: [0.4, 0.012, 0.01], glow: 0.55, color: "#fff2dc" },
    { pos: [C(7.65), y, 3.9], size: [0.01, 0.012, 5.0], glow: 0.55, color: "#fff2dc" },
  ] as Block[]),
  { pos: [C(14.0), 2.65, 1.4], size: [1.2, 0.7, 0.24], tex: "zinc", world: true },
  // windows over Decho Road: clear above, white panels below
  ...corridorGlass.flatMap((g) => frame(g, TEAK, 3, 0)),
  panel([C(9.2), 0.62, 0.15], 10.8, 0.8, "+z", { tex: "frosted", glow: 0.3 }),
  ...[3.8, 5.0, 6.2, 7.4, 8.6, 9.8, 11.0, 12.2, 13.4, 14.6].map((x) => ({ pos: [C(x), 0.62, 0.17], size: [0.06, 0.84, 0.06], color: TEAK }) as Block),
  { pos: [C(9.2), 1.08, 0.17], size: [10.9, 0.06, 0.07], color: TEAK },
  { pos: [C(9.2), 0.18, 0.17], size: [10.9, 0.06, 0.07], color: TEAK },
  // the way in: velvet drawn back from the gap
  { pos: [C(13.52), 1.3, 1.44], size: [0.28, 2.6, 0.14], tex: "velvet-drape", world: true },
  { pos: [C(14.48), 1.3, 1.44], size: [0.28, 2.6, 0.14], tex: "velvet-drape", world: true },
];

/** Five rows facing the screen, the back two on risers: three chairs, an aisle, a loveseat for two. */
const ROWS: { z: number; y: number; left: Fabric[] }[] = [
  { z: 8.9, y: 0, left: ["green", "damask", "blue"] },
  { z: 7.5, y: 0, left: ["blue", "green", "green"] },
  { z: 6.1, y: 0, left: ["damask", "green", "blue"] },
  { z: 4.6, y: 0.22, left: ["green", "red", "damask"] },
  { z: 3.2, y: 0.44, left: ["blue", "green", "damask"] },
];
const SEAT_X = [8.5, 9.6, 10.7].map(C);
const LOVESEAT_X = C(12.55);

const hall: Block[] = [
  { pos: [C(11.4), 1.72, 10.86], size: [4.5, 2.4, 0.01], color: "#050505" },
  // the projector, hung from the ceiling over the back rows
  { pos: [C(11.4), 2.8, 2.95], size: [0.38, 0.16, 0.42], color: "#1a1a1a" },
  { pos: [C(11.4), 2.92, 2.95], size: [0.04, 0.16, 0.04], color: "#1a1a1a" },
  { pos: [C(11.4), 2.78, 3.17], size: [0.07, 0.07, 0.01], glow: true, color: "#e8ecff" },
  // swagged velvet along the top of every wall
  ...[3.0, 5.6, 8.2].flatMap((z) => [
    panel([C(7.95), 2.45, z], 2.4, 1.1, "+x", { tex: "swag" }),
    panel([C(14.85), 2.45, z], 2.4, 1.1, "-x", { tex: "swag" }),
  ]),
  panel([C(9.6), 2.45, 1.55], 2.4, 1.1, "+z", { tex: "swag" }),
  panel([C(11.9), 2.45, 1.55], 2.2, 1.1, "+z", { tex: "swag" }),
  panel([C(8.55), 2.45, 10.85], 1.5, 1.1, "-z", { tex: "swag" }),
  panel([C(14.25), 2.45, 10.85], 1.5, 1.1, "-z", { tex: "swag" }),
  // cove light washing down the drapes
  { pos: [C(7.93), 2.96, 6.2], size: [0.02, 0.03, 9.4], glow: true, color: "#ffd9a8" },
  { pos: [C(14.87), 2.96, 6.2], size: [0.02, 0.03, 9.4], glow: true, color: "#ffd9a8" },
  { pos: [C(11.4), 2.96, 1.53], size: [7.0, 0.03, 0.02], glow: true, color: "#ffd9a8" },
  // risers for the back rows, a light wooden rail behind the last
  { pos: [C(10.7), 0.22, 3.2], size: [5.6, 0.44, 1.4], tex: "carpet-dark", world: true, color: "#8a8288" },
  { pos: [C(10.7), 0.11, 4.6], size: [5.6, 0.22, 1.4], tex: "carpet-dark", world: true, color: "#8a8288" },
  { pos: [C(10.7), 0.92, 2.47], size: [5.6, 0.05, 0.05], color: "#c8a070" },
  ...[8.0, 9.4, 10.8, 12.2, 13.4].map((x) => ({ pos: [C(x), 0.67, 2.47], size: [0.05, 0.46, 0.05], color: "#c8a070" }) as Block),
  ...ROWS.flatMap((r) => [
    ...r.left.flatMap((f, k) => lounge(SEAT_X[k], r.z, 0, f, r.y)),
    ...lounge(LOVESEAT_X, r.z, 0, "red", r.y, true),
    ...sideTable(C(9.05), r.z + 0.35, r.y),
    ...sideTable(C(10.15), r.z + 0.35, r.y, false),
    ...sideTable(C(13.48), r.z + 0.2, r.y),
  ]),
];

const cinemaSolids: Box[] = [
  { x1: C(7.9), x2: C(13.5), z1: 2.45, z2: 5.3 }, // risers and the rows on them
  ...ROWS.filter((r) => !r.y).flatMap((r) => [
    { x1: C(8.08), x2: C(11.12), z1: r.z - 0.42, z2: r.z + 0.56 },
    { x1: C(11.86), x2: C(13.72), z1: r.z - 0.42, z2: r.z + 0.42 },
  ]),
  { x1: C(0.95), x2: C(2.25), z1: 7.95, z2: 10.85 }, // stairwell
  { x1: C(0.9), x2: C(3.25), z1: 3.7, z2: 4.5 }, // chairs on the landing
];

// ======================================================================

export const walls: Seg[] = [...lobbyWalls, ...barWalls, ...cinemaWalls];

export type Floor = Box & { tex: Tex; color?: string };
export const floors: Floor[] = [
  { ...FLOOR_BOUNDS.lobby, tex: "parquet", color: "#a08e88" },
  // bookshop and stair hall, around the stairwell
  { x1: 0, x2: 6, z1: 0, z2: 7.6, tex: "parquet", color: "#a89088" },
  { x1: 0, x2: 0.3, z1: 7.6, z2: 11, tex: "parquet", color: "#a89088" },
  { x1: 1.5, x2: 6, z1: 7.6, z2: 11, tex: "parquet", color: "#a89088" },
  { x1: 0.3, x2: 1.5, z1: 10.6, z2: 11, tex: "parquet", color: "#a89088" },
  { x1: -3.4, x2: 0, z1: 0, z2: 7.2, tex: "parquet", color: "#a89088" },
  { x1: -3.4, x2: 0, z1: 7.2, z2: 11, tex: "parquet", color: "#d8b090" },
  { x1: -12.5, x2: -3.4, z1: 0, z2: 11, tex: "concrete", color: "#c8bcb0" },
  { x1: -16, x2: -12.5, z1: 4.6, z2: 11, tex: "concrete", color: "#c0b8b0" },
  // the cinema floor: landing round its stairwell, foyer, corridor, the hall
  { x1: C(0), x2: C(3.6), z1: 3.6, z2: 8.0, tex: "concrete", color: "#c0b8b0" },
  { x1: C(0), x2: C(1.0), z1: 8.0, z2: 11, tex: "concrete", color: "#c0b8b0" },
  { x1: C(2.2), x2: C(3.6), z1: 8.0, z2: 11, tex: "concrete", color: "#c0b8b0" },
  { x1: C(1.0), x2: C(2.2), z1: 10.8, z2: 11, tex: "concrete", color: "#c0b8b0" },
  { x1: C(3.6), x2: C(7.8), z1: 0, z2: 8.4, tex: "concrete", color: "#d8a880" },
  { x1: C(4.4), x2: C(5.6), z1: 8.4, z2: 11, tex: "concrete", color: "#d8a880" },
  { x1: C(7.8), x2: C(15), z1: 0, z2: 1.4, tex: "concrete", color: "#d8a880" },
  { x1: C(7.8), x2: C(15), z1: 1.4, z2: 11, tex: "carpet-dark", color: "#8a8288" },
];

export type Ceiling = Box & { color?: string };
export const ceilings: Ceiling[] = [
  // the way in: open over the top of the stairs
  { x1: L(-4), x2: L(4), z1: 0, z2: 7.9 },
  { x1: L(-4), x2: L(-2.6), z1: 7.9, z2: 9 },
  { x1: L(0.2), x2: L(4), z1: 7.9, z2: 9 },
  { x1: 0, x2: 6, z1: 0, z2: 11 },
  { x1: -3.4, x2: 0, z1: 0, z2: 11 },
  { x1: -12.5, x2: -3.4, z1: 0, z2: 11, color: "#6a4a40" },
  { x1: -16, x2: -12.5, z1: 4.6, z2: 10.2 },
  { x1: -16, x2: -13.62, z1: 10.2, z2: 11 },
  { x1: -12.55, x2: -12.5, z1: 10.2, z2: 11 },
  { x1: C(0), x2: C(7.8), z1: 0, z2: 11 },
  { x1: C(7.8), x2: C(15), z1: 0, z2: 1.4 },
  { x1: C(7.8), x2: C(15), z1: 1.4, z2: 11, color: "#161214" },
];

/** Black wells over stairs that leave through the ceiling. */
const shafts: Block[] = [
  { pos: [L(-1.2), 3.6, 8.45], size: [2.8, 1.2, 1.1], color: "#000000", glow: true },
  { pos: [-13.08, 3.6, 10.6], size: [0.93, 1.2, 0.8], color: "#000000", glow: true },
];

export const blocks: Block[] = [
  ...lobbyBlocks,
  ...bookshop, ...stairHall, ...passage, ...wineRoom, ...bistro, ...backLanding,
  ...landing, ...foyer, ...hall,
  ...shafts,
];

/** Collision for pieces made of many parts (single solid blocks register themselves). */
export const solids: Box[] = [...lobbySolids, ...barSolids, ...cinemaSolids];

export const WINDOWS: StreetWindow[] = [...lobbyGlass, ...bookshopGlass, ...bistroGlass, ...corridorGlass, ...landingGlass];

export type Door = {
  id: string;
  /** where you stand to use it */
  x: number;
  z: number;
  label: string;
  /** teleport target on the other side (another floor) */
  to?: { x: number; z: number; yaw: number };
  exit?: boolean;
};
export const doors: Door[] = [
  { id: "street", x: L(0), z: 0.78, label: "▶ OUT TO DECHO ROAD", exit: true },
  { id: "up-1", x: L(2.2), z: 8.4, label: "▲ UPSTAIRS · BOOKSHOP AND BISTRO", to: { x: 1.2, z: 6.85, yaw: Math.PI } },
  { id: "down-2", x: 0.9, z: 7.15, label: "▼ DOWNSTAIRS · THE WAY OUT", to: { x: L(2.3), z: 7.45, yaw: Math.PI } },
  { id: "up-2", x: -13.1, z: 8.1, label: "▲ UP THE BACK STAIRS · THE CINEMA", to: { x: C(1.7), z: 6.6, yaw: Math.PI / 2 } },
  { id: "down-3", x: C(1.6), z: 7.55, label: "▼ DOWNSTAIRS · THE BISTRO", to: { x: -13.3, z: 7.3, yaw: Math.PI / 2 } },
];

export type Prop = {
  model: string;
  pos: [number, number, number];
  rot?: number; // degrees around Y
  scale?: number;
  solid?: Box | "auto";
  id?: string;
};

export const props: Prop[] = [
  { model: "pottedPlant", pos: [L(-3.3), 0, 0.75], scale: 2.6, solid: "auto" }, // elephant ears by the door
  { model: "pottedPlant", pos: [L(-3.4), 0, 6.5], scale: 2.2, solid: "auto" },
  { model: "candle", pos: [L(3.78), 2.03, 1.15], scale: 1.2 }, // on the spirit shelf
  { model: "pottedPlant", pos: [3.0, 0.98, 0.42], scale: 0.8 }, // on the bookshop shelf
  { model: "cardboardBoxOpen", pos: [-0.5, 0, 7.6], scale: 1.6, solid: "auto" },
  { model: "pottedPlant", pos: [-12.0, 0, 6.02], scale: 2.8, solid: "auto" },
  { model: "pottedPlant", pos: [-15.4, 0.64, 9.75], scale: 0.9 },
  { model: "pottedPlant", pos: [C(4.3), 0, 1.0], scale: 3.0, solid: "auto" }, // the old glazed pot in the foyer
  { model: "detail-chalice", pos: [C(11.55), 0, 7.0], scale: 1.1 }, // a glass someone left
];

export const SCREEN = { x: C(11.4), y: 1.72, z: 10.83, w: 4.2, h: 2.1 };
export const PROJECTOR = { x: C(11.4), y: 2.78, z: 3.17 };
/** Where the lightning's two glasses stand: on the bar, before the fourth stool. */
export const BAR_GLASSES = { x: -7.3, y: 1.08, z: 9.0 };

export type Interactable = {
  id: string;
  pos: [number, number];
  radius?: number;
  text?: string[];
  /** memory this object brings back to the ghost when examined (on the same floor) */
  memory?: string;
};
export const interactables: Interactable[] = [
  // ---- 1F
  { id: "shelf", pos: [L(3.3), 1.3], radius: 0.6, text: ["A small shelf high on the wall by the door. A candle, a garland, a glass of red soda with a straw.", "Someone keeps replacing the jasmine. Nobody on the staff will say who."], memory: "bar-offering" },
  { id: "noticeboard", pos: [L(3.2), 3.4], radius: 0.8, text: ["Film posters pinned to cork under a strip of light. Tonight's, and next week's.", "Under the edges there are older ones, pinned over and over. Some corners are soft with years."], memory: "lob-posters" },
  { id: "lobby-screen", pos: [L(3.3), 4.75], radius: 0.55, text: ["A tall screen set into the wooden column. A poem scrolls up it, very slowly.", "When it reaches the end it starts again, as if someone might have missed a line."], memory: "lob-screen" },
  { id: "lobby-lift", pos: [L(2.05), 6.15], radius: 0.55, text: ["A narrow door in the wooden column, a brass handle.", "Behind it, a shaft no wider than a shoebox, going up into the dark. A draught comes down it, smelling of wine."], memory: "lob-lift" },
  { id: "folding", pos: [L(-3.3), 2.7], radius: 0.9, text: ["Tall doors with frosted glass, folded shut. The old shopfront.", "Through the frosting, the shape of a counter. Someone behind it, waiting for the door."], memory: "lob-shopfront" },
  { id: "baluster", pos: [L(0.6), 7.45], radius: 0.6, text: ["Turned posts, dark with hands. The rail is worn pale where people steady themselves.", "Fourteen steps. Halfway up, one is softer than the others."], memory: "lob-stair" },
  { id: "staff-door", pos: [L(-3.1), 8.25], radius: 0.6, text: ["A door of dark boards. STAFF ONLY, in red.", "The paint is lighter in a line at knee height, all along the wall. Water came up this far once."], memory: "lob-rain" },
  // ---- 2F
  { id: "books", pos: [2.4, 1.05], radius: 0.8, text: ["Books laid face up under the windows, each with a small handwritten card.", "One card is in a hand you almost recognise. It says: for whoever finds this."], memory: "bar-books" },
  { id: "round-table", pos: [2.6, 3.65], radius: 0.6, text: ["A round table, older than anything else in the room. Rings from a thousand glasses.", "Two chairs drawn up close. A third pushed back, as if someone left in a hurry."], memory: "bar-table" },
  { id: "lift", pos: [4.0, 6.0], radius: 0.6, text: ["A small double hatch in the wooden column, brass handles, a button beside it.", "A tiny lift for diamonds. A dried rose inside, and a folded note nobody has opened."], memory: "bar-lift" },
  { id: "curtain", pos: [2.5, 10.35], radius: 0.8, text: ["Sheer curtains, floor to ceiling, over a window you can't see.", "They move a little, though every window is shut."], memory: "bar-curtain" },
  { id: "sofa", pos: [-1.75, 1.95], radius: 0.7, text: ["A long green banquette under the barred window, sunk in the middle.", "Something small is tucked between the cushions. A party whistle, still damp."], memory: "bar-sofa" },
  { id: "paint", pos: [-2.0, 6.65], radius: 0.6, text: ["Someone scraped the wall back and left it.", "Cream, then pink, then green. Three lives, buried one on top of the other."], memory: "bar-paint" },
  { id: "bottles", pos: [-2.3, 10.05], radius: 0.8, text: ["Racks of bottles to the ceiling, necks out, cold to the touch.", "Some of the labels are older than the building feels."], memory: "bar-bottles" },
  { id: "vault", pos: [-0.75, 10.0], radius: 0.6, text: ["A steel door with a wheel, standing open. The jeweller's vault.", "Cold on the other side. The best bottles sleep in here, waiting for an occasion that keeps not coming."], memory: "bar-vault" },
  { id: "coasters", pos: [-5.9, 8.35], radius: 0.7 }, // handled by script (leave a memory)
  { id: "stools", pos: [-7.3, 7.85], radius: 0.7, text: ["Six stools at the zinc bar, red velvet and black. The fourth one wobbles.", "It rocks once more after you look away."], memory: "bar-stool" },
  { id: "red-chair", pos: [-10.9, 5.0], radius: 0.7, text: ["Red velvet chairs either side of a small table, worn pale where the elbows rest.", "One seat is still warm. Nobody has sat in it all night."], memory: "bar-red-chair" },
  { id: "roses", pos: [-8.2, 3.2], radius: 0.8, text: ["A great ring of pleated cloth hangs over the room, printed with red roses.", "It sways very slightly, as if the room were breathing."], memory: "bar-roses" },
  { id: "window", pos: [-6.0, 0.95], radius: 0.7, text: ["Rain runs down the glass in long threads. Decho Road is a smear of lights below.", "When the lightning comes, for a moment there seems to be someone standing very close to the window. Two someones."], memory: "bar-storm" },
  { id: "bench", pos: [-15.15, 7.2], radius: 0.8, text: ["A long bench under a frosted window, three black cushions stitched with white leaves.", "A seat for waiting to be called. Whoever sits here faces the door."], memory: "bar-green-chair" },
  // ---- 3F
  { id: "sun-print", pos: [C(2.9), 9.6], radius: 0.6, text: ["A print of a low orange sun, hung over the stairwell where no window could fit.", "It is the only warm thing on the landing. It doesn't move when you do."], memory: "cin-sun" },
  { id: "grille", pos: [C(5.0), 10.3], radius: 0.65, text: ["An old steel gate at the end of the passage, padlocked. TOILETS, says the sign, pointing at it.", "Beyond the bars, a small room nobody has opened in years. A safe, its door ajar."], memory: "cin-gate" },
  { id: "booth", pos: [C(7.25), 7.4], radius: 0.8, text: ["A wooden door marked CONTROL ROOM, on a wall painted red.", "Behind it the projector hums softly, like someone keeping watch over a bed."], memory: "cin-booth" },
  { id: "zinc", pos: [C(8.8), 0.75], radius: 0.8, text: ["A wall of dull metal panels, a strip of light under each.", "Your reflection in them is late, by a little."], memory: "cin-wall" },
  { id: "cin-window", pos: [C(10.9), 0.7], radius: 0.8, text: ["Tall windows over Decho Road. The street below is a smear of wet light.", "Every flash of lightning shows the same empty seat reflected in the glass. Row C."], memory: "cin-storm" },
  { id: "cin-curtain", pos: [C(14.0), 0.75], radius: 0.7, text: ["Heavy velvet, olive in this light, drawn back from the way in.", "It smells of old perfume, the kind someone wore on a first date, years ago."], memory: "cin-curtain" },
  { id: "row-c", pos: [C(11.5), 6.1], radius: 0.6, text: ["Row C. A red velvet loveseat, room for two.", "The velvet is worn soft where two shoulders touched."], memory: "cin-row" },
  { id: "glass", pos: [C(11.55), 7.05], radius: 0.5, text: ["A wine glass on the carpet by the aisle.", "Half full. A faint print of lipstick on the rim. The wine is still cold."], memory: "cin-glass" },
  { id: "screen", pos: [C(11.4), 9.95], radius: 1.3, text: ["The film keeps running, just for whoever is here.", "Someone turns in a doorway and smiles. Again, and again."], memory: "cin-screen" },
];

export type CamZone = Box & { id: string; pos: [number, number, number]; look: [number, number, number]; fov?: number };
/** Fixed cameras, most of them where the photographs were taken from. */
export const cameras: CamZone[] = [
  // ---- 1F
  { id: "lobby-door", x1: L(-4), x2: L(4), z1: -1, z2: 4.6, pos: [L(1.7), 2.7, 7.25], look: [L(-0.7), 0.9, 0.4], fov: 60 },
  { id: "lobby-stair", x1: L(-4), x2: L(4), z1: 4.6, z2: 9, pos: [L(-3.3), 2.7, 1.1], look: [L(1.2), 1.1, 7.6], fov: 58 },
  // ---- 2F
  { id: "bookshop", x1: 0, x2: 6, z1: -1, z2: 6.2, pos: [0.7, 2.7, 5.9], look: [4.2, 0.9, 0.7], fov: 60 },
  { id: "stair-hall", x1: 0, x2: 6, z1: 6.2, z2: 11, pos: [1.5, 2.75, 3.9], look: [3.4, 0.9, 10.0], fov: 60 },
  { id: "passage", x1: -3.4, x2: 0, z1: -1, z2: 7.2, pos: [-0.3, 2.7, 6.9], look: [-2.4, 0.8, 0.8], fov: 60 },
  { id: "wine-room", x1: -3.4, x2: 0, z1: 7.2, z2: 11, pos: [-2.7, 2.65, 7.45], look: [-0.6, 0.9, 10.3], fov: 64 },
  { id: "bistro-front", x1: -12.5, x2: -3.4, z1: -1, z2: 5.4, pos: [-11.9, 2.8, 10.2], look: [-5.4, 0.8, 1.6], fov: 58 },
  { id: "bistro-bar", x1: -12.5, x2: -3.4, z1: 5.4, z2: 11, pos: [-12.0, 2.75, 0.6], look: [-7.8, 1.0, 9.6], fov: 58 },
  { id: "back-landing", x1: -16, x2: -12.5, z1: 4.6, z2: 11, pos: [-15.7, 2.7, 4.95], look: [-12.9, 1.0, 9.8], fov: 62 },
  // ---- 3F
  { id: "landing", x1: C(0), x2: C(3.6), z1: 3.6, z2: 11, pos: [C(0.45), 2.75, 3.95], look: [C(2.4), 0.9, 10.2], fov: 62 },
  { id: "foyer", x1: C(3.6), x2: C(7.8), z1: -1, z2: 11, pos: [C(4.0), 2.75, 0.45], look: [C(7.2), 0.9, 7.4], fov: 60 },
  { id: "corridor", x1: C(7.8), x2: C(15), z1: -1, z2: 1.4, pos: [C(3.95), 2.55, 0.72], look: [C(14.6), 0.95, 0.72], fov: 56 },
  { id: "cinema-back", x1: C(7.8), x2: C(15), z1: 1.4, z2: 6.2, pos: [C(8.3), 2.75, 10.5], look: [C(13.4), 0.7, 2.4], fov: 60 },
  { id: "cinema-front", x1: C(7.8), x2: C(15), z1: 6.2, z2: 11, pos: [C(13.9), 2.8, 2.0], look: [C(10.6), 1.0, 10.6], fov: 58 },
];

/** Where one camera's frame leads into the next: the openings between zones. */
const links: { a: string; b: string; x: number; z: number }[] = [
  { a: "lobby-door", b: "lobby-stair", x: L(0), z: 4.6 },
  { a: "bookshop", b: "stair-hall", x: 2.6, z: 6.2 },
  { a: "bookshop", b: "passage", x: 0, z: 5.0 },
  { a: "stair-hall", b: "passage", x: 0, z: 6.7 },
  { a: "stair-hall", b: "wine-room", x: 0, z: 8.9 },
  { a: "passage", b: "bistro-front", x: -3.4, z: 2.2 },
  { a: "bistro-front", b: "bistro-bar", x: -8.0, z: 5.4 },
  { a: "bistro-bar", b: "back-landing", x: -12.5, z: 7.1 },
  { a: "landing", b: "foyer", x: C(3.6), z: 5.3 },
  { a: "foyer", b: "corridor", x: C(7.8), z: 0.7 },
  { a: "corridor", b: "cinema-back", x: C(14.0), z: 1.4 },
  { a: "cinema-back", b: "cinema-front", x: C(14.3), z: 6.2 },
];

export type LightDef = { pos: [number, number, number]; color: string; intensity: number; distance: number; flicker?: boolean };
export const lights: LightDef[] = [
  // ---- 1F: a chandelier, the noticeboard, the poem's screen, the street
  { pos: [L(0), 2.45, 1.7], color: "#ffd0a0", intensity: 12, distance: 6 },
  { pos: [L(0), 2.0, 0.6], color: "#8090b0", intensity: 6, distance: 3.5 },
  { pos: [L(3.5), 2.1, 3.4], color: "#ffd8a0", intensity: 5, distance: 2.8 },
  { pos: [L(3.3), 1.5, 4.9], color: "#c8d8ff", intensity: 3.5, distance: 2.4 },
  { pos: [L(-0.6), 2.5, 7.4], color: "#ffc890", intensity: 6, distance: 4.5 },
  // ---- 2F bookshop: opal globes, little bulbs in the shelves, the lantern
  { pos: [2.6, 2.1, 2.7], color: "#ffe6c0", intensity: 10, distance: 5 },
  { pos: [3.6, 2.1, 5.3], color: "#ffe6c0", intensity: 8, distance: 4.5 },
  { pos: [3.0, 0.55, 0.8], color: "#ffb870", intensity: 4, distance: 2.6 },
  { pos: [0.8, 0.55, 2.2], color: "#ffb870", intensity: 3, distance: 2 },
  { pos: [0.45, 1.2, 3.5], color: "#ffc890", intensity: 4, distance: 2.4 },
  { pos: [1.7, 2.2, 10.4], color: "#a8b4d0", intensity: 5, distance: 4 }, // through the sheer curtains
  // passage, wine room
  { pos: [-1.75, 2.0, 1.1], color: "#ffe8c8", intensity: 6, distance: 4 },
  { pos: [-1.4, 0.95, 1.2], color: "#ffa050", intensity: 3.5, distance: 2.2, flicker: true },
  { pos: [-1.7, 2.6, 9.2], color: "#e0ecff", intensity: 8, distance: 5 },
  // bistro: the ring of roses, the bar's white shades and cold under-glow, candles
  { pos: [-9.4, 2.15, 4.6], color: "#ffd6a8", intensity: 16, distance: 7 },
  { pos: [-7.0, 2.15, 4.6], color: "#ffd6a8", intensity: 16, distance: 7 },
  { pos: [-9.6, 2.0, 9.2], color: "#f4f0e8", intensity: 9, distance: 4.5 },
  { pos: [-6.6, 2.0, 9.2], color: "#f4f0e8", intensity: 9, distance: 4.5 },
  { pos: [-8.2, 0.15, 8.6], color: "#a0d8ff", intensity: 4, distance: 3 },
  { pos: [-8.2, 2.3, 10.3], color: "#f0f4ff", intensity: 8, distance: 4 },
  { pos: [-8.2, 0.95, 4.6], color: "#ffa860", intensity: 5, distance: 2.6, flicker: true },
  { pos: [-11.5, 0.95, 5.0], color: "#ffa860", intensity: 4, distance: 2.2, flicker: true },
  { pos: [-4.1, 0.95, 4.3], color: "#ffa860", intensity: 4, distance: 2.2, flicker: true },
  { pos: [-8.3, 2.0, 0.7], color: "#ffc080", intensity: 5, distance: 3 },
  { pos: [-4.0, 2.4, 9.3], color: "#ffd0a0", intensity: 3, distance: 2.5 },
  // back landing: one bare cold light
  { pos: [-14.2, 2.7, 7.6], color: "#d8e4f0", intensity: 8, distance: 5 },
  // ---- 3F: the landing's chandelier, the zinc's light strips, a pendant, cove light
  { pos: [C(1.6), 2.5, 10.0], color: "#ffe6c8", intensity: 9, distance: 5 },
  { pos: [C(7.2), 1.0, 3.6], color: "#ffe8c8", intensity: 5, distance: 3.5 },
  { pos: [C(6.0), 2.6, 5.4], color: "#ffd8b0", intensity: 6, distance: 5 },
  { pos: [C(5.0), 2.3, 9.8], color: "#e8eef8", intensity: 5, distance: 4 },
  { pos: [C(10.4), 1.0, 0.9], color: "#ffe8c8", intensity: 4, distance: 3 },
  { pos: [C(13.2), 1.0, 0.9], color: "#ffe8c8", intensity: 4, distance: 3 },
  { pos: [C(8.3), 2.6, 4.0], color: "#ffb878", intensity: 5, distance: 4 },
  { pos: [C(8.3), 2.6, 8.4], color: "#ffb878", intensity: 5, distance: 4 },
  { pos: [C(14.5), 2.6, 4.0], color: "#ffb878", intensity: 5, distance: 4 },
  { pos: [C(14.5), 2.6, 8.4], color: "#ffb878", intensity: 5, distance: 4 },
  { pos: [C(11.4), 2.6, 1.9], color: "#ffb878", intensity: 4, distance: 3.5 },
];

export const PLAYER_START = { x: L(0), z: 1.5, yaw: 0 };

/** A way out of a camera's frame: an opening into the next camera zone, or a door. */
export type Exit = { x: number; z: number; door?: Door };

/** Where the player can go from a camera zone: the openings into neighbouring zones, plus the doors inside it. */
export function exitsFrom(zoneId: string): Exit[] {
  const a = cameras.find((c) => c.id === zoneId);
  if (!a) return [];
  const out: Exit[] = links.filter((l) => l.a === zoneId || l.b === zoneId).map(({ x, z }) => ({ x, z }));
  for (const d of doors) if (inZone(a, d.x, d.z)) out.push({ x: d.x, z: d.z, door: d });
  return out;
}
const inZone = (b: Box, x: number, z: number) => x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2;
