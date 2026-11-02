// The ghost's memory. Every memory has a strength in 0..1 that decays over
// time and comes back when it is recalled: when the ghost tells it, or when a
// visitor examines the thing it belongs to. How a memory is spoken depends on
// its strength: whole, then with words missing, then mixed up with another
// memory, then only a few words.
//
// The ghost is not a dead person. It is the house's own spirit (เจ้าที่, the
// one who was here first), and it remembers in layers: the building on Decho
// Road was a family home for about thirty years, then a clinic, a pharmacy, an
// antique shop and a jeweller's before it became Sala Saneha. The vault that
// now holds the wine, the small lift for diamonds, the parquet and the old
// paint are all still there. As memories fade they tangle across those lives,
// so the jeweller's counter and the bar counter become the same counter.
//
// Those eras and objects come from published accounts of the venue (Time Out
// Bangkok, HappeningBKK). The moments inside them are invented: swap them for
// collected stories.
import type { FloorId } from "./level";
import { CX, LX } from "./level";

/** Which of the building's lives a memory belongs to. */
export type Era = "home" | "clinic" | "pharmacy" | "antiques" | "jeweller" | "now" | "always";
export const ERA_LABEL: Record<Era, string> = {
  home: "when it was a family home",
  clinic: "when it was a clinic",
  pharmacy: "when it was a pharmacy",
  antiques: "when it was an antique shop",
  jeweller: "when it was a jeweller's",
  now: "since it became Sala Saneha",
  always: "through every one of its lives",
};

export type Memory = {
  id: string;
  floor: FloorId;
  era?: Era;
  /** where it happened; the ghost recalls memories near itself and you */
  spot?: [number, number];
  /** "late" memories surface after dark (local clock) */
  when?: "late";
  lines: string[];
  /**
   * Where a love story ends up as it fades. Remembered clearly, the ending is
   * the happy one; fading, it slides toward this: someone who went, a seat
   * still warm, a glass too many.
   */
  turn?: string;
  strength: number;
  /** left by a visitor (seed memories never vanish completely) */
  visitor?: boolean;
  /** wall-clock ms of the last recall */
  recalled?: number;
};

/** Half-life while the game is open, in seconds. */
const HALF_LIFE_PLAYING = 240;
/** Half-life between visits, in seconds (two days). */
const HALF_LIFE_AWAY = 2 * 24 * 3600;
/** Seed memories never fade below this: the building keeps its bones. */
const SEED_FLOOR = 0.06;
/** Visitor memories below this are gone for good. */
const VISITOR_GONE = 0.04;
const RECALL_BOOST = 0.3;
const STORAGE_KEY = "sala-saneha-ghost-v1";

const seeds: Omit<Memory, "strength">[] = [
  // Tone: sad and haunted. Every life the house had ended, and everyone in
  // them left, one way or another; the house is still here keeping their
  // places. Clear, a memory is grief for someone missing. Fading, it turns
  // (see `turn`): the absence starts behaving like a presence. A seat stays
  // warm, a glass empties, a voice keeps counting. Never violent, never a
  // jump: what haunts is what's missing and what repeats.
  // ---- the way in (floor 1): where every shop the house ever was met the street
  { id: "bar-offering", floor: "lobby", era: "always", spot: [LX + 3.3, 1.3], lines: ["Every family left me something on the shelf. Jasmine. Red soda with a straw.", "The families are gone. Someone still changes the jasmine. I don't know who anymore."] },
  { id: "bar-pharmacy", floor: "lobby", era: "pharmacy", spot: [LX - 2.4, 2.4], lines: ["Small paper envelopes. Three times a day, after food.", "The pharmacist wrote take care on every one. Some were never picked up."], turn: "There's still a name on the last one. It fades a little more each time I look." },
  { id: "lob-door", floor: "lobby", era: "always", spot: [LX, 1.0], lines: ["The street door has let everyone in, and everyone out.", "It doesn't remember faces. I do."], turn: "Some nights it opens a hand's width for someone who never comes through." },
  { id: "lob-shopfront", floor: "lobby", era: "jeweller", spot: [LX - 3.0, 2.7], lines: ["Behind the frosted doors there was a window full of rings.", "Couples stood on the step and chose a future with their fingertips on the glass."], turn: "Their fingerprints are still on the glass, side by side. I don't let anyone wipe them." },
  { id: "lob-posters", floor: "lobby", era: "now", spot: [LX + 3.2, 3.4], lines: ["Every film that plays here leaves its poster on the board for a week.", "Then the next goes over it. Under the cork they are all still there, one on top of another."], turn: "Lately I can't tell which film is showing. They all end the same way." },
  { id: "lob-screen", floor: "lobby", era: "now", spot: [LX + 3.3, 4.8], lines: ["The screen by the stairs shows a poem nobody stops to read.", "It was written for someone. I have read it every night for years. I still don't know who."] },
  { id: "lob-lift", floor: "lobby", era: "jeweller", spot: [LX + 2.1, 6.2], lines: ["The little lift starts down here, behind the narrow door.", "Diamonds went up it in velvet bags. Now it carries nothing, and I still hear it rise."], turn: "Some nights it comes down with something in it. Jasmine. A ring box. Never the same thing twice." },
  { id: "lob-stair", floor: "lobby", era: "home", spot: [LX + 0.6, 7.4], lines: ["The stairs are the oldest thing in me that still moves.", "A child counted them every night going up to bed. Fourteen. She always said fifteen."], turn: "Some nights I count fifteen." },
  { id: "lob-rain", floor: "lobby", era: "home", spot: [LX - 3.0, 8.2], lines: ["When the street flooded, the family carried everything up these stairs.", "The water stopped at the third step. The line is still on the wall, under the paint."], turn: "Every rainy season I feel it rising to the third step again, and nobody carrying anything up." },
  // ---- bookshop, wine room, bistro (floor 2)
  { id: "bar-name", floor: "bar", era: "always", lines: ["Sala Saneha. A pavilion for affection.", "They named me for love. Most of what I keep is what love left behind."] },
  { id: "bar-counter", floor: "bar", era: "jeweller", spot: [-8.2, 8.4], lines: ["This counter was glass once. Rings lay on velvet under it.", "Couples leaned over it to choose one. Not all of them came back for it."], turn: "One ring is still under the glass. Nobody else can see it. I keep it clean." },
  { id: "bar-bottles", floor: "bar", era: "antiques", spot: [-2.3, 10.0], lines: ["Before the bottles, the shelves held other people's treasures.", "Clocks. Bowls. Somebody's spectacles. Things nobody came back for."], turn: "Some nights the clocks still tick behind the bottles. All of them stopped at the same hour." },
  { id: "bar-vault", floor: "bar", era: "jeweller", spot: [-0.8, 10.0], lines: ["The vault was locked every evening at six.", "Some things went in and never came out. I still hear the wheel turn at six."] },
  { id: "bar-lift", floor: "bar", era: "jeweller", spot: [4.0, 6.0], lines: ["There is a lift in the wall, too small for a hand. It was for diamonds.", "A ring went up in it once, wrapped in a note. It came back down unopened."], turn: "Now it rises on its own on rainy nights, and comes back down empty." },
  { id: "bar-paint", floor: "bar", era: "home", spot: [-2.0, 6.6], lines: ["Under the cream there is pink. Under the pink, a green somebody chose first.", "Every life here painted over the one before. I can still hear them under there."], turn: "Under the green, a child's height in pencil. One mark, then no more." },
  { id: "bar-parquet", floor: "bar", era: "home", spot: [3.8, 1.6], lines: ["The parquet is the oldest voice in the room.", "It still gives by the window, where two people danced on Sundays. Until one of them couldn't."], turn: "Lately it gives where only one of them stands, swaying to nothing." },
  { id: "bar-books", floor: "bar", era: "now", spot: [2.4, 1.0], lines: ["People leave a card in the books here. A line for whoever reads it next.", "Most cards are for strangers. One is for someone who used to sit at the round table."], turn: "The card is still there. The one it was for doesn't come anymore. I read it to the empty chair." },
  { id: "bar-table", floor: "bar", era: "home", spot: [2.6, 2.8], lines: ["The family ate at this table. Four chairs, then three.", "They kept laying the fourth place for a year. Nobody could say when to stop."], turn: "I still hear a fourth chair pulled out, very softly, when the others sit down." },
  { id: "bar-tea", floor: "bar", era: "now", spot: [3.0, 2.0], lines: ["In the day there is tea in here. Chrysanthemum steam on the windows.", "Someone writes a name in the steam every afternoon. It's gone before I can read it."] },
  { id: "bar-curtain", floor: "bar", era: "home", spot: [2.4, 10.3], lines: ["When it rained, the curtains breathed.", "A child hid behind them to watch the road for her father's car."], turn: "On stormy nights someone stands behind them still, watching the road for headlights." },
  { id: "bar-stairs", floor: "bar", era: "home", spot: [1.0, 7.0], lines: ["These stairs were for the family once. The shop was downstairs, the living up here.", "I still listen for their feet coming up at night."], turn: "Some nights there are more footsteps going up than coming down." },
  { id: "bar-clinic", floor: "bar", era: "clinic", spot: [-1.8, 4.4], lines: ["A nurse hummed in this room between patients.", "The same few bars of a love song, every day for years. Then one day, nothing."], turn: "I hum it for her sometimes. I've forgotten how it ends." },
  { id: "bar-sofa", floor: "bar", era: "now", spot: [-1.75, 1.6], lines: ["A birthday. Someone was too shy to sing, so they whistled the song instead.", "It was the last one they all had together. The whistle is still in the cushions."], turn: "Sometimes the cushions whistle on their own. Only the first few notes." },
  { id: "bar-roses", floor: "bar", era: "home", spot: [-8.2, 4.6], lines: ["The roses on the great lamp were a dress once, and before that, curtains.", "A bride wore them down the stairs. The house has kept the cloth longer than it kept her."], turn: "When it sways, I think she is turning in it again, to see who's watching." },
  { id: "bar-red-chair", floor: "bar", era: "now", spot: [-10.9, 6.4], lines: ["Two people sat here until the candles burned down.", "They had only just met. They promised to meet here again."], turn: "One of them still comes on rainy nights, alone, and orders two glasses." },
  { id: "bar-coasters", floor: "bar", era: "now", spot: [-5.9, 8.4], lines: ["People write on the coasters. Names. Numbers. Things they couldn't say out loud.", "Write yours. I keep everything. It's all I'm still good for."], turn: "Most of the numbers don't ring anymore. I keep them anyway." },
  { id: "bar-stool", floor: "bar", era: "now", spot: [-7.3, 8.0], lines: ["The fourth stool wobbles.", "Someone said yes on it. Nobody has had the heart to fix it."], turn: "They never sat on it again. It still wobbles, as if someone has just got up." },
  { id: "bar-last-call", floor: "bar", era: "now", spot: [-7.0, 8.4], when: "late", lines: ["Last call is only a suggestion.", "Somebody always stays for one more song, watching the door."], turn: "Some nights the one who stays is waiting for someone who isn't coming. I sit with them." },
  { id: "bar-hum", floor: "bar", era: "now", spot: [-1.6, 9.6], when: "late", lines: ["After midnight the bottles hum a little.", "Like a note held too long, for someone who already left."] },
  { id: "bar-both", floor: "bar", era: "now", lines: ["Upstairs, people watch. Down here, people tell.", "I keep both. I can't seem to put anything down."] },
  { id: "bar-storm", floor: "bar", era: "now", spot: [-6.0, 1.0], lines: ["The power went out in a storm once. Everyone lit candles and moved closer.", "Two strangers left together under one umbrella. Only the umbrella came back."], turn: "When the lights came back there was one more glass on the bar than there were people." },
  { id: "bar-green-chair", floor: "bar", era: "clinic", spot: [-15.1, 7.2], lines: ["This is where you waited to be called.", "Some names were called twice. Nobody stood up."], turn: "One woman waited here every evening. The door opened for everyone else." },
  // ---- the cinema (floor 3)
  { id: "cin-sun", floor: "cinema", era: "now", spot: [CX + 2.4, 9.4], lines: ["Someone hung a sun over the stairwell, where no window could fit.", "It never sets. I envy it that."] },
  { id: "cin-gate", floor: "cinema", era: "jeweller", spot: [CX + 5.0, 10.2], lines: ["The gate is from the jeweller's time. The stock slept up here behind it.", "Every night he counted it and locked it. One night he counted it twice, and sat down on the floor."], turn: "I hear the count some nights, through the bars. It always comes out one short." },
  { id: "cin-wall", floor: "cinema", era: "home", spot: [CX + 8.8, 0.8], lines: ["They built a metal room inside my top floor and put the dark in it.", "My old walls are still behind the panels. The bedroom blue. The height marks."], turn: "When the lights in the panels hum, I can hear the old room breathing behind them." },
  { id: "cin-bedroom", floor: "cinema", era: "home", spot: [CX + 11.4, 6.4], lines: ["Before the screen, the family slept up here.", "It's the same dark. I still count the beds at night."], turn: "One bed was empty after that year. I still turn its blanket down." },
  { id: "cin-bed", floor: "cinema", era: "clinic", spot: [CX + 10.4, 0.7], lines: ["There was a narrow bed here once, by the window.", "People lay in it and watched the light move on the ceiling. Some watched it go out."] },
  { id: "cin-radio", floor: "cinema", era: "home", spot: [CX + 14.2, 3.2], when: "late", lines: ["A transistor radio played love songs up here, very quietly.", "It kept playing after the last of them stopped listening."], turn: "Some nights I hear it between stations. Someone's name, over and over." },
  { id: "cin-screen", floor: "cinema", era: "now", spot: [CX + 11.4, 2.2], lines: ["The film always skipped at the same frame.", "Someone turning in a doorway, smiling at whoever never walks in."], turn: "Lately the doorway is empty. Only the light, and the smile still on the wall." },
  { id: "cin-start", floor: "cinema", era: "now", spot: [CX + 11.4, 3.0], lines: ["Nothing comes before the film. No trailers. No voice asking for silence.", "Just the dark, and whoever sat here before you, still settling."] },
  { id: "cin-row", floor: "cinema", era: "now", spot: [CX + 12.0, 6.3], lines: ["The loveseat in row C.", "The same two people every Thursday. By spring they were sharing one coat."], turn: "Then one Thursday only one came. The coat sat folded on the empty half all film." },
  { id: "cin-glass", floor: "cinema", era: "now", spot: [CX + 11.55, 5.4], lines: ["They let you bring your glass in.", "Sometimes one is left behind, half full. Nobody ever comes back for it."], turn: "The lipstick on the rim is always the same shade. Every time. For years." },
  { id: "cin-chairs", floor: "cinema", era: "now", spot: [CX + 9.6, 7.4], lines: ["They move the chairs for every film.", "I put one back where it used to be. Every night. Nobody notices."] },
  { id: "cin-booth", floor: "cinema", era: "now", spot: [CX + 7.3, 7.4], lines: ["The projectionist talks to the films.", "He says goodnight to each one before he rewinds it. Nobody says it to him."] },
  { id: "cin-white", floor: "cinema", era: "now", spot: [CX + 11.4, 2.6], lines: ["Once, the screen went white and nobody minded.", "Two hands found each other in all that light."], turn: "When the picture came back, one of the seats was empty. It had been empty all along." },
  { id: "cin-aisle", floor: "cinema", era: "now", spot: [CX + 14.3, 5.2], lines: ["Someone crawled down this aisle looking for an earring.", "They never found it. I have it. I don't know how to give it back."] },
  { id: "cin-last", floor: "cinema", era: "now", spot: [CX + 11.4, 4.2], when: "late", lines: ["The last screening ends but the light stays on the wall a while.", "Like the room can't bear to let it go. I know the feeling."] },
  { id: "cin-curtain", floor: "cinema", era: "now", spot: [CX + 14.0, 1.0], lines: ["The velvet at the door opens slower than it closes.", "Endings come so quickly up here."], turn: "Someone used to wait behind it for the lights to go down. Sometimes it still bulges, just there." },
  { id: "cin-dark", floor: "cinema", era: "always", spot: [CX + 9.6, 8.8], lines: ["People lean closer in the dark.", "I count them every night. The count is never quite right."] },
  { id: "cin-storm", floor: "cinema", era: "home", spot: [CX + 12.0, 0.7], lines: ["In the rainy season the family slept to the roof drumming.", "Two of them stayed awake to count between the lightning and the thunder, holding hands."], turn: "The counting still goes on up here, some storms. One voice. It stops at the same number." },
  { id: "cin-rules", floor: "cinema", era: "now", lines: ["Popcorn in the bar. Wine in the cinema.", "Rules were for the daytime. It's always late up here now."] },
];

// Seeds start at different strengths so some are already half-gone.
const seedStrength = (i: number) => 0.35 + ((i * 37) % 60) / 100;

let memories: Memory[] = [];
let loaded = false;
let dirty = false;
let lastSave = 0;

type Saved = { at: number; strengths: Record<string, [number, number?]>; visitors: Memory[] };

function read(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export function loadMemories() {
  if (loaded) return;
  loaded = true;
  const saved = read();
  memories = seeds.map((m, i) => {
    const s = saved?.strengths[m.id];
    return { ...m, strength: s?.[0] ?? seedStrength(i), recalled: s?.[1] };
  });
  if (saved?.visitors) memories.push(...saved.visitors);
  // time away from the bar fades everything a little
  if (saved) decay((Date.now() - saved.at) / 1000, HALF_LIFE_AWAY);
}

export function saveMemories(force = false) {
  const now = Date.now();
  if (!force && (!dirty || now - lastSave < 5000)) return;
  lastSave = now;
  dirty = false;
  const data: Saved = {
    at: now,
    strengths: Object.fromEntries(memories.filter((m) => !m.visitor).map((m) => [m.id, [m.strength, m.recalled]])),
    visitors: memories.filter((m) => m.visitor),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // private mode / storage blocked: the ghost just forgets everything on reload
  }
}

function decay(seconds: number, halfLife: number) {
  if (seconds <= 0) return;
  const k = Math.pow(0.5, seconds / halfLife);
  for (const m of memories) m.strength = Math.max(m.visitor ? 0 : SEED_FLOOR, m.strength * k);
  memories = memories.filter((m) => !m.visitor || m.strength >= VISITOR_GONE);
  dirty = true;
}

/** Called every frame while playing. */
export function tickMemories(dt: number) {
  decay(dt, HALF_LIFE_PLAYING);
  saveMemories();
}

export function recall(id: string, amount = RECALL_BOOST) {
  const m = memories.find((x) => x.id === id);
  if (!m) return;
  m.strength = Math.min(1, m.strength + amount);
  m.recalled = Date.now();
  dirty = true;
}

/** Returns the new memory's id, so the ghost can answer it. */
export function addVisitorMemory(text: string, floor: FloorId, x: number, z: number) {
  const id = `visitor-${Date.now()}-${memories.length}`;
  memories.push({ id, floor, spot: [x, z], lines: [text], strength: 0.95, visitor: true, recalled: Date.now() });
  dirty = true;
  saveMemories(true);
  return id;
}

export function allMemories(): readonly Memory[] {
  return memories;
}

export const isLate = () => {
  const h = new Date().getHours();
  return h >= 18 || h < 5;
};

/**
 * Picks what the ghost remembers here and now: weighted by strength, by how
 * close the memory's spot is, by the time of day, and against repeating
 * whatever it said most recently. What visitors left is on its mind most: it
 * follows them up and down the stairs and outweighs its own memories.
 */
export function pickMemory(floor: FloorId, x: number, z: number): Memory | null {
  const late = isLate();
  const now = Date.now();
  let total = 0;
  const weighted = memories
    .filter((m) => m.floor === floor || m.visitor)
    .map((m) => {
      const d = m.spot && m.floor === floor ? Math.hypot(m.spot[0] - x, m.spot[1] - z) : 4;
      // a visitor's memory haunts the whole floor, not just where it was written
      const near = Math.max(m.visitor ? 0.5 : 0, 1 / (1 + (d / 2.5) ** 2));
      const time = m.when === "late" ? (late ? 2 : 0.15) : 1;
      const fresh = m.recalled ? Math.min(1, (now - m.recalled) / 60000) : 1; // just said it? less likely
      const visitor = m.visitor ? (m.floor === floor ? 4 : 2) : 1; // what visitors left is on its mind
      const w = (0.2 + m.strength) * near * time * (0.1 + 0.9 * fresh) * visitor;
      total += w;
      return { m, w };
    });
  let r = Math.random() * total;
  for (const { m, w } of weighted) if ((r -= w) <= 0) return m;
  return weighted[weighted.length - 1]?.m ?? null;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean);

/** Drop words with probability p, collapsing gaps into a single ellipsis. */
function erode(line: string, p: number) {
  const out: string[] = [];
  for (const w of words(line)) {
    if (Math.random() < p) {
      if (out[out.length - 1] !== "…") out.push("…");
    } else out.push(w);
  }
  return out.join(" ");
}

/** The few words that survive longest: the longest ones. */
function fragments(m: Memory, n: number) {
  const ws = told(m, 0).flatMap(words).map((w) => w.replace(/[.,!?"]/g, ""));
  const keep = [...new Set(ws)].sort((a, b) => b.length - a.length).slice(0, n + 2);
  const picked = keep.sort(() => Math.random() - 0.5).slice(0, n);
  return `… ${picked.join(" … ")} …`;
}

/** Turns a memory into what the ghost actually says, given how faded it is. */
/**
 * The lines as the house remembers them at strength `s`: once a memory has
 * started to fade, its ending often slides into the turn.
 */
function told(m: Memory, s: number) {
  if (!m.turn || s >= 0.7 || Math.random() > 0.35 + (0.7 - s)) return m.lines;
  return [...m.lines.slice(0, -1), m.turn];
}

export function speak(m: Memory, muffled = false): string[] {
  const s = muffled ? m.strength * 0.3 : m.strength;
  if (s >= 0.7) return m.lines;
  if (s >= 0.4) return told(m, s).map((l) => erode(l, (0.7 - s) * 1.6));
  if (s >= 0.18) {
    // it has started mixing this up with something else from the same floor
    // What a visitor left seeps in first; otherwise it confuses one of its
    // lives with another: the jeweller's counter becomes the bar counter, the
    // clinic bed becomes a cinema seat.
    const visitors = memories.filter((o) => o !== m && o.visitor);
    const faded = memories.filter((o) => o !== m && o.floor === m.floor && o.strength < 0.6);
    const otherLives = faded.filter((o) => o.era !== m.era);
    const others =
      visitors.length && Math.random() < 0.6 ? visitors : otherLives.length && Math.random() < 0.75 ? otherLives : faded;
    const other = others[Math.floor(Math.random() * others.length)];
    const a = words(m.lines[0]);
    if (!other) return [erode(m.lines[0], 0.35)];
    const ending = told(other, other.strength);
    const b = words(ending[ending.length - 1]);
    const mixed = [...a.slice(0, Math.ceil(a.length / 2)), ...b.slice(Math.floor(b.length / 2))].join(" ");
    return [erode(mixed, 0.3)];
  }
  return [fragments(m, 2 + Math.floor(Math.random() * 2))];
}

/**
 * The visitors' memories other than `m`, as they survive now, for Claude to
 * weave into whatever the ghost is telling: the strongest first.
 */
export function visitorEchoes(m: Memory, n = 3): string[] {
  return memories
    .filter((o) => o.visitor && o !== m)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, n)
    .map((o) => speak(o)[0]);
}

/** Set by interactions: the next thing the ghost will want to talk about. */
export const memoryBus = { pending: null as string | null };
