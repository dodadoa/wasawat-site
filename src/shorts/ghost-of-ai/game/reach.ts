import * as THREE from "three";
import { doors, interactables, walls, FLOOR_BOUNDS, floorAt, type Door, type Interactable } from "./level";
import { world, you } from "./world";
import { presence } from "./presence";

/**
 * Your hand in the room, as the ghost. The webcam gives a hand no real depth,
 * so everything here happens on the screen: a tracked hand is already in the
 * camera's normalised coordinates, and it is on the guest when it lies over
 * his picture, whatever the distance to him. Pointing works the same way: the
 * finger is a line across the frame, or, aimed straight at the webcam, a dot.
 *
 * Distances in here are in units of half the screen's height.
 */
export type Aim =
  | { kind: "him" }
  | { kind: "item"; item: Interactable }
  | { kind: "door"; door: Door }
  | { kind: "spot"; x: number; z: number };

/** Half his width, and his height, in metres. */
const BODY = { half: 0.3, tall: 1.7 };
/** How much of the screen a hand covers around its palm. */
const HAND_R = 0.07;
/** A finger shorter on screen than this share of the palm points at the webcam, not across the frame. */
const AT_SCREEN = 0.55;
/** Pointing across the frame: how wide the line is, and how much it opens with distance. */
const LINE = { width: 0.14, spread: 0.1 };
/** Pointing at the webcam: how near the fingertip something has to be. */
const DOT = 0.2;
/** Where a point lands on bare floor, along the line from the fingertip. */
const SPOT_REACH = 0.5;
/** He is what you mean, more readily than anything else on that line. */
const HIM_FIRST = 0.7;

export const reach = {
  /** a hand is in the room with you, and you are the ghost */
  on: false,
  /** the hand lies on him */
  over: false,
  /** how far the palm is from him on the screen (0 when it's on him), and how fast that is shrinking */
  gap: Infinity,
  closing: 0,
  /** his distance from the camera along its view, for putting the hand at his depth */
  depth: 0,
  /** he is turned toward the hand, so he can see it coming */
  seen: false,
  /** what the finger is pointing at, and for how many seconds it has held there */
  aim: null as Aim | null,
  aimed: 0,
  /** where the aim lands in the room */
  target: new THREE.Vector3(),
  /** what the webcam view should say about the hand */
  label: "",
};

const a = new THREE.Vector3();
const b = new THREE.Vector3();
const fwd = new THREE.Vector3();
const ray = new THREE.Vector3();

type Screen = { x: number; y: number };

/** Where a point in the room falls on the screen, or null behind the camera. */
function onScreen(x: number, y: number, z: number, cam: THREE.PerspectiveCamera): Screen | null {
  a.set(x, y, z).project(cam);
  return a.z > 1 ? null : { x: a.x * cam.aspect, y: a.y };
}

function toSegment(p: Screen, s: Screen, e: Screen) {
  const dx = e.x - s.x, dy = e.y - s.y;
  const t = THREE.MathUtils.clamp(((p.x - s.x) * dx + (p.y - s.y) * dy) / Math.max(1e-6, dx * dx + dy * dy), 0, 1);
  return Math.hypot(p.x - s.x - dx * t, p.y - s.y - dy * t);
}

const crosses = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number) => {
  const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d;
  const u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
};

/** No wall between the camera and (x, z). Stops short of it, since most things stand against a wall. */
function inSight(x: number, z: number, cam: THREE.Camera) {
  const cx = cam.position.x, cz = cam.position.z;
  const len = Math.hypot(x - cx, z - cz);
  const k = Math.max(0, len - 0.45) / Math.max(len, 1e-6);
  const ex = cx + (x - cx) * k, ez = cz + (z - cz) * k;
  return !walls.some((w) => crosses(cx, cz, ex, ez, w.x1, w.z1, w.x2, w.z2));
}

/** The floor under a point on the screen, or null if it's wall or ceiling up there. */
function floorUnder(s: Screen, cam: THREE.PerspectiveCamera) {
  ray.set(s.x / cam.aspect, s.y, 0.5).unproject(cam).sub(cam.position);
  if (ray.y >= -1e-3) return null;
  const t = -cam.position.y / ray.y;
  const x = cam.position.x + ray.x * t, z = cam.position.z + ray.z * t;
  const f = FLOOR_BOUNDS[floorAt(you().pos.x)];
  return x > f.x1 && x < f.x2 && z > f.z1 && z < f.z2 && inSight(x, z, cam) ? { x, z } : null;
}

function findAim(cam: THREE.PerspectiveCamera, him: boolean): Aim | null {
  const pts = presence.hand.points;
  const tip = { x: pts[8].x * cam.aspect, y: pts[8].y };
  const dx = (pts[8].x - pts[5].x) * cam.aspect, dy = pts[8].y - pts[5].y;
  const palm = Math.hypot((pts[9].x - pts[0].x) * cam.aspect, pts[9].y - pts[0].y);
  const len = Math.hypot(dx, dy);
  const dot = len < palm * AT_SCREEN;
  const ux = dot ? 0 : dx / len, uy = dot ? 0 : dy / len;

  /** How far off the finger's line a point is, or null if it isn't on it. */
  const off = (s: Screen | null) => {
    if (!s) return null;
    const vx = s.x - tip.x, vy = s.y - tip.y;
    if (dot) {
      const d = Math.hypot(vx, vy);
      return d < DOT ? d : null;
    }
    const along = vx * ux + vy * uy;
    if (along < -0.05) return null;
    const side = Math.abs(vx * uy - vy * ux);
    return side < LINE.width + along * LINE.spread ? side + along * 0.04 : null;
  };

  const f = floorAt(you().pos.x);
  const found: { aim: Aim; x: number; z: number; score: number }[] = [];
  const add = (aim: Aim, x: number, y: number, z: number, weight = 1) => {
    const s = onScreen(x, y, z, cam);
    const score = off(s);
    if (score !== null) found.push({ aim, x, z, score: score * weight });
  };
  if (him) add({ kind: "him" }, world.player.pos.x, 1, world.player.pos.z, HIM_FIRST);
  for (const item of interactables) if (item.text && floorAt(item.pos[0]) === f) add({ kind: "item", item }, item.pos[0], 0.9, item.pos[1]);
  for (const door of doors) if (floorAt(door.x) === f) add({ kind: "door", door }, door.x, 1.1, door.z);
  found.sort((p, q) => p.score - q.score);
  const hit = found.find((c) => inSight(c.x, c.z, cam));
  if (hit) return hit.aim;

  // nothing on that line: the floor it passes over, nearest the fingertip it can find
  for (let k = dot ? 0 : SPOT_REACH; k >= 0; k -= 0.1) {
    const spot = floorUnder({ x: tip.x + ux * k, y: tip.y + uy * k }, cam);
    if (spot) return { kind: "spot", ...spot };
  }
  return null;
}

const sameAim = (p: Aim | null, q: Aim | null) => {
  if (!p || !q || p.kind !== q.kind) return false;
  if (p.kind === "item") return p.item === (q as typeof p).item;
  if (p.kind === "door") return p.door === (q as typeof p).door;
  if (p.kind === "spot") return Math.hypot(p.x - (q as typeof p).x, p.z - (q as typeof p).z) < 1;
  return true;
};

/** A few words for the webcam view. */
function nameOf(aim: Aim) {
  if (aim.kind === "him") return "him";
  if (aim.kind === "item") return aim.item.id.replace(/-/g, " ");
  if (aim.kind === "door") return aim.door.exit ? "the street door" : "the stairs";
  return "the floor";
}

/** One frame of the hand, in ghost mode. */
export function senseHand(dt: number) {
  const h = presence.hand;
  const cam = world.camera as THREE.PerspectiveCamera | null;
  const p = world.player.pos;
  const was = reach.gap;
  reach.on = presence.active && h.seen && !!cam;
  reach.over = false;
  reach.gap = Infinity;
  if (!reach.on || !cam) {
    reach.closing = 0;
    reach.aim = null;
    reach.aimed = 0;
    reach.label = "";
    return;
  }
  const here = floorAt(p.x) === floorAt(you().pos.x);
  const feet = onScreen(p.x, p.y, p.z, cam);
  const head = onScreen(p.x, p.y + BODY.tall, p.z, cam);
  const him = here && !!feet && !!head && inSight(p.x, p.z, cam);
  if (him) {
    cam.getWorldDirection(fwd);
    reach.depth = b.set(p.x, p.y + 0.9, p.z).sub(cam.position).dot(fwd);
    const body = BODY.half / (Math.max(0.5, reach.depth) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    const palm = { x: (h.points[0].x + h.points[9].x) * 0.5 * cam.aspect, y: (h.points[0].y + h.points[9].y) * 0.5 };
    const tip = { x: h.points[8].x * cam.aspect, y: h.points[8].y };
    const d = Math.min(toSegment(palm, feet, head), toSegment(tip, feet, head)) - body - HAND_R;
    reach.gap = Math.max(0, d);
    reach.over = d <= 0;
    // facing the camera he sees everything, with his back to it nothing, and side on what's in front of him
    const yaw = world.player.yaw;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const len = Math.max(1e-6, Math.hypot(p.x - cam.position.x, p.z - cam.position.z));
    const away = (fx * (p.x - cam.position.x) + fz * (p.z - cam.position.z)) / len;
    const chest = onScreen(p.x, p.y + 1, p.z, cam);
    const ahead = onScreen(p.x + fx * 0.6, p.y + 1, p.z + fz * 0.6, cam);
    const side = chest && ahead ? (ahead.x - chest.x) * (palm.x - chest.x) + (ahead.y - chest.y) * (palm.y - chest.y) > 0 : false;
    reach.seen = away < -0.5 || (away < 0.5 && side);
  }
  const rate = was === Infinity || reach.gap === Infinity ? 0 : (was - reach.gap) / Math.max(dt, 1e-3);
  reach.closing += (rate - reach.closing) * Math.min(1, dt * 12);

  const aim = h.pose === "point" ? findAim(cam, him) : null;
  reach.aimed = sameAim(aim, reach.aim) ? reach.aimed + dt : 0;
  reach.aim = aim;
  if (aim?.kind === "him") reach.target.set(p.x, p.y + 1, p.z);
  else if (aim?.kind === "item") reach.target.set(aim.item.pos[0], 0.9, aim.item.pos[1]);
  else if (aim?.kind === "door") reach.target.set(aim.door.x, 1.1, aim.door.z);
  else if (aim) reach.target.set(aim.x, 0.02, aim.z);
  reach.label = aim ? `point · ${nameOf(aim)}` : h.beckon ? "beckon" : h.wave ? "wave" : h.pose === "none" || h.pose === "loose" ? "" : h.pose;
}
