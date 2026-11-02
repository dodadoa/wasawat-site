/**
 * What shape a hand is making, from MediaPipe's landmarks. It reads the world
 * landmarks (metres, centred on the hand), so it doesn't matter how far the
 * hand is from the webcam or which way it's turned.
 */
export type Pose = "none" | "open" | "point" | "fist" | "pinch" | "loose";
export type Lm = { x: number; y: number; z: number };

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_KNUCKLE = 9;
/** Knuckle and tip of index, middle, ring and little finger. */
const FINGERS = [[5, 8], [9, 12], [13, 16], [17, 20]] as const;
/** Tip's distance from the wrist as a multiple of the knuckle's: about this when straight, and when curled. */
const STRAIGHT = 1.75;
const CURLED = 1.15;
/** Thumb and index tips this close (in palm lengths) are a pinch. */
const PINCH = 0.3;

const dist = (a: Lm, b: Lm) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How curled each finger is, 0 straight to 1 closed: index, middle, ring, little. */
export function curls(lm: Lm[]) {
  return FINGERS.map(([knuckle, tip]) => {
    const r = dist(lm[WRIST], lm[tip]) / Math.max(1e-6, dist(lm[WRIST], lm[knuckle]));
    return clamp01((STRAIGHT - r) / (STRAIGHT - CURLED));
  });
}

export function readPose(lm: Lm[]): { pose: Pose; curl: number; index: number } {
  const [index, ...rest] = curls(lm);
  const others = rest.reduce((a, b) => a + b, 0) / rest.length;
  const curl = (index + others * 3) / 4;
  const palm = Math.max(1e-6, dist(lm[WRIST], lm[MIDDLE_KNUCKLE]));
  let pose: Pose = "loose";
  if (index > 0.6 && others > 0.6) pose = "fist";
  else if (dist(lm[THUMB_TIP], lm[INDEX_TIP]) / palm < PINCH) pose = "pinch";
  else if (index < 0.35 && Math.min(...rest) > 0.45) pose = "point";
  else if (index < 0.35 && others < 0.35) pose = "open";
  return { pose, curl, index };
}

/** A pose has to last this long (s) before it counts: closing a hand passes through all the others. */
const SETTLE = 0.09;

/** Keeps the tracked pose from flickering between frames. */
export class PoseFilter {
  pose: Pose = "none";
  private next: Pose = "none";
  private t = 0;
  feed(raw: Pose, dt: number) {
    if (raw === this.pose) {
      this.next = raw;
      this.t = 0;
    } else if (raw !== this.next) {
      this.next = raw;
      this.t = 0;
    } else if ((this.t += dt) >= SETTLE) {
      this.pose = raw;
      this.t = 0;
    }
    return this.pose;
  }
}

/**
 * Counts how often a signal changes direction by at least `size`: a wave is
 * the palm going back and forth, a beckon is the finger curling and uncurling.
 */
export class Rhythm {
  private turns: number[] = [];
  private top = 0;
  private dir = 0;
  private now = 0;
  constructor(private size: number, private needed: number, private span: number) {}
  feed(v: number, dt: number) {
    this.now += dt;
    const d = v - this.top;
    if (this.dir === 0 || Math.sign(d) === this.dir) {
      if (Math.abs(d) >= this.size || this.dir !== 0) {
        this.top = v;
        if (this.dir === 0) this.dir = Math.sign(d);
      }
    } else if (Math.abs(d) >= this.size) {
      this.top = v;
      this.dir = -this.dir;
      this.turns.push(this.now);
    }
    this.turns = this.turns.filter((t) => this.now - t < this.span);
    return this.turns.length >= this.needed;
  }
  clear() {
    this.turns = [];
    this.dir = 0;
  }
}
