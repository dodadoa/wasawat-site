import { useEffect, useRef } from "react";
import { useGame } from "./store";
import { presence, toggleWebcam } from "./presence";
import { reach } from "./reach";
import { guestState } from "./guest";

const W = 160;
const H = 120;
/** 4×4 ordered dither, the same family as the game's post effect */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** K turns the webcam on and off in the game, V shows or hides the little view of it. */
export function useWebcamKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.repeat) return;
      if (useGame.getState().phase !== "playing") return;
      if (e.code === "KeyK" && useGame.getState().phase === "playing") toggleWebcam();
      if (e.code === "KeyV") useGame.getState().toggleWebcamView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * What the house sees of you: the webcam in one-bit dither, mirrored, with
 * the tracked face and hand drawn over it, and what the ghost makes of it.
 */
export function WebcamView() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const src = document.createElement("canvas");
    src.width = W;
    src.height = H;
    const sctx = src.getContext("2d", { willReadFrequently: true })!;
    const ctx = canvas.current!.getContext("2d")!;
    const out = ctx.createImageData(W, H);
    let id = 0;
    const tick = () => {
      id = requestAnimationFrame(tick);
      const v = presence.video;
      if (!v || v.readyState < 2) return;
      // mirror it, crop to 4:3
      const vw = v.videoWidth, vh = v.videoHeight;
      const cw = Math.min(vw, (vh * 4) / 3);
      sctx.setTransform(-1, 0, 0, 1, W, 0);
      sctx.drawImage(v, (vw - cw) / 2, 0, cw, vh, 0, 0, W, H);
      const px = sctx.getImageData(0, 0, W, H).data;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const l = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
          const on = l > BAYER[(y & 3) * 4 + (x & 3)];
          out.data[i] = on ? 150 : 8;
          out.data[i + 1] = on ? 150 : 7;
          out.data[i + 2] = on ? 160 : 10;
          out.data[i + 3] = 255;
        }
      ctx.putImageData(out, 0, 0);
      // landmarks are in the unmirrored, uncropped frame
      const dot = (lx: number, ly: number, c: string) => {
        const x = W - ((lx * vw - (vw - cw) / 2) / cw) * W;
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(x), Math.round(ly * H), 1, 1);
      };
      presence.raw.face?.forEach((p, i) => i % 6 === 0 && dot(p.x, p.y, "#ff5a40"));
      presence.raw.hand?.forEach((p) => dot(p.x, p.y, "#bcd0ff"));

      const f = presence.face;
      const words = [
        !f.seen ? "no one" : f.blink > 0.45 ? "eyes shut" : "watching",
        f.seen && f.mouth > 0.35 ? "speaking" : "",
        presence.raw.hand ? (presence.hand.speed > 1.6 ? "hand · sudden" : "hand") : "",
        guestState.held ? "holding him" : reach.over ? "on him" : reach.label,
      ];
      if (label.current) label.current.textContent = words.filter(Boolean).join(" · ");
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="webcam-view">
      <canvas ref={canvas} width={W} height={H} />
      <span ref={label} />
    </div>
  );
}

/** One line under the controls hint: what the webcam is doing. */
export function webcamHint(status: ReturnType<typeof useGame.getState>["webcam"]) {
  switch (status) {
    case "starting": return "K webcam · waking…";
    case "on": return "K webcam off · V view";
    case "denied": return "K webcam · not allowed";
    case "error": return "K webcam · failed";
    default: return "K webcam";
  }
}
