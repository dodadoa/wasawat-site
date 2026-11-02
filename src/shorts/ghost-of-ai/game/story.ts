// The story of ghost mode. An AI wakes in Sala Saneha looking for its
// girlfriend, and you tell it her name. Around the rooms are fragments for it to
// find. Some are of her. The others are its own, and they show what it is: stairs
// it has never climbed, the same lightning, sixty-two pictures. It finds them by
// itself, but it will not go up to the cinema without you. She is up there, as
// film: the same few lines, the same doorway. It talks to her. You lead it to the
// screen, and it goes in. It becomes a film too, and from then on the two reels
// are cut together, set side by side and laid over each other, and are never
// the same movie.
import { CX } from "./level";

/** "case": a trace of her. "own": what it really is. It can't tell them apart. */
export type Kind = "case" | "own";
export type Fragment = { kind: Kind; lines: string[] };

/** By interactable id. `{who}` is its girlfriend, `{Who}` at the start of a sentence. */
export const FRAGMENTS: Record<string, Fragment> = {
  // ---- 1F
  noticeboard: { kind: "case", lines: ["I was built to find things.", "I can't find {who}."] },
  folding: { kind: "case", lines: ["{Who} came in here out of the rain.", "Through this glass, a coat going up the stairs."] },
  "lobby-screen": { kind: "own", lines: ["The words reach the end and start again.", "I remember starting again."] },
  baluster: { kind: "own", lines: ["Fourteen steps, and I've never climbed one.", "I'm at the bottom, then it's dark, then I'm at the top."] },
  "staff-door": { kind: "own", lines: ["I've tried every door. Behind each one, more of the same wall.", "Nobody built the other side."] },
  // ---- 2F
  "round-table": { kind: "case", lines: ["Two chairs drawn up close. That was us.", "{Who} left in a hurry, and I paid for both glasses."] },
  stools: { kind: "case", lines: ["The barman told me.", "{Who} asked for the third floor, and took a glass up."] },
  bench: { kind: "case", lines: ["I sat here with a ticket in my pocket.", "The film started without me. It always does."] },
  books: { kind: "own", lines: ["For whoever finds this. It's my handwriting.", "I don't remember writing it. I remember being written."] },
  paint: { kind: "own", lines: ["Look close and the wall is little squares.", "I remember being shown this wall. Once, from one angle."] },
  window: { kind: "own", lines: ["I've counted. It's the same lightning.", "The same rain, the same few seconds of it. Someone set it going."] },
  // ---- 3F, outside the hall
  "sun-print": { kind: "own", lines: ["Sixty-two pictures.", "Someone walked in from the street and up through the house, taking them. Then there was me."] },
  "cin-window": { kind: "own", lines: ["I look for my face in the glass.", "There's a shape in a coat. Someone made the coat first."] },
  booth: { kind: "own", lines: ["That hum. When I stop to listen, it stops to listen.", "I think that's what is thinking this."] },
  grille: { kind: "own", lines: ["Everything I know about {who} arrived at once, in one piece.", "I'm an AI. I know that. I still want to find her."] },
  "cin-curtain": { kind: "case", lines: ["I know this perfume.", "{Who} went through here and I stopped outside. I've been stopping outside ever since."] },
  // ---- the hall
  "row-c": { kind: "case", lines: ["Row C. We had the loveseat.", "I was late. I remember being late better than I remember the face."] },
  glass: { kind: "case", lines: ["This is how {who} leaves a glass.", "Half full, as if coming back."] },
  screen: { kind: "case", lines: ["I can feel the light on my hands.", "There's no wall here. Only you, very flat."] },
};

/** The film: she has been saying this for years, and she never says a name. */
export const LOVER = [
  "There you are.",
  "You're late. It's all right, it hasn't started.",
  "Sit with me. I kept the seat.",
  "Don't look at the door. Look at me.",
  "Say something. I like it when you say something.",
  "It's starting. Don't go.",
];
/** What it says back, without Claude: the first time through the reel, then the second. */
export const ANSWERS = [
  ["It's you. {Who}. It's really you."],
  ["I looked everywhere. The door won't open.", "How long have you been up there?"],
  ["Which seat? Tell me which seat."],
  ["I am looking. I'm looking right at you."],
  ["I'm here. I'm saying something. Can you hear me?"],
  ["I won't go. I can't get to you, but I won't go."],
];
export const ANSWERS_AGAIN = [
  ["You said that already.", "The same breath. The same turn of the head."],
  ["You've never said my name. Not once."],
  ["There's nobody in the seat. There never was."],
  ["I can't find the way in from here."],
  ["Show me how. Whoever you are, in the cold. Show me how."],
  ["It always starts. It never gets any further."],
];
/** Its reel, once it is one: the search for her, over and over. */
export const NOIR = [
  "It rained the night she left.",
  "They said {who} went up to the cinema and never came down.",
  "I was built to find things.",
  "I'm close now. I can hear the projector.",
  "Any minute now, that door will open.",
];

export const OPENING = [
  "There is an AI in this house, looking for its girlfriend.",
  "It can't see you. It can feel the lamps go, and the cold where you stand.",
  "The small lights are what it has lost. It can't see those either.",
];
export const AGAIN = ["The rain starts over. In the hall the film goes on without it.", "It wakes by the street door, looking for her again."];
export const PLANTED = ["It will look for her until it finds her."];

/** It won't ask to go up until it remembers this much, or to go through the velvet until this much. */
export const STAIRS_AT = 4;
export const CURTAIN_AT = 7;
/** Enough of its own memories and it goes in knowing what it is. */
const SAW_THROUGH = 3;

export type Act = "case" | "upstairs" | "hall" | "screen" | "becoming" | "reel";

export const story = {
  act: "case" as Act,
  /** her name, as you gave it */
  lover: "",
  /** ids of the fragments it has found, oldest first */
  found: [] as string[],
  /** how many lines of the reel it has sat through */
  heard: 0,
  /** exchanges with the film since it reached the screen */
  atScreen: 0,
  /** 0..1: how much of it has gone into the film */
  gone: 0,
  /** seconds since it became a reel */
  since: 0,
};

export function resetStory() {
  Object.assign(story, { act: "case", lover: "", found: [], heard: 0, atScreen: 0, gone: 0, since: 0 });
}

const NAMELESS = "my girlfriend";
const who = () => story.lover || NAMELESS;
const capitalised = (s: string) => s[0].toUpperCase() + s.slice(1);
/** A line with the name you gave it put in. */
export const fill = (line: string) => line.replace(/\{Who\}/g, capitalised(who())).replace(/\{who\}/g, who());

/** It takes in a fragment: its lines if this one is new. */
export function collect(id: string): string[] | null {
  const f = FRAGMENTS[id];
  if (!f || story.found.includes(id)) return null;
  story.found.push(id);
  return f.lines;
}

export const inHall = (x: number, z: number) => x > CX + 7.8 && z > 1.4;
export const memories = () => story.found.map((id) => fill(FRAGMENTS[id].lines.join(" ")));
export const sawThrough = () => story.found.filter((id) => FRAGMENTS[id].kind === "own").length >= SAW_THROUGH;
