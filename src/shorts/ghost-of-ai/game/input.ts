// Keyboard and gamepad state singleton. The player controller reads this each frame.
export type Action = "forward" | "back" | "left" | "right" | "run" | "interact" | "quickturn" | "scheme" | "memories" | "role";

const keymap: Record<string, Action> = {
  ArrowUp: "forward", KeyW: "forward",
  ArrowDown: "back", KeyS: "back",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  ShiftLeft: "run", ShiftRight: "run",
  Enter: "interact", KeyE: "interact", Space: "interact",
  KeyQ: "quickturn",
  Tab: "scheme",
  KeyM: "memories",
  KeyG: "role",
};

/**
 * Each gamepad button is the key it stands in for, so the title screen, the
 * webcam and the text boxes take it with no help. Button numbers as the browser
 * reports them for a pad it knows ("standard"), and for one it doesn't.
 */
const STANDARD_PAD: Record<number, string> = {
  0: "Enter", 1: "ShiftLeft", 2: "KeyQ", 3: "KeyM",
  4: "KeyK", 5: "ShiftLeft", 6: "KeyV", 7: "ShiftLeft",
  8: "Tab", 9: "KeyG",
  12: "ArrowUp", 13: "ArrowDown", 14: "ArrowLeft", 15: "ArrowRight",
};
const RAW_PAD: Record<number, string> = {
  0: "Enter", 1: "ShiftLeft", 3: "KeyQ", 4: "KeyM",
  6: "KeyK", 7: "ShiftLeft", 8: "KeyV", 9: "ShiftLeft",
  10: "Tab", 11: "KeyG",
};
/** Where an unknown pad puts its right stick and its d-pad. */
const RAW_AXES = { rx: 2, ry: 5, hat: 9 };
const HAT = ["ArrowUp", "ArrowUp ArrowRight", "ArrowRight", "ArrowDown ArrowRight", "ArrowDown", "ArrowDown ArrowLeft", "ArrowLeft", "ArrowUp ArrowLeft"];
/** Stick travel ignored around the centre, and the push that counts as an arrow key. */
const DEAD = 0.2;
const PUSH = 0.5;
/** Pixels of mouse drag a right stick held over is worth, per second. */
const STICK_LOOK = 500;

/** The left stick past its dead zone, -1..1 with y forward: the directions between the arrow keys. */
const stick = { x: 0, y: 0 };
/** Pixels dragged with a mouse button down since the last frame. */
const look = { x: 0, y: 0 };
const held = new Set<Action>();
const pressed = new Set<Action>(); // edge-triggered, cleared each frame
let bound = false;
let padKeys = new Set<string>();

const dead = (v = 0) => (Math.abs(v) < DEAD ? 0 : v);

/** Press or let go of a key the way the keyboard would, on the box you're typing in if there is one. */
function sendKey(type: "keydown" | "keyup", code: string) {
  (document.activeElement ?? window).dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
}

function pollPad(dt: number) {
  const pad = navigator.getGamepads?.().find((p) => p?.connected);
  const next = new Set<string>();
  stick.x = stick.y = 0;
  if (pad) {
    const std = pad.mapping === "standard";
    for (const [i, code] of Object.entries(std ? STANDARD_PAD : RAW_PAD)) if (pad.buttons[+i]?.pressed) next.add(code);
    stick.x = dead(pad.axes[0]);
    stick.y = -dead(pad.axes[1]);
    if (stick.x < -PUSH) next.add("ArrowLeft");
    if (stick.x > PUSH) next.add("ArrowRight");
    if (stick.y > PUSH) next.add("ArrowUp");
    if (stick.y < -PUSH) next.add("ArrowDown");
    look.x += dead(pad.axes[std ? 2 : RAW_AXES.rx]) * STICK_LOOK * dt;
    look.y += dead(pad.axes[std ? 3 : RAW_AXES.ry]) * STICK_LOOK * dt;
    // a hat is one axis: eight even steps from -1, and past 1 when it's let go
    const hat = pad.axes[RAW_AXES.hat];
    if (!std && hat !== undefined && Math.abs(hat) <= 1) for (const code of HAT[Math.round((hat + 1) * 3.5)].split(" ")) next.add(code);
  }
  // in a text box B puts the pen down, and stays that until it's let go
  if ((document.activeElement instanceof HTMLInputElement || padKeys.has("Escape")) && pad?.buttons[1]?.pressed) {
    next.delete("ShiftLeft");
    next.add("Escape");
  }
  for (const code of next) if (!padKeys.has(code)) sendKey("keydown", code);
  for (const code of padKeys) if (!next.has(code)) sendKey("keyup", code);
  padKeys = next;
}

export function bindInput() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener("keydown", (e) => {
    // typing a memory into the text box: leave the keys to the box
    if (e.target instanceof HTMLInputElement) return;
    const a = keymap[e.code];
    if (!a) return;
    e.preventDefault();
    if (!held.has(a)) pressed.add(a);
    held.add(a);
  });
  window.addEventListener("keyup", (e) => {
    const a = keymap[e.code];
    if (a) held.delete(a);
  });
  window.addEventListener("blur", () => held.clear());
  window.addEventListener("mousemove", (e) => {
    if (!e.buttons) return;
    look.x += e.movementX;
    look.y += e.movementY;
  });
  // the Gamepad API has no events for buttons, and the title screen runs before the game loop
  let last = performance.now();
  const tick = (now: number) => {
    pollPad(Math.min((now - last) / 1000, 0.05));
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export const input = {
  down: (a: Action) => held.has(a),
  /** true only on the frame the key went down */
  justPressed: (a: Action) => pressed.has(a),
  stick,
  look,
  endFrame: () => {
    pressed.clear();
    look.x = look.y = 0;
  },
};
