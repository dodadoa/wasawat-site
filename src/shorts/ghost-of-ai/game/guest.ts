import * as THREE from "three";
import { doors, interactables, CX, FLOOR_BOUNDS, FLOOR_ORDER, PLAYER_START, SCREEN, floorAt, type Door, type FloorId, type Interactable } from "./level";
import { world, moveWithCollision, PLAYER_RADIUS } from "./world";
import { useGame } from "./store";
import { isLate, recall } from "./memory";
import { presence } from "./presence";
import { passDoor } from "./interactions";
import { doorCreak, sting } from "./audio";
import { guestReply, type GuestAction, type GuestEvent } from "./voice";
import { reach, senseHand, type Aim } from "./reach";
import {
  AGAIN, ANSWERS, ANSWERS_AGAIN, CURTAIN_AT, FRAGMENTS, LOVER, NOIR, OPENING, PLANTED, STAIRS_AT,
  collect, fill, inHall, memories, resetStory, sawThrough, story,
} from "./story";

/**
 * Ghost mode (G): the keeper becomes a guest who woke up in the house and
 * can't leave. It walks the rooms by itself, examines what it finds and
 * talks to itself about it, building a theory as it goes. You are the ghost,
 * and you can only nudge it:
 *
 * - stir the lamps (ENTER) and it notices, and goes to look at whatever is
 *   near that spot, wondering why you wanted it there;
 * - stay close and it feels the cold, and steps away from you;
 * - hold a still hand up to the webcam and it sees a pale shape in the dark.
 *
 * With the webcam on your hand is a body in the room. Point, beckon, wave or
 * show a fist and it stops and reads the sign, and then decides what to do
 * about it. Claude makes that choice when there's a key, from what you did and
 * how you've treated it so far; otherwise its instincts do. Touch it, grab it,
 * lift it, strike it, or try to catch it as it runs: it remembers.
 *
 * What it's after is in story.ts: you give it someone to look for, it finds
 * what it can of itself around the rooms, and it needs you to take it up to the
 * cinema, into the hall, and to the screen.
 */

const SPEED = 1.35;
const TURN = 6;
/** It notices a stir this far away on its own floor. */
const STIR_RANGE = 10;
/** It goes to look at the thing nearest a stir, if anything is this close to it. */
const STIR_ITEM = 2.4;
const COLD_RANGE = 1.1;
/** Seconds of cold before it says so. */
const COLD_AFTER = 1.4;
/** A still hand this long becomes a lure. */
const LIGHT_AFTER = 1.5;
/** It thinks aloud about nothing in particular after this long without a word. */
const MUSE_AFTER = 40;
const NOTES = 8;
/** What has passed between you that it keeps in mind. */
const PAST = 6;
const RUN = 3.2;
/** It takes at least this long over a sign, and won't wait longer than this for the words. */
const BEAT = 0.7;
const ANSWER_WAIT = 3.5;
/** Seconds between signs it will attend to. */
const SIGN_EVERY = 4.5;
/** A finger held on something this long means something. */
const POINT_HOLD = 0.7;
/** A fist held up this long is a sign. */
const FIST_AFTER = 1.2;
/** A hand resting on it this long is a touch, this long and moving gently a caress. */
const TOUCH_AFTER = 0.35;
const STROKE_AFTER = 2.6;
const GENTLE = 0.5;
/** Seconds between its noticing being touched. */
const TOUCH_EVERY = 6;
/** A hand arriving faster than this (frame-widths/s) strikes it, and sends it this fast (m/s). */
const STRIKE = 1.5;
const KNOCK = 3.5;
/** A hand that closed this recently (ms) closes on it, even if it only just got there. */
const CLOSE_MS = 320;
/** It sees a hand coming, closer on the screen than `gap` and closing faster than `speed`, and throws itself aside. Then it's out of breath for `every` seconds. */
const DODGE = { gap: 0.6, speed: 1.1, every: 7 };
/**
 * How long it can be held: `base` seconds, more or less with trust, shorter
 * when it fights, longer when it gives in. A lost hand counts as letting go
 * after `lost` seconds. It drags at up to `speed` m/s and lifts up to `lift` m;
 * `depth` is metres toward the camera per unit of hand size.
 */
const HOLD = { base: 6, trust: 3, fight: 0.6, limp: 1.6, lost: 0.4, away: 0.5, speed: 2.4, lift: 0.5, depth: 6 };

/** Where it goes to wait for you: the rope on the back stairs, the velvet at the way in. */
const GATES = { rope: { x: -13.1, z: 7.7 }, curtain: { x: CX + 14.0, z: 0.8 } };
/** Seconds before it goes back to wait there again. */
const GATE_EVERY = 45;
/** Where it stands in the hall when it has nothing left to look at. */
const HALL_SPOTS = [[CX + 11.5, 2.8], [CX + 9.0, 2.6], [CX + 12.9, 2.2], [CX + 14.3, 5.8]];
/** Seconds between lines of the film, and exchanges at the screen before it goes in. */
const REEL_GAP = 3.5;
const LAST_WORDS = 2;
/** Seconds it takes to go into the film. */
const BECOME = 6;
/** Seconds between the two films' lines, once it is one. */
const NOIR_GAP = 7;
/** You wake beside it: it doesn't feel you for this long. */
const WAKE_WARM = 30;

// ---------- navigation: a coarse grid over each floor, and A* across it

const CELL = 0.25;
type Grid = { x0: number; z0: number; w: number; h: number; free: Uint8Array; solids: number };
const grids: Partial<Record<FloorId, Grid>> = {};

function gridFor(f: FloorId): Grid {
  const cached = grids[f];
  if (cached && cached.solids === world.solids.length) return cached;
  const b = FLOOR_BOUNDS[f];
  const w = Math.ceil((b.x2 - b.x1) / CELL);
  const h = Math.ceil((b.z2 - b.z1) / CELL);
  const free = new Uint8Array(w * h);
  // any more margin and the grid's cells miss the 96 cm gap in the velvet
  const r = PLAYER_RADIUS + 0.03;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const x = b.x1 + (i + 0.5) * CELL;
      const z = b.z1 + (j + 0.5) * CELL;
      free[j * w + i] = world.solids.some((s) => x + r > s.x1 && x - r < s.x2 && z + r > s.z1 && z - r < s.z2) ? 0 : 1;
    }
  return (grids[f] = { x0: b.x1, z0: b.z1, w, h, free, solids: world.solids.length });
}

const cellOf = (g: Grid, x: number, z: number) => [
  THREE.MathUtils.clamp(Math.floor((x - g.x0) / CELL), 0, g.w - 1),
  THREE.MathUtils.clamp(Math.floor((z - g.z0) / CELL), 0, g.h - 1),
] as const;
const centre = (g: Grid, i: number, j: number) => new THREE.Vector2(g.x0 + (i + 0.5) * CELL, g.z0 + (j + 0.5) * CELL);
const isFree = (g: Grid, i: number, j: number) => i >= 0 && j >= 0 && i < g.w && j < g.h && g.free[j * g.w + i] === 1;

/** The free cell nearest (i, j), searching outward ring by ring. */
function nearestFree(g: Grid, i: number, j: number): [number, number] | null {
  for (let r = 0; r < 16; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (isFree(g, i + di, j + dj)) return [i + di, j + dj];
      }
  return null;
}

function lineFree(g: Grid, a: THREE.Vector2, b: THREE.Vector2) {
  const n = Math.ceil(a.distanceTo(b) / (CELL / 2));
  for (let k = 1; k < n; k++) {
    const [i, j] = cellOf(g, a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n);
    if (!isFree(g, i, j)) return false;
  }
  return true;
}

/** A path of waypoints from (x, z) to the free spot nearest (tx, tz), or null. */
function findPath(f: FloorId, x: number, z: number, tx: number, tz: number): THREE.Vector2[] | null {
  const g = gridFor(f);
  const s = nearestFree(g, ...cellOf(g, x, z));
  const t = nearestFree(g, ...cellOf(g, tx, tz));
  if (!s || !t) return null;
  const idx = (i: number, j: number) => j * g.w + i;
  const start = idx(...s), goal = idx(...t);
  const cost = new Float32Array(g.w * g.h).fill(Infinity);
  const from = new Int32Array(g.w * g.h).fill(-1);
  const open: number[] = [start];
  const est = (k: number) => Math.hypot((k % g.w) - t[0], Math.floor(k / g.w) - t[1]);
  cost[start] = 0;
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (cost[open[k]] + est(open[k]) < cost[open[bi]] + est(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    const ci = cur % g.w, cj = Math.floor(cur / g.w);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!isFree(g, ni, nj)) continue;
        // no squeezing diagonally past a corner
        if (di && dj && (!isFree(g, ci + di, cj) || !isFree(g, ci, cj + dj))) continue;
        const n = idx(ni, nj);
        const c = cost[cur] + (di && dj ? Math.SQRT2 : 1);
        if (c < cost[n]) {
          if (cost[n] === Infinity) open.push(n);
          cost[n] = c;
          from[n] = cur;
        }
      }
  }
  if (from[goal] === -1 && goal !== start) return null;
  const cells: THREE.Vector2[] = [];
  for (let k = goal; k !== -1; k = from[k]) cells.unshift(centre(g, k % g.w, Math.floor(k / g.w)));
  // pull the string tight: keep only the corners it has to turn at
  const out: THREE.Vector2[] = [];
  let a = new THREE.Vector2(x, z);
  for (let k = 1; k < cells.length; k++) {
    if (!lineFree(g, a, cells[k])) {
      out.push(cells[k - 1]);
      a = cells[k - 1];
    }
  }
  out.push(cells[cells.length - 1]);
  return out;
}

// ---------- the guest

type Goal =
  | { kind: "item"; item: Interactable; led: boolean }
  | { kind: "door"; door: Door }
  | { kind: "spot"; x: number; z: number; gate?: keyof typeof GATES };

type State = "choose" | "walk" | "look" | "pause" | "wait" | "reach" | "held";
/** A sign it is making up its mind about. */
type Sign = { event: GuestEvent; go: Goal | null; said: string; t: number; answered: boolean; action: GuestAction | null };

const g = {
  state: "choose" as State,
  goal: null as Goal | null,
  path: [] as THREE.Vector2[],
  timer: 0,
  /** what it has looked at, so it moves on to new things */
  visited: new Set<string>(),
  triedStreet: false,
  /** its running thoughts, oldest first: sent back each time so a theory builds */
  notes: [] as string[],
  thinking: false,
  sinceThought: 0,
  /** stuck detection */
  last: new THREE.Vector2(),
  stuckT: 0,
  repaths: 0,
  stirSeen: 0,
  cold: 0,
  coldCd: 0,
  lightT: 0,
  lightCd: 0,
  fistT: 0,
  /** -1 afraid of you .. 1 trusts you */
  trust: 0,
  /** what has passed between you, oldest first */
  past: [] as string[],
  /** the newest thought it's waiting on: anything older is out of date */
  thought: 0,
  sign: null as Sign | null,
  signCd: 0,
  running: false,
  /** seconds your hand has been on it */
  contact: 0,
  touched: false,
  stroked: false,
  touchCd: 0,
  strikeCd: 0,
  grabCd: 0,
  dodgeCd: 0,
  closed: false,
  closedAt: 0,
  knock: new THREE.Vector2(),
  held: null as null | { t: number; limit: number; lost: number; away: number; x: number; y: number; size: number },
  gateCd: 0,
  /** seconds until the film's next line, and whose turn it is */
  talkT: 0,
  talkTurn: "lover" as "lover" | "guest",
};

/** What its body is doing about you, for poseGuest. */
export const guestBody = {
  /** turning its head to the hand */
  look: 0,
  /** holding its arm out to the hand */
  reach: 0,
  /** recoiling from a blow */
  flinch: 0,
  /** legs going, off the floor */
  flail: false,
  at: new THREE.Vector3(),
};

export const guestState = g;
export const guestNotes = () => g.notes;
/** How it feels about you, for its notebook. */
export const guestFeeling = () =>
  g.trust > 0.5 ? "It trusts you." : g.trust > 0.15 ? "It is starting to trust you." : g.trust < -0.5 ? "It is afraid of you." : g.trust < -0.15 ? "It is wary of you." : "It doesn't know what you are.";

export function resetGuest() {
  g.state = "pause";
  g.timer = 1.5;
  g.goal = null;
  g.path = [];
  g.thinking = false;
  g.thought++;
  g.sinceThought = 0;
  g.stirSeen = world.stir?.t ?? 0;
  g.sign = null;
  g.held = null;
  g.running = false;
  g.contact = 0;
  g.knock.set(0, 0);
  world.player.pos.y = 0;
  // you walked its body away from the screen: it has to be taken back
  if (story.act === "screen") story.act = "hall";
  guestBody.flail = false;
  guestBody.reach = guestBody.look = guestBody.flinch = 0;
  reach.on = reach.over = false;
  reach.aim = null;
  reach.label = "";
}

/** It wakes by the street door with nothing in its head. */
export function wakeGuest() {
  resetStory();
  resetGuest();
  g.visited.clear();
  g.triedStreet = false;
  g.notes = [];
  g.past = [];
  g.trust = 0;
  g.gateCd = 0;
  g.cold = 0;
  g.coldCd = WAKE_WARM;
  world.player.pos.set(PLAYER_START.x, 0, PLAYER_START.z);
  world.player.yaw = PLAYER_START.yaw;
}

/** The start, and every start after it: the house stops until you've given it someone to look for. */
export function openStory(again = false) {
  const s = useGame.getState();
  world.locked = true;
  wakeGuest();
  s.say(again ? AGAIN : OPENING, () => useGame.getState().setImplanting(true));
}

/** The false memory: the name you typed, which it will take for its own. */
export function plantMemory(name: string) {
  const s = useGame.getState();
  story.lover = name.trim();
  s.setImplanting(false);
  s.say(PLANTED, () => {
    world.locked = false;
    think("wake");
  });
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** What it says when Claude isn't there to find the words. */
const LOCAL: Record<GuestEvent, string[][]> = {
  examine: [["Who left this here?"], ["Someone wanted this found."], ["I've seen this before. Haven't I?"], ["Everything here is waiting for someone."]],
  stir: [["The lamps, over there. All at once."], ["Did you do that?"], ["Something wants me to look over there."]],
  cold: [["It's cold. Just here."], ["You're close, aren't you?"], ["Breathing on my neck. Nothing there."]],
  light: [["There's something in the dark. Like a hand."], ["Are you pointing at something?"]],
  muse: [["Same rain. Same lamps."], ["How long have I been walking?"], ["The rooms keep resetting when I'm not looking."]],
  door: [["It won't open.", "It doesn't even rattle."], ["Locked. From which side?"]],
  stairs: [["Up, then. Or down."]],
  point: [["You want me to look at that?"], ["That. You mean that."]],
  beckon: [["You're calling me over."], ["Come here, it says. Does it?"]],
  wave: [["I see you. I think I see you."], ["Is that a hello, or a warning?"]],
  fist: [["That's not a friendly shape."], ["What are you holding?"]],
  touch: [["Something's on me. Cold.", "Don't move. Don't move."], ["That was a hand."]],
  stroke: [["You're being gentle.", "Why are you being gentle?"], ["It's almost kind, the cold."]],
  meet: [["I can feel your fingers.", "There's nothing there, and I can feel them."]],
  grab: [["It has me. It has me."], ["Let go. Please, let go."]],
  release: [["It let go.", "Why did it let go?"], ["I can stand. I'm still here."]],
  escape: [["I'm out. I'm out."], ["Stay away from me."]],
  shove: [["What was that?"], ["Something went right through me."]],
  dodge: [["No. No you don't."], ["That was too close."]],
  wake: [["I came here after {who}.", "She's the one thing I'm sure of."]],
  rope: [["The back stairs are roped off.", "It's the third floor I want, and I can't make myself go up."], ["I've stood here before. Someone would have to take me."]],
  refuse: [["Up there? I don't know what I'm looking for yet.", "Let me remember more first."]],
  curtain: [["{Who} is through there. I know it.", "If I go in, I'll know. Take me in. I can't do it alone."]],
  hall: [["That doorway.", "That's {who}."]],
  answer: [["Can you hear me?"]],
  screen: [["I can feel the light on my hands.", "There's no wall here. Only you, very flat."]],
  becoming: [["Found you."]],
};

/** How each thing you do moves it, before it has had a chance to think. */
const WOUND: Partial<Record<GuestEvent, number>> = { point: 0.02, beckon: 0.02, wave: 0.02, touch: 0.04, stroke: 0.12, meet: 0.2, grab: -0.18, release: 0.06, escape: -0.08, shove: -0.2, fist: -0.05 };
/** A trust step, when Claude says this moment changed something. */
const SWAY = 0.1;
const feel = (v: number) => (g.trust = THREE.MathUtils.clamp(g.trust + v, -1, 1));

/** What it does when Claude isn't there to decide, or doesn't answer in time. */
function instinct(event: GuestEvent): GuestAction {
  const t = g.trust;
  switch (event) {
    case "stir":
    case "point":
    case "beckon":
    case "light":
      return t > -0.4 ? "go" : Math.random() < 0.6 ? "stay" : "back";
    case "fist":
      return t > 0.2 ? "stay" : "back";
    case "touch":
      return t > 0.3 ? "reach" : t < -0.3 ? "back" : "stay";
    case "stroke":
      return t > 0.1 ? "reach" : "stay";
    case "grab":
      return t > 0.4 ? "limp" : "struggle";
    case "release":
      return t > 0.3 ? "stay" : t < -0.2 ? "run" : "back";
    case "shove":
      return t < 0 ? "run" : "back";
    case "escape":
      return "run";
    case "meet":
    case "wave":
    default:
      return "stay";
  }
}

/** One line of what happened, for it to remember. */
const SIGNED: Partial<Record<GuestEvent, string>> = {
  point: "It pointed", beckon: "It beckoned to you", wave: "It waved", fist: "It showed you a fist", light: "It held a still hand out",
  touch: "It touched you", stroke: "It stroked you, gently", meet: "You took its hand", grab: "It caught you and held you", release: "It let you go",
  escape: "You tore out of its grip", shove: "It struck you", dodge: "It lunged at you and you got away",
};
const DID: Record<GuestAction, string> = {
  go: "you went", stay: "you stood and watched", back: "you backed away", run: "you ran", reach: "you reached out to it", struggle: "you fought", limp: "you went still",
};
function remember(line: string) {
  g.past.push(line);
  if (g.past.length > PAST) g.past.shift();
}

/** What it says about something that just happened, and, for a sign, what it decides. `urgent` drops whatever it was still thinking about. */
function think(event: GuestEvent, thing: string[] = [], { led = false, at = "", how = "", urgent = false, heard = "", recovered = [] as string[], local = null as string[] | null } = {}) {
  if (g.thinking && !urgent) return;
  g.thinking = true;
  const id = ++g.thought;
  g.sinceThought = 0;
  const p = world.player.pos;
  let fallback = local ?? pick(LOCAL[event]);
  if (event === "examine" && thing[0] && !local) fallback = [thing[0], led ? pick(["Is this what you wanted me to see?", "You brought me here. Why this?"]) : fallback[0]];
  guestReply({ event, floor: floorAt(p.x), late: isLate(), thing, led, notes: g.notes, at, how, trust: g.trust, past: g.past, lover: story.lover, memories: memories(), recovered: recovered.map(fill), heard }).then((reply) => {
    if (id !== g.thought) return;
    g.thinking = false;
    const s = useGame.getState();
    if (s.phase !== "playing" || s.role === "keeper") return;
    const said = reply?.lines ?? fallback.map(fill);
    s.whisperLines(said, "guest");
    if (reply) feel(reply.trust * SWAY);
    if (g.sign?.event === event) {
      g.sign.action = reply?.action ?? null;
      g.sign.answered = true;
    }
    if (g.state === "held" && reply?.action) grip(reply.action);
    g.notes.push(said.join(" "));
    if (g.notes.length > NOTES) g.notes.shift();
  });
}

function goTo(goal: Goal) {
  const p = world.player.pos;
  const [tx, tz] = goal.kind === "item" ? goal.item.pos : goal.kind === "door" ? [goal.door.x, goal.door.z] : [goal.x, goal.z];
  const path = findPath(floorAt(p.x), p.x, p.z, tx, tz);
  if (!path) return false;
  g.goal = goal;
  g.path = path;
  g.state = "walk";
  g.stuckT = 0;
  g.last.set(p.x, p.z);
  return true;
}

function choose() {
  g.running = false;
  const p = world.player.pos;
  const f = floorAt(p.x);
  const here = (x: number) => floorAt(x) === f;
  // it tries the way out first, once
  if (!g.triedStreet && f === "lobby") {
    const street = doors.find((d) => d.exit)!;
    if (goTo({ kind: "door", door: street })) return;
  }
  if (waitAtGate(f)) return;
  const items = interactables.filter((it) => findable(it) && here(it.pos[0]) && !g.visited.has(it.id));
  if (items.length) {
    // nearer things first, mostly, and whatever stirs a memory
    const w = items.map((it) => (FRAGMENTS[it.id] ? 3 : 1) / (0.5 + Math.hypot(it.pos[0] - p.x, it.pos[1] - p.z)));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    const it = items.find((_, i) => (r -= w[i]) <= 0) ?? items[0];
    if (goTo({ kind: "item", item: it, led: false })) return;
  }
  // it has found the film, and it isn't leaving
  if (story.act === "hall") {
    const [x, z] = pick(HALL_SPOTS);
    if (goTo({ kind: "spot", x, z })) return;
  }
  // seen everything on this floor: another floor, or (once it's seen them all) start again
  const everything = interactables.filter(findable).every((it) => g.visited.has(it.id));
  if (everything) g.visited.clear();
  const stairs = pickStairs(f);
  if (stairs && Math.random() < 0.8 && goTo({ kind: "door", door: stairs })) return;
  const b = FLOOR_BOUNDS[f];
  for (let i = 0; i < 8; i++) {
    const x = THREE.MathUtils.randFloat(b.x1 + 1, b.x2 - 1), z = THREE.MathUtils.randFloat(b.z1 + 1, b.z2 - 1);
    if (story.act !== "hall" && inHall(x, z)) continue;
    if (goTo({ kind: "spot", x, z })) return;
  }
}

/** What it will go and look at by itself. The hall waits until you take it in, and then it won't leave. The screen waits until you take it there. */
const findable = (it: Interactable) => !!it.text && it.id !== "screen" && (story.act === "hall") === inHall(it.pos[0], it.pos[1]);

/** It remembers enough to go on, but not enough to go on alone: it walks to the next gate and waits for you. */
function waitAtGate(f: FloorId) {
  if (g.gateCd > 0) return false;
  if (story.act === "case" && story.found.length >= STAIRS_AT) {
    if (f === "lobby") return goTo({ kind: "door", door: doors.find((d) => d.id === "up-1")! });
    if (f === "bar") return goTo({ kind: "spot", ...GATES.rope, gate: "rope" });
  }
  if (story.act === "upstairs" && story.found.length >= CURTAIN_AT) {
    if (f === "cinema") return goTo({ kind: "spot", ...GATES.curtain, gate: "curtain" });
  }
  return false;
}

/**
 * Which stairs to take from floor f: down toward the street door if it
 * hasn't tried it yet, otherwise toward a floor with things it hasn't seen.
 */
function pickStairs(f: FloorId): Door | undefined {
  // the rope on the back stairs is yours to lift
  const here = doors.filter((d) => d.to && floorAt(d.x) === f && (d.id !== "up-2" || story.act !== "case"));
  const lead = (d: Door) => floorAt(d.to!.x);
  const unseen = (fl: FloorId) => interactables.some((it) => findable(it) && floorAt(it.pos[0]) === fl && !g.visited.has(it.id));
  const step = (d: Door) => FLOOR_ORDER.indexOf(lead(d)) - FLOOR_ORDER.indexOf(f);
  return (
    (!g.triedStreet ? here.find((d) => step(d) < 0) : undefined) ??
    here.find((d) => unseen(lead(d))) ??
    pick(here)
  );
}

const handSpot = (): Goal | null => {
  const h = presence.hand.world;
  return floorAt(h.x) === floorAt(world.player.pos.x) ? { kind: "spot", x: h.x, z: h.z } : null;
};

function faceTo(x: number, z: number, p = world.player) {
  p.yaw = Math.atan2(x - p.pos.x, z - p.pos.z);
}

/** What's near a stir or a hand, if anything is, as somewhere to go and what's there. */
function nearest(x: number, z: number): { goal: Goal; thing: string[] } {
  const near = interactables
    .filter((it) => it.text && floorAt(it.pos[0]) === floorAt(x))
    .map((it) => ({ it, d: Math.hypot(it.pos[0] - x, it.pos[1] - z) }))
    .sort((a, b) => a.d - b.d)[0];
  const item = near && near.d < STIR_ITEM ? near.it : null;
  // stairs are somewhere you can lead it too
  const door = doors.find((d) => d.to && floorAt(d.x) === floorAt(x) && Math.hypot(d.x - x, d.z - z) < STIR_ITEM);
  if (door && (!item || Math.hypot(door.x - x, door.z - z) < near.d)) return { goal: { kind: "door", door }, thing: [] };
  return { goal: item ? { kind: "item", item, led: true } : { kind: "spot", x, z }, thing: item?.text?.slice(0, 1) ?? [] };
}

/** It stops and makes up its mind about a sign. stepGuest's "wait" state acts on the answer. */
function read(event: GuestEvent, go: Goal | null, { thing = [] as string[], at = "", how = "" } = {}) {
  feel(WOUND[event] ?? 0);
  g.signCd = SIGN_EVERY;
  g.sign = { event, go, said: `${SIGNED[event] ?? "The lamps moved"}${at ? ` at ${at}` : ""}`, t: 0, answered: false, action: null };
  g.state = "wait";
  g.goal = null;
  g.path = [];
  g.running = false;
  think(event, thing, { at, how, urgent: true });
}

/** Lamps, or a still hand: something drew its attention to (x, z), and it turns to see. */
function lure(x: number, z: number, event: "stir" | "light", how = "") {
  const { goal, thing } = nearest(x, z);
  faceTo(x, z);
  read(event, goal, { thing, how });
}

/** It goes through with what it decided. */
function answer(sign: Sign, action: GuestAction) {
  g.sign = null;
  remember(`${sign.said}; ${DID[action]}.`);
  const h = presence.hand.world;
  switch (action) {
    case "go":
      if (sign.go && goTo(sign.go)) return;
      break;
    case "back":
      return stepAway(2.2);
    case "run":
      return flee();
    case "reach":
      g.state = "reach";
      g.timer = 4.5;
      faceTo(h.x, h.z);
      return;
  }
  g.state = "look";
  g.goal = null;
  g.timer = 2 + Math.random() * 1.5;
}

/** Off a little way from your hand. */
function stepAway(far: number) {
  const p = world.player.pos, h = presence.hand.world;
  const away = new THREE.Vector2(p.x - h.x, p.z - h.z);
  if (away.lengthSq() < 1e-4) away.set(Math.random() - 0.5, Math.random() - 0.5);
  away.normalize().multiplyScalar(far);
  if (!goTo({ kind: "spot", x: p.x + away.x, z: p.z + away.y })) g.state = "choose";
}

/** It runs: the stairs if they're right there, otherwise the far side of the floor from your hand. */
function flee() {
  const p = world.player.pos, h = presence.hand.world;
  const f = floorAt(p.x);
  const b = FLOOR_BOUNDS[f];
  g.running = true;
  const stairs = doors.find((d) => d.to && floorAt(d.x) === f && Math.hypot(d.x - p.x, d.z - p.z) < 3.5);
  if (stairs && Math.random() < 0.4 && goTo({ kind: "door", door: stairs })) return;
  const spots = Array.from({ length: 14 }, () => ({ x: THREE.MathUtils.randFloat(b.x1 + 0.8, b.x2 - 0.8), z: THREE.MathUtils.randFloat(b.z1 + 0.8, b.z2 - 0.8) }))
    .filter((c) => Math.hypot(c.x - p.x, c.z - p.z) > 3)
    .sort((m, n) => Math.hypot(n.x - h.x, n.z - h.z) - Math.hypot(m.x - h.x, m.z - h.z));
  for (const c of spots.slice(0, 5)) if (goTo({ kind: "spot", ...c })) return;
  g.running = false;
  g.state = "choose";
}

const isClosed = () => presence.hand.pose === "fist" || presence.hand.pose === "pinch";
const palmOf = () => {
  const [w, k] = [presence.hand.points[0], presence.hand.points[9]];
  return { x: (w.x + k.x) / 2, y: (w.y + k.y) / 2 };
};

/** Your hand closed on it. */
function seize() {
  const palm = palmOf();
  g.state = "held";
  g.held = { t: 0, limit: HOLD.base + g.trust * HOLD.trust, lost: 0, away: 0, x: palm.x, y: palm.y, size: presence.hand.size };
  g.sign = null;
  g.goal = null;
  g.path = [];
  g.running = false;
  g.touched = true;
  g.contact = 0;
  guestBody.flail = true;
  feel(WOUND.grab!);
  grip(instinct("grab"));
  sting();
  think("grab", [], { how: "It closed around you without warning.", urgent: true });
}

/** How it takes being held. */
function grip(action: GuestAction) {
  const k = g.held;
  if (!k) return;
  const fight = action === "struggle";
  if (fight === guestBody.flail && k.t > 0) return;
  guestBody.flail = fight;
  k.limit = (HOLD.base + g.trust * HOLD.trust) * (fight ? HOLD.fight : HOLD.limp);
  remember(`${SIGNED.grab}; ${DID[action]}.`);
}

const right = new THREE.Vector3();
const toward = new THREE.Vector3();
const handHeight = new THREE.Vector3();

/** One frame in your hand: it goes where the hand goes, until the hand opens or it breaks free. */
function hold(dt: number) {
  const k = g.held!;
  const h = presence.hand;
  const p = world.player.pos;
  k.t += dt;
  k.lost = reach.on && isClosed() ? 0 : k.lost + dt;
  k.away = reach.gap === Infinity ? k.away + dt : 0;
  if (k.lost > HOLD.lost) return letGo("release");
  if (k.t > k.limit || k.away > HOLD.away) return letGo("escape");
  const cam = world.camera as THREE.PerspectiveCamera;
  if (!reach.on || !cam) return;
  const palm = palmOf();
  const dx = palm.x - k.x, dy = palm.y - k.y, ds = h.size - k.size;
  k.x = palm.x;
  k.y = palm.y;
  k.size = h.size;
  const half = Math.max(0.5, reach.depth) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  right.setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize();
  cam.getWorldDirection(toward).setY(0).normalize();
  const mx = right.x * dx * half * cam.aspect - toward.x * ds * HOLD.depth;
  const mz = right.z * dx * half * cam.aspect - toward.z * ds * HOLD.depth;
  const len = Math.hypot(mx, mz), most = HOLD.speed * dt;
  const scale = len > most ? most / len : 1;
  moveWithCollision(p, mx * scale, mz * scale);
  p.y = THREE.MathUtils.clamp(p.y + dy * half, 0, HOLD.lift);
}

function letGo(event: "release" | "escape") {
  g.held = null;
  guestBody.flail = false;
  g.grabCd = 3.5;
  g.dodgeCd = 0;
  if (event === "release") return read(event, null, { how: "The cold just opened around you." });
  feel(WOUND.escape!);
  remember(`${SIGNED.escape}.`);
  think(event, [], { urgent: true });
  flee();
}

/** A hand on it: a touch, a caress, a blow, or the grip closing. */
function contact(dt: number) {
  const h = presence.hand;
  const justClosed = isClosed() && performance.now() - g.closedAt < CLOSE_MS;
  if (justClosed && g.grabCd <= 0) return seize();
  const arriving = g.contact === 0;
  g.contact += dt;
  if (arriving && h.speed > STRIKE && g.strikeCd <= 0) {
    g.strikeCd = 5;
    g.touched = true;
    const cam = world.camera!;
    right.setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize().multiplyScalar(h.vel.x);
    g.knock.set(right.x, right.z);
    if (g.knock.lengthSq() < 1e-3) g.knock.set(Math.sin(world.player.yaw), Math.cos(world.player.yaw)).negate();
    g.knock.normalize().multiplyScalar(KNOCK);
    guestBody.flinch = 1;
    read("shove", null, { how: "A hard, sudden sweep of cold." });
    return;
  }
  if (g.contact > TOUCH_AFTER && !g.touched) {
    g.touched = true;
    if (g.touchCd > 0) return;
    g.touchCd = TOUCH_EVERY;
    if (g.state === "reach") return read("meet", null);
    read("touch", null, { how: h.speed < GENTLE ? "Slowly. It came to rest on you." : "Quickly, and it stayed." });
  } else if (g.contact > STROKE_AFTER && !g.stroked && h.speed < GENTLE) {
    g.stroked = true;
    read("stroke", null);
  }
}

const distanceWords = (d: number) => (d < 1.5 ? "right beside you" : d < 4 ? "a few steps away" : "across the room");
const POSE_WORDS = { open: "An open hand, held still", loose: "A loose, half-open hand, held still", fist: "A closed fist, held still" };

/** What your hand's finger is on, in its words. */
function aimAt(aim: Aim, d: number) {
  if (aim.kind === "him") return { at: "you", go: handSpot(), thing: [] };
  if (aim.kind === "item") return { at: `something ${distanceWords(d)}`, go: { kind: "item", item: aim.item, led: true } as Goal, thing: aim.item.text?.slice(0, 1) ?? [] };
  if (aim.kind === "door") return { at: aim.door.exit ? "the street door" : "the stairs", go: { kind: "door", door: aim.door } as Goal, thing: [] };
  return { at: `a bare patch of floor ${distanceWords(d)}`, go: { kind: "spot", x: aim.x, z: aim.z } as Goal, thing: [] };
}

/** One frame of your hand in the room, as far as it can tell. */
function feelHand(dt: number) {
  const h = presence.hand;
  const p = world.player.pos;
  const closed = reach.on && isClosed();
  if (closed && !g.closed) g.closedAt = performance.now();
  g.closed = closed;
  if (!reach.on) {
    g.contact = 0;
    g.touched = g.stroked = false;
    g.lightT = g.fistT = 0;
    return;
  }
  if (reach.over) {
    g.lightT = g.fistT = 0;
    return contact(dt);
  }
  g.contact = 0;
  g.touched = g.stroked = false;
  // try to catch it and it sees you coming, if it's looking and has the breath
  const lunge = reach.gap < DODGE.gap && reach.closing > DODGE.speed * (g.trust > 0.5 ? 1.6 : 1);
  if (lunge && reach.seen && g.dodgeCd <= 0 && g.state !== "held") {
    g.dodgeCd = DODGE.every;
    g.sign = null;
    guestBody.flinch = 1;
    feel(-0.04);
    remember(`${SIGNED.dodge}.`);
    think("dodge", [], { how: "Fast, straight at you.", urgent: true });
    flee();
    return;
  }
  if (floorAt(world.ghost.pos.x) !== floorAt(p.x) || Math.hypot(h.world.x - p.x, h.world.z - p.z) > STIR_RANGE) return;
  const still = h.speed < 0.5;
  g.lightT = still && (h.pose === "open" || h.pose === "loose") ? g.lightT + dt : 0;
  g.fistT = still && h.pose === "fist" ? g.fistT + dt : 0;
  if (g.signCd > 0 || g.running) return;
  const dist = Math.hypot(reach.target.x - p.x, reach.target.z - p.z);
  if (reach.aim && reach.aimed > POINT_HOLD) {
    const { at, go, thing } = aimAt(reach.aim, dist);
    faceTo(h.world.x, h.world.z);
    read("point", go, { at, thing, how: "One finger of haze, held steady." });
  } else if (h.beckon) {
    faceTo(h.world.x, h.world.z);
    read("beckon", handSpot(), { how: `Curling its fingers, ${distanceWords(Math.hypot(h.world.x - p.x, h.world.z - p.z))}.` });
  } else if (h.wave) {
    faceTo(h.world.x, h.world.z);
    read("wave", handSpot(), { how: `Side to side, ${distanceWords(Math.hypot(h.world.x - p.x, h.world.z - p.z))}.` });
  } else if (g.fistT > FIST_AFTER) {
    g.fistT = 0;
    faceTo(h.world.x, h.world.z);
    read("fist", null, { how: `${POSE_WORDS.fist}, ${distanceWords(Math.hypot(h.world.x - p.x, h.world.z - p.z))}.` });
  } else if (g.lightT > LIGHT_AFTER && g.lightCd <= 0) {
    g.lightCd = 16;
    g.lightT = 0;
    lure(h.world.x, h.world.z, "light", `${POSE_WORDS[h.pose as "open" | "loose"] ?? POSE_WORDS.loose}, ${distanceWords(Math.hypot(h.world.x - p.x, h.world.z - p.z))}.`);
  }
}

const toScreen = () => Math.atan2(SCREEN.x - world.player.pos.x, SCREEN.z - world.player.pos.z);

/** It's in the hall, and the film is playing to it. */
function enterHall() {
  story.act = "hall";
  g.talkT = 5;
  g.talkTurn = "lover";
  g.visited.delete("row-c");
  g.visited.delete("glass");
  think("hall", [], { urgent: true, how: "You have come in through the velvet. The film is running, and the woman on the screen is your girlfriend." });
}

/** One frame of talking to the film: a line of the reel, then what it says back, and round again. */
function filmTalk(dt: number) {
  const s = useGame.getState();
  if (g.thinking || s.whisper || s.message) return;
  if (story.act === "screen" && story.atScreen >= LAST_WORDS) return become();
  if ((g.talkT -= dt) > 0) return;
  const i = story.heard % LOVER.length;
  if (g.talkTurn === "lover") {
    s.whisperLines([LOVER[i]], "lover");
    g.talkTurn = "guest";
    g.talkT = 0.5;
    return;
  }
  const again = story.heard >= LOVER.length;
  think("answer", [], {
    heard: LOVER[i],
    how: again ? "You have heard it say this before: the same words, the same breath, the same turn of the head." : "",
    local: (again ? ANSWERS_AGAIN : ANSWERS)[i],
    urgent: true,
  });
  story.heard++;
  if (story.act === "screen") story.atScreen++;
  g.talkTurn = "lover";
  g.talkT = REEL_GAP;
}

/** You brought it to the screen. There's nothing behind it, and there is nowhere else left. */
function reachScreen() {
  collect("screen");
  story.act = "screen";
  story.atScreen = 0;
  g.goal = null;
  g.path = [];
  g.talkT = REEL_GAP;
  g.talkTurn = "lover";
  think("screen", [], { urgent: true, led: true });
}

/** Its last words, according to what it found out about itself on the way. */
function become() {
  story.act = "becoming";
  g.sign = null;
  guestBody.look = guestBody.reach = 0;
  think("becoming", [], {
    urgent: true,
    how: sawThrough() ? "You know now that you are an AI. You go in anyway." : "You have found her.",
    local: sawThrough() ? ["I know what I am.", "It doesn't matter. I know where you are."] : ["Found you.", "I said I would."],
  });
}

/** Into the film, then on as one. There's no more of it in the room to sense you. */
function film(dt: number) {
  const s = useGame.getState();
  const p = world.player;
  if (story.act === "becoming") {
    p.yaw = toScreen();
    if (g.thinking || s.whisper) return 0;
    story.gone = Math.min(1, story.gone + dt / BECOME);
    p.pos.z += (SCREEN.z + 0.1 - p.pos.z) * (1 - Math.exp(-1.2 * dt));
    if (story.gone < 1) return story.gone < 0.6 ? SPEED : 0;
    story.act = "reel";
    story.heard = 0;
    g.talkT = 6;
    g.talkTurn = "lover";
    return 0;
  }
  story.since += dt;
  if (s.whisper || s.message || (g.talkT -= dt) > 0) return 0;
  // each to its own film: the one line can't reach the other
  const i = Math.floor(story.heard / 2);
  if (g.talkTurn === "lover") s.whisperLines([LOVER[i % LOVER.length]], "lover");
  else s.whisperLines([fill(NOIR[i % NOIR.length])], "guest");
  g.talkTurn = g.talkTurn === "lover" ? "guest" : "lover";
  story.heard++;
  g.talkT = NOIR_GAP;
  return 0;
}

/** One frame of the guest. Moves world.player and returns its walking speed (0 when standing). */
export function stepGuest(dt: number): number {
  const p = world.player;
  const f = floorAt(p.pos.x);
  if (story.act === "becoming" || story.act === "reel") return film(dt);
  if (story.act === "screen") {
    filmTalk(dt);
    p.yaw = toScreen();
    return 0;
  }
  g.sinceThought += dt;
  g.coldCd -= dt;
  g.lightCd -= dt;
  g.signCd -= dt;
  g.touchCd -= dt;
  g.strikeCd -= dt;
  g.grabCd -= dt;
  g.dodgeCd -= dt;
  g.gateCd -= dt;
  guestBody.flinch = Math.max(0, guestBody.flinch - dt * 1.6);
  senseHand(dt);
  // the hand's plane can dip under the floor: it looks and reaches to where a hand would be
  if (reach.on) guestBody.at.lerp(handHeight.copy(presence.hand.world).setY(THREE.MathUtils.clamp(presence.hand.world.y, 0.9, 1.7)), 1 - Math.exp(-10 * dt));
  guestBody.look = reach.on && Math.hypot(presence.hand.world.x - p.pos.x, presence.hand.world.z - p.pos.z) < STIR_RANGE ? 1 : 0;
  guestBody.reach = g.state === "reach" || g.sign?.event === "meet" ? 1 : 0;
  if (g.state === "held") {
    hold(dt);
    return 0;
  }
  if (p.pos.y > 0) p.pos.y = Math.max(0, p.pos.y - 3.5 * dt);
  if (g.knock.lengthSq() > 0.01) {
    moveWithCollision(p.pos, g.knock.x * dt, g.knock.y * dt);
    g.knock.multiplyScalar(Math.exp(-6 * dt));
  }

  if (story.act === "upstairs" && inHall(p.pos.x, p.pos.z)) enterHall();
  if (story.act === "hall" && inHall(p.pos.x, p.pos.z)) filmTalk(dt);

  // ---- what it senses of you
  feelHand(dt);
  if ((g.state as State) === "held") return 0;
  const st = world.stir;
  if (st && st.t > g.stirSeen) {
    g.stirSeen = st.t;
    if (floorAt(st.x) === f && Math.hypot(st.x - p.pos.x, st.z - p.pos.z) < STIR_RANGE) lure(st.x, st.z, "stir");
  }
  const gh = world.enemies.ghost;
  const close = gh && floorAt(gh.x) === f && Math.hypot(gh.x - p.pos.x, gh.z - p.pos.z) < COLD_RANGE;
  g.cold = close ? g.cold + dt : Math.max(0, g.cold - dt * 2);
  if (g.cold > COLD_AFTER && g.coldCd <= 0) {
    g.coldCd = 22;
    g.cold = 0;
    // you led it here and you're waiting by the thing: it keeps its mind on that
    const led = g.goal?.kind === "item" && g.goal.led && (g.state === "walk" || g.state === "look");
    if (!led && g.state !== "wait") {
      think("cold");
      // it steps away from the cold
      const away = new THREE.Vector2(p.pos.x - gh.x, p.pos.z - gh.z).normalize().multiplyScalar(2.2);
      g.state = "pause";
      g.timer = 0.7;
      g.goal = { kind: "spot", x: p.pos.x + away.x, z: p.pos.z + away.y };
      g.path = [];
    }
  }
  if (g.sinceThought > MUSE_AFTER && (g.state === "walk" || g.state === "look")) think("muse");

  // ---- what it does
  let speed = 0;
  let face: number | null = null;
  switch (g.state) {
    case "choose":
      choose();
      break;
    case "pause":
      if ((g.timer -= dt) <= 0) {
        if (g.goal && goTo(g.goal)) break;
        g.state = "choose";
      }
      break;
    case "wait": {
      const sign = g.sign;
      if (!sign) {
        g.state = "choose";
        break;
      }
      sign.t += dt;
      if (sign.t > BEAT && (sign.answered || sign.t > ANSWER_WAIT)) answer(sign, sign.action ?? instinct(sign.event));
      break;
    }
    case "reach": {
      const h = presence.hand.world;
      face = Math.atan2(h.x - p.pos.x, h.z - p.pos.z);
      if ((g.timer -= dt) <= 0) g.state = "choose";
      break;
    }
    case "walk": {
      const next = g.path[0];
      if (!next) {
        arrive();
        break;
      }
      const dx = next.x - p.pos.x, dz = next.y - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) {
        g.path.shift();
        break;
      }
      face = Math.atan2(dx, dz);
      speed = g.running ? RUN : SPEED;
      const step = Math.min(d, speed * dt);
      moveWithCollision(p.pos, (dx / d) * step, (dz / d) * step);
      // stuck against something the grid didn't know about: find another way
      g.stuckT += dt;
      if (g.stuckT > 1.5) {
        const moved = g.last.distanceTo(new THREE.Vector2(p.pos.x, p.pos.z));
        g.last.set(p.pos.x, p.pos.z);
        g.stuckT = 0;
        if (moved < 0.2) {
          if (++g.repaths > 2 || !g.goal || !goTo(g.goal)) {
            g.repaths = 0;
            g.state = "choose";
          }
        }
      }
      break;
    }
    case "look": {
      const goal = g.goal;
      if (goal?.kind === "item") face = Math.atan2(goal.item.pos[0] - p.pos.x, goal.item.pos[1] - p.pos.z);
      // it can't keep its eyes off the film
      else if (story.act === "hall") face = toScreen();
      // it lingers until it has finished its thought
      const s = useGame.getState();
      if ((g.timer -= dt) <= 0 && !g.thinking && !s.whisper) g.state = "choose";
      break;
    }
  }
  if (face !== null) {
    let d = face - p.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    p.yaw += THREE.MathUtils.clamp(d, -TURN * dt, TURN * dt);
  }
  return speed;
}

function arrive() {
  const goal = g.goal;
  g.repaths = 0;
  g.running = false;
  if (!goal) return void (g.state = "choose");
  if (goal.kind === "item") {
    g.visited.add(goal.item.id);
    if (goal.item.memory) recall(goal.item.memory, 0.2);
    if (goal.item.id === "screen") return reachScreen();
    const back = collect(goal.item.id);
    think("examine", goal.item.text ?? [], { led: goal.led, recovered: back ?? [], local: back, urgent: !!back });
    g.state = "look";
    g.timer = 4 + Math.random() * 3;
  } else if (goal.kind === "door") {
    if (goal.door.id === "up-2" && story.act === "case" && story.found.length < STAIRS_AT) {
      think("refuse");
      g.state = "look";
      g.timer = 3;
    } else if (goal.door.exit) {
      g.triedStreet = true;
      think("door");
      g.state = "look";
      g.timer = 3;
    } else {
      // the stairs: it just goes, and you hear it if you're on its floor
      if (goal.door.id === "up-2" && story.act === "case") story.act = "upstairs";
      if (floorAt(goal.door.x) === floorAt(world.ghost.pos.x)) doorCreak();
      passDoor(goal.door, world.player);
      g.state = "pause";
      g.timer = 2.2;
      g.goal = null;
    }
  } else {
    if (goal.gate) {
      g.gateCd = GATE_EVERY;
      think(goal.gate);
    }
    g.state = "look";
    g.timer = goal.gate ? 7 : story.act === "hall" ? 6 + Math.random() * 4 : 1.5 + Math.random() * 2;
  }
}

const look = new THREE.Vector3();
const from = new THREE.Vector3();
const to = new THREE.Vector3();
const turn = new THREE.Quaternion();
const parent = new THREE.Quaternion();
const local = new THREE.Quaternion();
const none = new THREE.Quaternion();
/** How far its head turns, and tilts, to look at you. */
const NECK = { yaw: 1.3, tilt: 0.6 };
const eased = { look: 0, reach: 0, t: 0 };
const sideways = new THREE.Vector3();

/** Rotates a bone by a rotation given in world space, `w` of the way. */
function twist(bone: THREE.Object3D, q: THREE.Quaternion, w: number) {
  bone.parent!.getWorldQuaternion(parent);
  local.copy(parent).invert().multiply(q).multiply(parent);
  bone.quaternion.premultiply(none.identity().slerp(local, w));
  bone.updateWorldMatrix(false, true);
}

/** Points a bone at `target`, measuring its direction from itself to `tip`. */
function aimBone(bone: THREE.Object3D, tip: THREE.Object3D, target: THREE.Vector3, w: number) {
  bone.getWorldPosition(from);
  tip.getWorldPosition(to).sub(from).normalize();
  turn.setFromUnitVectors(to, look.copy(target).sub(from).normalize());
  twist(bone, turn, w);
}

/**
 * Its body answers you on top of whatever clip is playing: the head turns to
 * your hand, an arm comes up to it, the chest recoils, and it writhes when
 * held. Called after the mixer, which rewrites the bones every frame.
 */
export function poseGuest(root: THREE.Object3D, dt: number) {
  const b = guestBody;
  eased.look += (b.look - eased.look) * (1 - Math.exp(-6 * dt));
  eased.reach += (b.reach - eased.reach) * (1 - Math.exp(-5 * dt));
  eased.t += dt;
  if (eased.look < 0.01 && eased.reach < 0.01 && b.flinch <= 0 && !b.flail) return;
  root.updateWorldMatrix(true, true);
  const yaw = world.player.yaw;
  const head = root.getObjectByName("Head");
  const chest = root.getObjectByName("Torso");
  if (head && eased.look > 0.01) {
    head.getWorldPosition(from);
    const dx = b.at.x - from.x, dz = b.at.z - from.z;
    const off = THREE.MathUtils.clamp(Math.atan2(Math.sin(Math.atan2(dx, dz) - yaw), Math.cos(Math.atan2(dx, dz) - yaw)), -NECK.yaw, NECK.yaw);
    const tilt = THREE.MathUtils.clamp(Math.atan2(b.at.y - from.y, Math.hypot(dx, dz)), -NECK.tilt, NECK.tilt);
    to.set(Math.sin(yaw), 0, Math.cos(yaw));
    look.set(Math.sin(yaw + off) * Math.cos(tilt), Math.sin(tilt), Math.cos(yaw + off) * Math.cos(tilt));
    twist(head, turn.setFromUnitVectors(to, look), eased.look);
  }
  if (chest && (b.flinch > 0 || b.flail)) {
    twist(chest, turn.setFromAxisAngle(sideways.set(Math.cos(yaw), 0, -Math.sin(yaw)), -0.45 * b.flinch), 1);
    if (b.flail) twist(chest, turn.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.sin(eased.t * 17) * 0.3), 1);
  }
  if (eased.reach > 0.01) {
    const upper = root.getObjectByName("UpperArmR");
    const lower = root.getObjectByName("LowerArmR");
    const palm = root.getObjectByName("PalmR");
    if (upper && lower && palm) {
      aimBone(upper, lower, b.at, eased.reach);
      aimBone(lower, palm, b.at, eased.reach);
    }
  }
}
