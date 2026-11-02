// The weather outside Sala Saneha: rain all night and a storm passing over
// the city. Lightning comes in uneven bursts, the thunder follows a moment
// later, and when it rolls the lamps brown out and come back, the way old
// wiring does. Read each frame by the windows, the lamps and the screen.
import { thunder } from "./audio";
import { WINDOWS } from "./level";

export const storm = {
  /** 0..1, lightning right now */
  flash: 0,
  /** 0..1 multiplier on the house's lamps; dips while thunder rolls */
  brown: 1,
  /** index of the window the two figures stand behind during this strike, or -1 */
  couple: -1,
};

type Pulse = { at: number; dur: number; amp: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

let t = 0;
let nextStrike = rand(4, 9);
let pulses: Pulse[] = [];
let brownFrom = -1;
let brownDepth = 0;
let coupleUntil = 0;

/** Lightning on the next frame (console debug hook: `__game.strike()`). */
export function strike() {
  nextStrike = t;
}

export function tickStorm(dt: number) {
  t += dt;
  if (t >= nextStrike) {
    // closer strikes are brighter, flicker more and answer sooner
    const near = Math.random();
    const amp = 0.45 + near * 0.55;
    pulses = [{ at: t, dur: 0.09, amp }];
    const after = 1 + Math.floor(Math.random() * 3);
    for (let i = 0, at = t; i < after; i++) {
      at += rand(0.08, 0.28);
      pulses.push({ at, dur: rand(0.05, 0.14), amp: amp * rand(0.4, 1) });
    }
    const delay = 0.3 + (1 - near) * 2.6;
    setTimeout(() => thunder(0.4 + near * 0.6), delay * 1000);
    brownFrom = t + delay;
    brownDepth = 0.25 + near * 0.45;
    // Now and then, in the brightest strikes, there are two people outside
    // the glass under one umbrella. They are only there while the light is.
    if (near > 0.55 && Math.random() < 0.45) {
      storm.couple = Math.floor(Math.random() * WINDOWS.length);
      coupleUntil = t + 1.2;
    }
    nextStrike = t + rand(9, 24);
  }

  let f = 0;
  for (const p of pulses) {
    const k = t - p.at;
    if (k >= 0) f = Math.max(f, p.amp * Math.exp(-k / p.dur));
  }
  storm.flash = f < 0.005 ? 0 : f;
  if (t > coupleUntil) storm.couple = -1;

  // brownout: a sag when the thunder lands, stuttering back over ~2 s
  if (brownFrom >= 0 && t >= brownFrom) {
    const k = t - brownFrom;
    const sag = brownDepth * Math.exp(-k / 0.7) * (0.75 + 0.25 * Math.sin(k * 31) * Math.sin(k * 7));
    storm.brown = 1 - sag;
    if (k > 3) brownFrom = -1;
  } else storm.brown = 1;
}
