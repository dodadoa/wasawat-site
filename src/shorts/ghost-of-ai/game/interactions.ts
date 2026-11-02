import type { Vector3 } from "three";
import { doors, interactables, type Door, type Interactable } from "./level";
import { world, you } from "./world";
import { useGame } from "./store";
import { doorCreak } from "./audio";
import { memoryBus, recall } from "./memory";

export type Nearby = { kind: "door"; door: Door } | { kind: "item"; item: Interactable };

export function findNearby(): Nearby | null {
  const p = world.player.pos;
  let best: { d: number; n: Nearby } | null = null;
  for (const door of doors) {
    const d = Math.hypot(p.x - door.x, p.z - door.z);
    if (d < 1.15 && (!best || d < best.d)) best = { d, n: { kind: "door", door } };
  }
  for (const item of interactables) {
    const d = Math.hypot(p.x - item.pos[0], p.z - item.pos[1]);
    if (d < (item.radius ?? 0.95) && (!best || d < best.d)) best = { d, n: { kind: "item", item } };
  }
  return best?.n ?? null;
}

/** The stairs you're standing at, if any: all a ghost has any use for. */
export function stairsNearby() {
  const p = you().pos;
  return doors.find((d) => d.to && Math.hypot(p.x - d.x, p.z - d.z) < 1.15) ?? null;
}

export function promptFor(n: Nearby | null) {
  if (!n) return null;
  if (n.kind === "door") return n.door.label;
  if (n.item.id === "coasters") return "▶ LEAVE A MEMORY";
  return "▶ EXAMINE";
}

export function interact(n: Nearby) {
  const s = useGame.getState();
  if (n.kind === "door") {
    // the street door never opens; the house doesn't let anyone go home
    if (n.door.exit) return s.say(["It won't open.", "Outside, the rain on Decho Road. It doesn't let up."]);
    return useDoor(n.door);
  }
  const { id, text, memory } = n.item;
  if (id === "coasters") {
    return s.say(["A stack of coasters and a pen on a string.", "Some have names on the back, and a date, and nothing else."], () => s.setWriting(true));
  }
  if (memory) {
    // looking at something keeps its memory alive, and the ghost notices
    recall(memory, 0.2);
    memoryBus.pending = memory;
  }
  if (text) s.say(text);
}

/** Takes you through a door, the screen fading around it. */
export function useDoor(d: Door) {
  const s = useGame.getState();
  const who = you();
  world.locked = true;
  doorCreak();
  s.setPrompt(null);
  s.clearWhisper();
  s.setFade(1);
  setTimeout(() => {
    passDoor(d, who);
  }, 650);
  setTimeout(() => s.setFade(0), 1350);
  setTimeout(() => (world.locked = false), 1750);
}

/** The other side of a door, at once: for the guest, whose stairs you only hear. */
export function passDoor(d: Door, who: { pos: Vector3; yaw: number }) {
  const to = d.to!;
  who.pos.set(to.x, 0, to.z);
  who.yaw = to.yaw;
}
