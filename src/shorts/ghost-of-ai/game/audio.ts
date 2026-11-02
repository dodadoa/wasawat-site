// Tiny procedural sound design with WebAudio: no audio files, PS1 budget.
import type { FloorId } from "./level";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

function noiseBuffer(seconds = 1) {
  const c = ac();
  const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

let ambientStarted = false;
export function startAmbient() {
  const c = ac();
  if (c.state === "suspended") c.resume();
  if (ambientStarted) return;
  ambientStarted = true;

  // a soft, slowly breathing Fmaj7 pad: warm rather than ominous
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const g = c.createGain();
  g.gain.value = 0.035;
  const breath = c.createOscillator();
  breath.frequency.value = 0.07;
  const breathG = c.createGain();
  breathG.gain.value = 0.012;
  breath.connect(breathG).connect(g.gain);
  for (const [hz, detune] of [[87.3, 0], [174.6, 4], [220, -3], [261.6, 5], [329.6, -4]]) {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = hz;
    o.detune.value = detune;
    o.connect(lp);
    o.start();
  }
  lp.connect(g).connect(master!);
  breath.start();

  // wind
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(4);
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 400;
  bp.Q.value = 0.6;
  const wg = c.createGain();
  wg.gain.value = 0.025;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.11;
  const lfoG = c.createGain();
  lfoG.gain.value = 250;
  lfo.connect(lfoG).connect(bp.frequency);
  src.connect(bp).connect(wg).connect(master!);
  src.start();
  lfo.start();

  startRain();
}

// Rain: a hiss on the glass, and a softer patter underneath. setRainRoom
// changes how it sounds from where you are.
let rainLp: BiquadFilterNode | null = null;
let rainLow: GainNode | null = null;
function startRain() {
  const c = ac();
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(5);
  src.loop = true;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  rainLp = c.createBiquadFilter();
  rainLp.type = "lowpass";
  rainLp.frequency.value = 2600;
  const g = c.createGain();
  g.gain.value = 0.05;
  // gusts
  const gust = c.createOscillator();
  gust.frequency.value = 0.05;
  const gustG = c.createGain();
  gustG.gain.value = 0.02;
  gust.connect(gustG).connect(g.gain);
  src.connect(hp).connect(rainLp).connect(g).connect(master!);

  // heavy drops on the sill / the roof
  const low = c.createBiquadFilter();
  low.type = "bandpass";
  low.frequency.value = 220;
  low.Q.value = 0.8;
  rainLow = c.createGain();
  rainLow.gain.value = 0.06;
  src.connect(low).connect(rainLow).connect(master!);
  src.start();
  gust.start();
}

/** By the street doors the rain is on the pavement; on the bistro floor, the windows; upstairs, the roof. */
const RAIN_ROOM: Record<FloorId, { lp: number; low: number }> = {
  lobby: { lp: 3400, low: 0.05 },
  bar: { lp: 2600, low: 0.06 },
  cinema: { lp: 1300, low: 0.12 },
};
export function setRainRoom(room: FloorId) {
  if (!ctx || !rainLp || !rainLow) return;
  const now = ctx.currentTime;
  rainLp.frequency.setTargetAtTime(RAIN_ROOM[room].lp, now, 0.6);
  rainLow.gain.setTargetAtTime(RAIN_ROOM[room].low, now, 0.6);
}

/** A crack (when it's close) and a long roll. `loud` in 0..1. */
export function thunder(loud: number) {
  if (!ctx || !ambientStarted) return;
  const c = ctx;
  const dur = 3 + loud * 3;
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(dur);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(200 + loud * 900, c.currentTime);
  lp.frequency.exponentialRampToValueAtTime(90, c.currentTime + dur);
  const g = c.createGain();
  const peak = 0.15 + loud * 0.55;
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(peak, c.currentTime + 0.05 + (1 - loud) * 0.5);
  // it rolls: a few swells as it travels away
  let at = c.currentTime + 0.4;
  while (at < c.currentTime + dur - 0.6) {
    g.gain.exponentialRampToValueAtTime(peak * (0.25 + Math.random() * 0.5), at);
    at += 0.3 + Math.random() * 0.7;
  }
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  s.connect(lp).connect(g).connect(master!);
  s.start();
}

export function footstep(stone = false) {
  const c = ac();
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(0.1);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = stone ? 900 : 420;
  const g = c.createGain();
  g.gain.setValueAtTime(0.25, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09);
  s.connect(f).connect(g).connect(master!);
  s.start();
}

export function doorCreak() {
  const c = ac();
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(90, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(260, c.currentTime + 0.7);
  o.frequency.exponentialRampToValueAtTime(70, c.currentTime + 1.1);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 600;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.2);
  o.connect(f).connect(g).connect(master!);
  o.start();
  o.stop(c.currentTime + 1.25);
  // slam
  setTimeout(() => {
    const s = c.createBufferSource();
    s.buffer = noiseBuffer(0.3);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 200;
    const sg = c.createGain();
    sg.gain.setValueAtTime(0.5, c.currentTime);
    sg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    s.connect(lp).connect(sg).connect(master!);
    s.start();
  }, 1150);
}

export function groan() {
  const c = ac();
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(70, c.currentTime);
  o.frequency.linearRampToValueAtTime(55, c.currentTime + 1.6);
  const v = c.createOscillator();
  v.frequency.value = 5.5;
  const vg = c.createGain();
  vg.gain.value = 6;
  v.connect(vg).connect(o.frequency);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(300, c.currentTime);
  f.frequency.linearRampToValueAtTime(900, c.currentTime + 0.5);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.2, c.currentTime + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.8);
  o.connect(f).connect(g).connect(master!);
  o.start();
  v.start();
  o.stop(c.currentTime + 1.9);
  v.stop(c.currentTime + 1.9);
}

export function hurt() {
  const c = ac();
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(0.4);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 700;
  const g = c.createGain();
  g.gain.setValueAtTime(0.6, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  s.connect(f).connect(g).connect(master!);
  s.start();
}

export function sting() {
  const c = ac();
  [220, 233, 311].forEach((hz, i) => {
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.value = hz;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.02);
    g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.05 + i * 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.4);
    o.connect(g).connect(master!);
    o.start();
    o.stop(c.currentTime + 1.5);
  });
}

export function pickup() {
  const c = ac();
  [523, 659, 784].forEach((hz, i) => {
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.value = hz;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.08 + 0.25);
    o.connect(g).connect(master!);
    o.start(c.currentTime + i * 0.08);
    o.stop(c.currentTime + i * 0.08 + 0.3);
  });
}

/** Breathy noise through two vowel-ish formants, roughly as long as the line. */
export function whisper(chars: number) {
  const c = ac();
  const dur = Math.min(3.5, 0.6 + chars * 0.025);
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  // syllable-rate tremolo
  const trem = c.createOscillator();
  trem.frequency.value = 4.5;
  const tg = c.createGain();
  tg.gain.value = 0.05;
  trem.connect(tg).connect(g.gain);
  for (const [hz, q] of [[900, 6], [2400, 8]]) {
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(hz, c.currentTime);
    bp.frequency.linearRampToValueAtTime(hz * 0.8, c.currentTime + dur);
    bp.Q.value = q;
    s.connect(bp).connect(g);
  }
  g.connect(master!);
  s.start();
  trem.start();
  s.stop(c.currentTime + dur);
  trem.stop(c.currentTime + dur);
}


let roomIR: AudioBuffer | null = null;
/** A long, dark tail of decaying noise: the house answering back. */
function room() {
  const c = ac();
  if (roomIR) return roomIR;
  const len = Math.floor(c.sampleRate * 2.4);
  roomIR = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = roomIR.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
  }
  return roomIR;
}

/** Every spoken line is brought to this loudness (RMS of its voiced parts, dBFS). */
const VOICE_TARGET_DB = -19;

/**
 * Gain that brings a line to VOICE_TARGET_DB. Measured over 50 ms windows,
 * skipping the pauses, so a line with long silences isn't pushed too loud.
 */
function normalize(buf: AudioBuffer) {
  const d = buf.getChannelData(0);
  const win = Math.floor(buf.sampleRate * 0.05);
  let sum = 0, n = 0;
  for (let i = 0; i + win <= d.length; i += win) {
    let w = 0;
    for (let k = i; k < i + win; k++) w += d[k] * d[k];
    w /= win;
    if (w > 1e-5) {
      // louder than about -50 dBFS: someone is speaking
      sum += w;
      n++;
    }
  }
  if (!n) return 1;
  const db = 10 * Math.log10(sum / n);
  return Math.min(6, Math.max(0.25, Math.pow(10, (VOICE_TARGET_DB - db) / 20)));
}

let absCurve: Float32Array<ArrayBuffer> | null = null;

/**
 * Play a spoken line (encoded audio) as the ghost: a clear voice, whispered
 * close. The words stay in front, with less chest and a little more
 * consonant so every one is easy to follow; under them, a breath of air that
 * rises and falls with the voice; behind them, a faint double that drifts in
 * time, and a reverb, as if it isn't quite in the room. Through the floor it
 * also loses its top end. Each line is normalized to the same loudness,
 * whichever voice made it, and a compressor holds the peaks.
 * `elapsed()` is how far into the line playback is, in seconds.
 */
export async function playVoice(data: ArrayBuffer, { muffled = false, plain = false } = {}) {
  const c = ac();
  const buf = await c.decodeAudioData(data);
  const s = c.createBufferSource();
  s.buffer = buf;

  const voice = c.createGain();
  voice.gain.value = normalize(buf);
  const out = c.createGain();
  out.gain.value = muffled ? 0.35 : 1;

  // thin the chest out and lift the consonants: close and hushed, still clear
  const thin = c.createBiquadFilter();
  thin.type = "lowshelf";
  thin.frequency.value = 220;
  thin.gain.value = plain ? -2 : -7;
  const presence = c.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 3000;
  presence.Q.value = 1;
  presence.gain.value = plain ? 1 : 3;
  s.connect(voice).connect(thin).connect(presence);

  const dry = c.createGain();
  dry.gain.value = 0.9;
  presence.connect(dry).connect(out);

  const verb = c.createConvolver();
  verb.buffer = room();
  const wet = c.createGain();
  wet.gain.value = plain ? 0.1 : 0.22;
  // the tail is airy, not boomy
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 300;
  presence.connect(hp).connect(verb).connect(wet).connect(out);

  // the breath: noise in the band where whispers live, opened and closed by
  // the voice's own envelope, about 10 dB under the words
  if (!absCurve) {
    absCurve = new Float32Array(1024);
    for (let i = 0; i < absCurve.length; i++) absCurve[i] = Math.abs((i / (absCurve.length - 1)) * 2 - 1);
  }
  const rect = c.createWaveShaper();
  rect.curve = absCurve;
  const env = c.createBiquadFilter();
  env.type = "lowpass";
  env.frequency.value = 30;
  const vca = c.createGain();
  vca.gain.value = 0;
  voice.connect(rect).connect(env).connect(vca.gain);
  const air = c.createBufferSource();
  air.buffer = noiseBuffer(buf.duration + 0.3);
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3500;
  band.Q.value = 0.7;
  const breath = c.createGain();
  breath.gain.value = plain ? 0 : 1.4;
  air.connect(band).connect(vca).connect(breath).connect(out);
  breath.connect(hp);

  // a faint second voice a breath behind, drifting in and out of time
  const echo = c.createDelay(0.1);
  echo.delayTime.value = 0.024;
  const drift = c.createOscillator();
  drift.frequency.value = 0.35;
  const depth = c.createGain();
  depth.gain.value = 0.005;
  drift.connect(depth).connect(echo.delayTime);
  const double = c.createGain();
  double.gain.value = plain ? 0 : 0.2;
  presence.connect(echo).connect(double).connect(out);

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;
  let tail: AudioNode = out.connect(comp);
  if (muffled) {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    tail = tail.connect(lp);
  }
  tail.connect(master!);

  air.start();
  drift.start();
  const quiet = () => {
    try {
      air.stop();
      drift.stop();
    } catch {}
  };
  const t0 = c.currentTime;
  s.start();
  const ended = new Promise<void>((r) => (s.onended = () => (quiet(), r())));
  return {
    duration: buf.duration,
    ended,
    elapsed: () => c.currentTime - t0,
    stop: () => {
      try {
        s.stop();
      } catch {}
      quiet();
    },
  };
}
