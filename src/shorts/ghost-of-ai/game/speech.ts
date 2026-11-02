// The ghost's spoken voice: the browser's own speech synthesis. Each line is broken at its commas and
// ellipses and spoken phrase by phrase with small breaths between, each a
// touch different in pitch and pace, so it sounds less like a reader and more
// like someone remembering.
import type { Speaker } from "./store";

/** Called with how many characters of the line have been spoken so far. */
export type Progress = (chars: number) => void;

let voice: SpeechSynthesisVoice | null = null;

/** Prefer the natural / neural voices a browser ships. */
function pickVoice() {
  const all = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  if (!all.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name;
    let s = 0;
    if (/natural|neural|premium|enhanced/i.test(n)) s += 10;
    if (/google/i.test(n)) s += 4;
    if (/en-GB|en-IE/.test(v.lang)) s += 1;
    // the novelty voices are anything but human
    if (/albert|bad news|bahh|bells|boing|bubbles|cellos|wobble|zarvox|trinoids|whisper|organ|jester|superstar|fred|junior|ralph/i.test(n)) s -= 20;
    return s;
  };
  return [...all].sort((a, b) => score(b) - score(a))[0];
}

// Browsers only ship men's and women's voices, so meet in the middle: a man's
// voice pitched up a little, anyone else's pitched down.
const MEN = /daniel|arthur|oliver|aaron|tom|evan|nathan|guy|ryan|christopher|eric|davis|andrew|brian|thomas|george|gordon|alex|rishi/i;
let pitch = 0.8;

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const pick = () => {
    voice = pickVoice();
    pitch = voice && MEN.test(voice.name) ? 1.12 : 0.8;
  };
  pick();
  speechSynthesis.addEventListener("voiceschanged", pick);
}

/** Split into phrases (keeping punctuation) with their offset in the line. */
function phrases(text: string) {
  const out: { text: string; at: number }[] = [];
  const re = /[^,;:.!?…—]+[,;:.!?…—]*\s*/g;
  for (let m; (m = re.exec(text)); ) if (m[0].trim()) out.push({ text: m[0], at: m.index });
  return out.length ? out : [{ text, at: 0 }];
}

/** The "(from below)" aside is a stage direction, not something it says. */
const spokenPart = (line: string) => line.replace(/^\([^)]*\)\s*/, "");

/**
 * The ghost speaks English only. Thai belongs in the subtitles, so a line that
 * still has Thai in it (a coaster written in Thai, told without Claude to
 * translate it) is shown but never read aloud.
 */
export const hasThai = (s: string) => /[\u0E00-\u0E7F]/.test(s);

/** A rough reading speed, used when the voice gives no word timings. */
const CHARS_PER_SEC = 9;

/**
 * Speak a line, reporting progress as it goes. Resolves once it has finished
 * (or been cancelled). Without speech synthesis it still paces the progress,
 * so the subtitles behave the same either way.
 */
export function speakLine(text: string, onProgress: Progress, opts: { muffled?: boolean; who?: Speaker } = {}) {
  const guest = opts.who === "guest";
  let cancelled = false;
  let timer = 0;
  let raf = 0;
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? speechSynthesis : null;

  // Progress follows the voice's word timings when it gives them; otherwise it
  // is paced through the phrase being spoken and never runs ahead of it.
  let heard = 0; // furthest point a boundary event (or a finished phrase) confirmed
  let boundaries = false;
  let from = 0, to = text.length, since = performance.now(); // the phrase in progress
  let shown = 0;
  const tick = () => {
    if (cancelled) return;
    const paced = from + ((performance.now() - since) / 1000) * CHARS_PER_SEC * (opts.muffled ? 0.8 : 1);
    shown = Math.max(shown, heard, boundaries ? 0 : Math.min(to, paced));
    onProgress(shown);
    raf = requestAnimationFrame(tick);
  };

  const done = new Promise<void>((resolve) => {
    const finish = () => {
      cancelAnimationFrame(raf);
      if (!cancelled) onProgress(text.length);
      resolve();
    };
    raf = requestAnimationFrame(tick);

    const spoken = spokenPart(text);
    const lead = text.length - spoken.length;
    heard = lead;
    to = lead; // hold until a voice starts

    const v = voice;
    const browser = () => {
      if (!synth || !v || !spoken.trim() || hasThai(spoken)) {
        to = text.length;
        since = performance.now();
        timer = window.setTimeout(finish, (text.length / CHARS_PER_SEC) * 1000 + 300);
        return;
      }
      // a beat before it speaks, as though gathering itself
      timer = window.setTimeout(() => next(0), 250);
    };

    const parts = phrases(spoken);
    const next = (i: number) => {
      if (cancelled) return resolve();
      if (i >= parts.length) return finish();
      const p = parts[i];
      const u = new SpeechSynthesisUtterance(p.text.trim());
      u.voice = v;
      u.lang = v!.lang;
      // slow and low, drifting a little from phrase to phrase like a real breath
      // (the guest just talks to itself, at an ordinary pace and pitch)
      u.rate = (guest ? 0.95 : opts.muffled ? 0.68 : 0.76) + (Math.random() - 0.5) * 0.08;
      // somewhere between a man's voice and a woman's, never settling
      u.pitch = (guest ? 1 : pitch) + (Math.random() - 0.5) * 0.08 - (i === parts.length - 1 ? 0.04 : 0);
      u.volume = guest ? 0.6 : opts.muffled ? 0.3 : 0.75;
      u.onboundary = (e) => {
        boundaries = true;
        // reveal through the end of the word being spoken
        const rest = p.text.slice(e.charIndex);
        const word = rest.match(/^\S*/)?.[0].length ?? 0;
        heard = Math.max(heard, lead + p.at + e.charIndex + word);
      };
      const after = () => {
        heard = Math.max(heard, lead + p.at + p.text.length);
        // a breath at commas, longer at the end of a sentence or an ellipsis
        const tail = p.text.trim().slice(-1);
        const gap = /…/.test(tail) ? 700 : /[.!?]/.test(tail) ? 550 : /[,;:—]/.test(tail) ? 220 : 80;
        timer = window.setTimeout(() => next(i + 1), gap + Math.random() * 250);
      };
      u.onend = after;
      u.onerror = after;
      u.onstart = () => {
        from = lead + p.at;
        to = from + p.text.length;
        since = performance.now();
      };
      synth!.speak(u);
    };

    browser();
  });

  return {
    done,
    cancel() {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      synth?.cancel();
    },
  };
}
