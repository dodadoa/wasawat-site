import { create } from "zustand";

export type Phase = "title" | "playing";
export type Controls = "modern" | "classic";
export type Webcam = "off" | "starting" | "on" | "denied" | "error";
/**
 * "keeper": you walk the house. In the other two you are the ghost and a guest
 * walks by itself. "figure": you walk too, a cloud of points in the guest's
 * shape. "camera": you have no body, you are the eye.
 */
export type Role = "keeper" | "figure" | "camera";
/** Who is talking in the subtitles: the house's spirit, the guest muttering to itself, or the film. */
export type Speaker = "ghost" | "guest" | "lover";

type Msg = { lines: string[]; index: number; onDone?: () => void };
/** What the ghost is saying: non-blocking subtitles that advance on their own. */
type Whisper = { lines: string[]; key: number; who: Speaker };

export interface GameState {
  phase: Phase;
  /** "modern" = camera-relative movement, "classic" = PS1 tank controls. */
  controls: Controls;
  cameraId: string;
  message: Msg | null;
  whisper: Whisper | null;
  /** the "leave a memory" text box is open */
  writing: boolean;
  /** the box where you give the guest someone to look for is open */
  implanting: boolean;
  /** the memory strength panel (M) */
  showMemories: boolean;
  /** who is speaking for the ghost: Claude, or the local rules (null until it first speaks) */
  prompt: string | null;
  fade: number; // 0..1 black overlay
  /** the webcam presence (C): face and hand tracking */
  webcam: Webcam;
  /** the small dithered webcam view in the corner (V) */
  webcamView: boolean;
  role: Role;

  start: () => void;
  toggleControls: () => void;
  setCamera: (id: string) => void;
  say: (lines: string | string[], onDone?: () => void) => void;
  advanceMessage: () => void;
  whisperLines: (lines: string[], who?: Speaker) => void;
  clearWhisper: () => void;
  setWriting: (v: boolean) => void;
  setImplanting: (v: boolean) => void;
  toggleMemories: () => void;
  setPrompt: (p: string | null) => void;
  setFade: (f: number) => void;
  setWebcam: (w: Webcam) => void;
  toggleWebcamView: () => void;
  nextRole: () => void;
}

const ROLES: Role[] = ["keeper", "figure", "camera"];

export const useGame = create<GameState>((set, get) => ({
  phase: "title",
  controls: "modern",
  cameraId: "lobby-door",
  message: null,
  whisper: null,
  writing: false,
  implanting: false,
  showMemories: false,
  prompt: null,
  fade: 1,
  webcam: "off",
  webcamView: true,
  role: "figure",

  start: () => {
    set({ phase: "playing", fade: 1 });
    setTimeout(() => set({ fade: 0 }), 150);
  },
  toggleControls: () => set((s) => ({ controls: s.controls === "modern" ? "classic" : "modern" })),
  setCamera: (id) => set((s) => (s.cameraId === id ? s : { cameraId: id })),
  say: (lines, onDone) => set({ message: { lines: Array.isArray(lines) ? lines : [lines], index: 0, onDone } }),
  advanceMessage: () => {
    const m = get().message;
    if (!m) return;
    if (m.index + 1 < m.lines.length) set({ message: { ...m, index: m.index + 1 } });
    else {
      set({ message: null });
      m.onDone?.();
    }
  },
  whisperLines: (lines, who = "ghost") => set({ whisper: { lines, key: Date.now(), who } }),
  clearWhisper: () => set({ whisper: null }),
  setWriting: (v) => set({ writing: v }),
  setImplanting: (v) => set({ implanting: v }),
  toggleMemories: () => set((s) => ({ showMemories: !s.showMemories })),
  setPrompt: (p) => set((s) => (s.prompt === p ? s : { prompt: p })),
  setFade: (f) => set({ fade: f }),
  setWebcam: (w) => set({ webcam: w }),
  toggleWebcamView: () => set((s) => ({ webcamView: !s.webcamView })),
  nextRole: () => set((s) => ({ role: ROLES[(ROLES.indexOf(s.role) + 1) % ROLES.length], whisper: null, message: null, prompt: null, writing: false })),
}));
