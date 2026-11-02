// Title-screen pieces drawn at the game's own pixel size (RENDER_W across) and
// ordered-dithered with the same 4×4 Bayer matrix as the PS1 post effect, so
// the HTML overlay matches the 3D view behind it.
import { useEffect, useRef } from "react";
import { RENDER_W } from "./ps1/PS1Material";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => (BAYER[(x & 3) + (y & 3) * 4] + 0.5) / 16;

/** CSS pixels per game pixel. */
function pixelSize(el: HTMLElement) {
  const root = el.closest(".overlay") as HTMLElement | null;
  return Math.max(1, (root?.clientWidth ?? window.innerWidth) / RENDER_W);
}

/** Redraw on mount, on resize and once the web fonts have loaded. */
function useRedraw(draw: () => void) {
  const latest = useRef(draw);
  latest.current = draw;
  useEffect(() => {
    const run = () => latest.current();
    run();
    document.fonts?.ready.then(run);
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
  }, []);
}

/** The darkened vignette behind the title, as black pixels at varying density. */
export function DitherBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useRedraw(() => {
    const c = ref.current;
    if (!c) return;
    const s = pixelSize(c);
    const w = Math.ceil(c.clientWidth / s);
    const h = Math.ceil(c.clientHeight / s);
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        // elliptical distance from the centre: 1 at the corners
        const r = Math.hypot((x / w - 0.5) * 2, (y / h - 0.5) * 2) / Math.SQRT2;
        const a = 0.35 + 0.6 * Math.min(1, r / 0.8);
        img.data[(y * w + x) * 4 + 3] = a > bayer(x, y) ? 255 : 0;
      }
    ctx.putImageData(img, 0, 0);
  });
  return <canvas ref={ref} className="dither-backdrop" aria-hidden />;
}

const WHITE = [255, 255, 255];
const GREY = [150, 150, 150];
const SHADOW = [0, 0, 0];

/** Box-blur an alpha mask in place (separable, two passes), for the glow. */
function blur(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += src[y * w + Math.min(w - 1, Math.max(0, x + k))];
        tmp[y * w + x] = sum / (2 * r + 1);
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
        src[y * w + x] = sum / (2 * r + 1);
      }
  }
}

/**
 * The title, rasterised at game resolution: white fading into grey down the
 * letters, a hard black drop shadow and a black halo, all dithered. The real
 * text stays in the DOM (transparent) for layout and screen readers.
 */
export function DitherTitle({ text }: { text: string }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  useRedraw(() => {
    const el = h1.current;
    const c = ref.current;
    if (!el || !c) return;
    const s = pixelSize(el);
    const cs = getComputedStyle(el);
    const fontPx = parseFloat(cs.fontSize);
    const pad = Math.round(fontPx * 0.5);
    const w = Math.ceil((el.clientWidth + pad * 2) / s);
    const h = Math.ceil((el.clientHeight + pad * 2) / s);
    c.width = w;
    c.height = h;
    Object.assign(c.style, { left: `${-pad}px`, top: `${-pad}px`, width: `${w * s}px`, height: `${h * s}px` });

    const ctx = c.getContext("2d")!;
    ctx.font = `${cs.fontWeight} ${fontPx / s}px ${cs.fontFamily}`;
    ctx.letterSpacing = `${(parseFloat(cs.letterSpacing) || 0) / s}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, w / 2, h / 2);
    const raw = ctx.getImageData(0, 0, w, h).data;
    const mask = new Float32Array(w * h);
    let top = h, bottom = 0;
    for (let i = 0; i < w * h; i++) {
      mask[i] = raw[i * 4 + 3] / 255;
      if (mask[i] > 0.5) {
        const y = Math.floor(i / w);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    const glow = mask.slice();
    blur(glow, w, h, Math.max(2, Math.round(h / 10)));

    const img = ctx.createImageData(w, h);
    const off = Math.max(1, Math.round(3 / s)); // the 3px drop shadow
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const b = bayer(x, y);
        let col: number[] | null = null;
        if (mask[i] > 0.5) {
          // white at the top of the letters, dithering into grey at the bottom
          const t = 1 - ((y - top) / Math.max(1, bottom - top)) * 0.5;
          col = t > b ? WHITE : GREY;
        } else if (x >= off && y >= off && mask[i - off * w - off] > 0.5) col = SHADOW;
        else if (glow[i] * 0.85 > b) col = SHADOW;
        if (!col) continue;
        img.data.set([col[0], col[1], col[2], 255], i * 4);
      }
    ctx.putImageData(img, 0, 0);
  });
  return (
    <h1 ref={h1} className="dither-title">
      {text}
      <canvas ref={ref} aria-hidden />
    </h1>
  );
}
