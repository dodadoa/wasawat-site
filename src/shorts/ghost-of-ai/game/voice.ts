// The site's port runs without API keys, so the ghost and the guest speak the
// game's own local, rule-based lines.
import type { Memory } from "./memory";
import type { FloorId } from "./level";

export async function voiceLines(_m: Memory, faded: string[]): Promise<string[]> {
  return faded;
}

export type GuestEvent =
  | "examine" | "stir" | "cold" | "light" | "muse" | "door" | "stairs"
  | "point" | "beckon" | "wave" | "fist" | "touch" | "stroke" | "meet" | "grab" | "release" | "escape" | "shove" | "dodge"
  | "wake" | "rope" | "refuse" | "curtain" | "hall" | "answer" | "screen" | "becoming";
/** What it decides to do about a sign from you. */
export type GuestAction = "go" | "stay" | "back" | "run" | "reach" | "struggle" | "limp";
export type GuestMoment = {
  event: GuestEvent;
  floor: FloorId;
  late: boolean;
  thing: string[];
  led: boolean;
  notes: string[];
  /** what the hand is aimed at, and how it's making the sign */
  at: string;
  how: string;
  /** -1 afraid of you .. 1 trusts you */
  trust: number;
  /** what has passed between you so far, oldest first */
  past: string[];
  /** everything it has remembered so far, oldest first */
  memories: string[];
  /** a memory that has just come back */
  recovered: string[];
  /** what the film just said to it */
  heard: string;
};
export type GuestReply = { lines: string[]; action: GuestAction | null; trust: number };

/** Ghost mode: no model to ask here, so the guest always uses its local rules. */
export async function guestReply(_m: GuestMoment): Promise<GuestReply | null> {
  return null;
}
