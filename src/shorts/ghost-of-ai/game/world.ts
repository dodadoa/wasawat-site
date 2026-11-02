import * as THREE from "three";
import { walls, solids, PLAYER_START, WALL_T, type Box } from "./level";
import { useGame } from "./store";

/** Mutable shared state read by player, enemies and camera each frame. */
export const world = {
  player: { pos: new THREE.Vector3(PLAYER_START.x, 0, PLAYER_START.z), yaw: PLAYER_START.yaw, moving: false, running: false },
  /** You, as the ghost (the guest is then world.player). */
  ghost: { pos: new THREE.Vector3(PLAYER_START.x, 0, PLAYER_START.z), yaw: PLAYER_START.yaw, pitch: 0, clip: "idle" as Clip },
  locked: false, // cutscene / door transition
  solids: [] as Box[],
  zone: "" as string,
  /** Enemy positions, exposed for the console debug hook (`__game.world.enemies`). */
  enemies: {} as Record<string, THREE.Vector3>,
  /** The render camera, for the console debug hook. */
  camera: null as THREE.Camera | null,
  /** Where the player is in normalised screen space (-1..1, y up) while out of the camera's view; null when visible. */
  offscreen: null as { x: number; y: number } | null,
  /** Ghost mode: where and when (performance.now) you last stirred the lights. */
  stir: null as { x: number; z: number; t: number } | null,
};

export type Clip = "idle" | "walk" | "run";

/** Whoever you are right now: what the camera, the stairs and the rain follow. */
export const you = () => (useGame.getState().role === "keeper" ? world.player : world.ghost);

export const PLAYER_RADIUS = 0.32;

function wallBoxes(): Box[] {
  const h = WALL_T / 2;
  const out: Box[] = walls.map((w) => ({
    x1: Math.min(w.x1, w.x2) - h,
    x2: Math.max(w.x1, w.x2) + h,
    z1: Math.min(w.z1, w.z2) - h,
    z2: Math.max(w.z1, w.z2) + h,
  }));
  // furniture made of many parts; single solid blocks and props add themselves
  out.push(...solids);
  return out;
}

export function resetSolids() {
  world.solids = wallBoxes();
}
resetSolids();

export function addSolid(b: Box) {
  world.solids.push(b);
  return () => {
    world.solids = world.solids.filter((s) => s !== b);
  };
}

const overlaps = (b: Box, x: number, z: number, r: number) => x + r > b.x1 && x - r < b.x2 && z + r > b.z1 && z - r < b.z2;

function hits(x: number, z: number, r: number, ignore: Box[]) {
  for (const b of world.solids) {
    if (ignore.includes(b)) continue;
    if (overlaps(b, x, z, r)) return true;
  }
  return false;
}

/**
 * Moves pos by (dx,dz) with axis-separated sliding against AABBs.
 * Boxes we are already inside are ignored so nothing can get stuck
 * (e.g. the zombie climbing out of its coffin).
 */
export function moveWithCollision(pos: THREE.Vector3, dx: number, dz: number, r = PLAYER_RADIUS) {
  const ignore = world.solids.filter((b) => overlaps(b, pos.x, pos.z, r));
  if (!hits(pos.x + dx, pos.z, r, ignore)) pos.x += dx;
  if (!hits(pos.x, pos.z + dz, r, ignore)) pos.z += dz;
}

export function inBox(b: Box, x: number, z: number) {
  return x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2;
}

export const forwardOf = (yaw: number) => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
