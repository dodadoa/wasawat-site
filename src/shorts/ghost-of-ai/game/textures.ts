import * as THREE from "three";
import { crunchTexture } from "./ps1/PS1Material";
import { PHOTO_TEXTURES, type PaintedTex, type PhotoTex, type Tex } from "./level";

// Two kinds of texture, both tiny on purpose (the PS1 had 1MB VRAM):
// procedurally painted 64x64 ones, and the house's own surfaces cut out of
// photographs of Sala Saneha (scripts/photo-textures.mjs → public/textures).

const painted = new Map<PaintedTex, THREE.CanvasTexture>();
const photos = new Map<PhotoTex, { base: THREE.Texture; clones: THREE.Texture[]; loaded: boolean }>();
const loader = new THREE.TextureLoader();

export const isPhoto = (k: Tex): k is PhotoTex => (PHOTO_TEXTURES as readonly string[]).includes(k);

/** How many metres one repeat covers [across, up], for surfaces that tile at their real size. */
const TEX_SIZE: Partial<Record<Tex, [number, number]>> = {
  "cream-wall": [1.8, 1.5],
  terracotta: [1.6, 0.8],
  "foyer-wall": [0.9, 1.8],
  "red-wall": [1.2, 1.2],
  zinc: [1.0, 0.62],
  "velvet-drape": [1.4, 3.0],
  sheer: [0.7, 3.0],
  "wine-rack": [0.9, 0.75],
  concrete: [1.4, 1.4],
  parquet: [1.0, 1.0],
  "carpet-dark": [1.0, 1.0],
  laminate: [0.7, 1.4],
  marble: [1.0, 0.5],
  "zinc-bar": [1.2, 0.6],
  plaster: [2.0, 2.0],
};
export const texSize = (k: Tex): [number, number] => TEX_SIZE[k] ?? [2, 2.2];

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function paint(kind: PaintedTex): HTMLCanvasElement {
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const r = rnd(kind.length * 977 + 13);

  const noise = (amount: number) => {
    const img = g.getImageData(0, 0, S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * amount;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  };

  switch (kind) {
    case "planks": {
      g.fillStyle = "#3a2a1c";
      g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 8) {
        const shade = 62 + r() * 34;
        g.fillStyle = `rgb(${shade + 14},${shade - 4},${shade - 16})`;
        g.fillRect(0, y, S, 7);
        g.fillStyle = "#1a120a";
        g.fillRect(0, y + 7, S, 1);
        // plank seams
        const sx = Math.floor(r() * S);
        g.fillRect(sx, y, 1, 7);
        // grain
        g.fillStyle = "rgba(0,0,0,0.18)";
        for (let k = 0; k < 6; k++) g.fillRect(Math.floor(r() * S), y + Math.floor(r() * 7), 6 + r() * 10, 1);
      }
      noise(26);
      break;
    }
    case "wallpaper": {
      g.fillStyle = "#6a6478";
      g.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 8) {
        g.fillStyle = x % 16 === 0 ? "#5c566c" : "#746c84";
        g.fillRect(x, 0, 8, S);
      }
      g.fillStyle = "#8a8098";
      for (let y = 4; y < S; y += 16)
        for (let x = 4; x < S; x += 16) {
          g.fillRect(x - 1, y, 3, 1);
          g.fillRect(x, y - 1, 1, 3);
        }
      // stains
      g.fillStyle = "rgba(20,10,10,0.35)";
      for (let k = 0; k < 5; k++) g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 4 + r() * 12, 3 + r() * 10);
      noise(22);
      break;
    }
    case "stone": {
      g.fillStyle = "#3a3a42";
      g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 16) {
        const off = (y / 16) % 2 ? 8 : 0;
        for (let x = -8; x < S; x += 16) {
          const v = 78 + r() * 34;
          g.fillStyle = `rgb(${v},${v + 2},${v + 8})`;
          g.fillRect(x + off + 1, y + 1, 14, 14);
        }
      }
      g.fillStyle = "rgba(0,0,0,0.3)";
      for (let k = 0; k < 20; k++) g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1 + r() * 3, 1 + r() * 3);
      noise(30);
      break;
    }
    case "tile": {
      g.fillStyle = "#1e1c22";
      g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 16)
        for (let x = 0; x < S; x += 16) {
          const v = 58 + r() * 22 + (((x + y) / 16) % 2) * 16;
          g.fillStyle = `rgb(${v},${v - 2},${v + 4})`;
          g.fillRect(x + 1, y + 1, 14, 14);
        }
      noise(18);
      break;
    }
    case "panel": {
      g.fillStyle = "#2e2117";
      g.fillRect(0, 0, S, S);
      g.fillStyle = "#3c2c1e";
      g.fillRect(4, 4, S - 8, S - 8);
      g.fillStyle = "#1c1209";
      g.fillRect(8, 8, S - 16, S - 16);
      g.fillStyle = "#33251a";
      g.fillRect(10, 10, S - 20, S - 20);
      noise(20);
      break;
    }
    case "damask": {
      // dark red wallpaper with a repeating diamond motif
      g.fillStyle = "#3a0e0c";
      g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 16)
        for (let x = 0; x < S; x += 16) {
          const ox = (y / 16) % 2 ? 8 : 0;
          g.fillStyle = "#5c1a14";
          for (let k = 0; k < 6; k++) g.fillRect(x + ox + 8 - k, y + 2 + k, k * 2 + 1, 1);
          for (let k = 0; k < 6; k++) g.fillRect(x + ox + 3 + k, y + 8 + k, 11 - k * 2, 1);
        }
      noise(16);
      break;
    }
    case "velvet": {
      g.fillStyle = "#7a1410";
      g.fillRect(0, 0, S, S);
      // soft pile: lighter streaks where it's been sat on
      for (let k = 0; k < 40; k++) {
        g.fillStyle = r() > 0.5 ? "rgba(255,120,100,0.10)" : "rgba(0,0,0,0.18)";
        g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 3 + r() * 12, 2 + r() * 6);
      }
      noise(14);
      break;
    }
    case "pile": {
      // velvet with no colour of its own: tinted by the block (green, blue, red, mauve)
      g.fillStyle = "#9a9a9a";
      g.fillRect(0, 0, S, S);
      for (let k = 0; k < 46; k++) {
        g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.2)";
        g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 3 + r() * 14, 2 + r() * 6);
      }
      noise(14);
      break;
    }
    case "curtain": {
      // vertical folds
      for (let x = 0; x < S; x++) {
        const f = 0.5 + 0.5 * Math.sin((x / S) * Math.PI * 8);
        const v = 40 + f * 70;
        g.fillStyle = `rgb(${v + 30},${v * 0.22},${v * 0.2})`;
        g.fillRect(x, 0, 1, S);
      }
      noise(12);
      break;
    }
    case "bottles": {
      // shelves of wine bottles, a few glinting labels
      g.fillStyle = "#120a08";
      g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 16) {
        g.fillStyle = "#3a2416";
        g.fillRect(0, y + 14, S, 2);
        for (let x = 1; x < S; x += 5) {
          const h = 10 + Math.floor(r() * 3);
          const dark = r() > 0.4;
          g.fillStyle = dark ? "#2a0c0a" : "#40281a";
          g.fillRect(x, y + 14 - h + 3, 4, h - 3); // body
          g.fillRect(x + 1, y + 14 - h, 2, 3); // neck
          if (r() > 0.45) {
            g.fillStyle = r() > 0.5 ? "#c8b898" : "#b03020";
            g.fillRect(x, y + 9, 4, 3); // label
          }
          if (r() > 0.7) {
            g.fillStyle = "rgba(255,200,160,0.5)";
            g.fillRect(x + 3, y + 14 - h + 4, 1, 4); // glint
          }
        }
      }
      noise(10);
      break;
    }
    case "carpet": {
      g.fillStyle = "#2a0a0a";
      g.fillRect(0, 0, S, S);
      g.fillStyle = "#3e1210";
      for (let y = 0; y < S; y += 8)
        for (let x = (y / 8) % 2 ? 4 : 0; x < S; x += 8) g.fillRect(x, y, 3, 3);
      noise(18);
      break;
    }
    case "carpet-dark": {
      // the cinema's charcoal carpet, flecked
      g.fillStyle = "#2a2628";
      g.fillRect(0, 0, S, S);
      for (let k = 0; k < 160; k++) {
        g.fillStyle = r() > 0.5 ? "#3a3436" : "#1c1a1c";
        g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1 + Math.floor(r() * 2), 1);
      }
      noise(10);
      break;
    }
    case "parquet": {
      // basketweave: squares of four short blocks, turning a quarter each square
      g.fillStyle = "#2a140c";
      g.fillRect(0, 0, S, S);
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const across = (sx + sy) % 2 === 0;
          for (let k = 0; k < 4; k++) {
            const v = 86 + r() * 40;
            g.fillStyle = `rgb(${v + 14},${v * 0.6},${v * 0.42})`;
            if (across) g.fillRect(sx * 16 + 1, sy * 16 + k * 4 + 1, 14, 3);
            else g.fillRect(sx * 16 + k * 4 + 1, sy * 16 + 1, 3, 14);
          }
        }
      g.fillStyle = "rgba(0,0,0,0.16)";
      for (let k = 0; k < 30; k++) g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 3 + r() * 6, 1);
      noise(16);
      break;
    }
    case "laminate": {
      // the orange wood veneer of the column that hides the diamond lift
      for (let x = 0; x < S; x++) {
        const v = 128 + Math.sin(x * 0.7 + Math.sin(x * 0.13) * 3) * 14 + (r() - 0.5) * 14;
        g.fillStyle = `rgb(${v + 20},${v * 0.58},${v * 0.34})`;
        g.fillRect(x, 0, 1, S);
      }
      g.fillStyle = "rgba(255,230,200,0.08)"; // a soft streak of gloss
      g.fillRect(20, 0, 10, S);
      noise(10);
      break;
    }
    case "marble": {
      // the bar top: dark brown marble with pale veins
      g.fillStyle = "#3a2418";
      g.fillRect(0, 0, S, S);
      for (let k = 0; k < 7; k++) {
        let x = r() * S, y = r() * S;
        g.fillStyle = `rgba(200,170,140,${0.25 + r() * 0.3})`;
        for (let n = 0; n < 50; n++) {
          g.fillRect(Math.floor(x) & 63, Math.floor(y) & 63, 1, 1);
          x += 1 + (r() - 0.3);
          y += (r() - 0.5) * 2;
        }
      }
      noise(16);
      break;
    }
    case "zinc-bar": {
      // the bar front: brushed zinc, dull, scratched sideways
      g.fillStyle = "#6e767a";
      g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y++) {
        g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.05 + r() * 0.08})`;
        g.fillRect(0, y, S, 1);
      }
      g.fillStyle = "rgba(20,20,24,0.25)";
      for (let k = 0; k < 6; k++) g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 6 + r() * 20, 2 + r() * 5);
      noise(12);
      break;
    }
    case "red-wall": {
      g.fillStyle = "#7a2622";
      g.fillRect(0, 0, S, S);
      for (let k = 0; k < 24; k++) {
        g.fillStyle = r() > 0.5 ? "rgba(255,160,140,0.06)" : "rgba(0,0,0,0.12)";
        g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 4 + r() * 16, 3 + r() * 10);
      }
      noise(14);
      break;
    }
    case "rug": {
      // the round rug under the ring of roses: cream field, red border, flowers,
      // a medallion. Drawn for a cylinder's cap, which maps the circle centred.
      const cx = S / 2;
      g.fillStyle = "#2a1410";
      g.fillRect(0, 0, S, S);
      const ring = (rad: number, col: string) => {
        g.fillStyle = col;
        g.beginPath();
        g.arc(cx, cx, rad, 0, Math.PI * 2);
        g.fill();
      };
      ring(32, "#8a2a20");
      ring(29, "#c89a78");
      ring(27, "#d8c8a8");
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        g.fillStyle = k % 2 ? "#c06a60" : "#a8382c";
        g.fillRect(Math.round(cx + Math.cos(a) * 24) - 1, Math.round(cx + Math.sin(a) * 24) - 1, 3, 3);
        g.fillStyle = "#6a7a50";
        g.fillRect(Math.round(cx + Math.cos(a + 0.17) * 22), Math.round(cx + Math.sin(a + 0.17) * 22), 2, 1);
      }
      for (let k = 0; k < 40; k++) {
        const a = r() * Math.PI * 2, d = 8 + r() * 12;
        g.fillStyle = r() > 0.5 ? "#c87a70" : "#8a9a70";
        g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cx + Math.sin(a) * d), 2, 2);
      }
      ring(8, "#8a2a20");
      ring(5, "#d8b890");
      ring(2, "#5a6a40");
      noise(14);
      break;
    }
    case "check": {
      // a red and cream checked cushion
      for (let y = 0; y < S; y += 4)
        for (let x = 0; x < S; x += 4) {
          g.fillStyle = (x / 4 + y / 4) % 2 ? "#8a2a24" : "#d8ccb8";
          g.fillRect(x, y, 4, 4);
        }
      noise(16);
      break;
    }
    case "embroidery": {
      // black cushions on the landing bench, a white leaf stitched on each
      g.fillStyle = "#141414";
      g.fillRect(0, 0, S, S);
      g.fillStyle = "#d8d8d0";
      for (let k = 0; k < 3; k++) {
        const y = 16 + k * 14;
        for (let x = 18; x < 46; x++) {
          const h = Math.round(Math.sin(((x - 18) / 28) * Math.PI) * 4);
          g.fillRect(x, y - h, 1, 1);
          g.fillRect(x, y + h, 1, 1);
        }
        g.fillRect(20, y, 24, 1);
      }
      noise(8);
      break;
    }
    case "shelf-low": {
      // the bookshop's low shelves: dark wood cubbies, a warm bulb in each, books lying in them
      g.fillStyle = "#3a2014";
      g.fillRect(0, 0, S, S);
      for (const y0 of [6, 34]) {
        g.fillStyle = "#6a3a20";
        g.fillRect(4, y0, S - 8, 24);
        g.fillStyle = "rgba(255,200,130,0.35)";
        g.fillRect(6, y0 + 2, S - 12, 10);
        for (let x = 8; x < S - 12; x += 14) {
          g.fillStyle = ["#d8c8a0", "#4a6a7a", "#a84a3a", "#e8e0d0", "#5a7a5a"][Math.floor(r() * 5)];
          g.fillRect(x, y0 + 18, 10, 3);
          g.fillStyle = "#f0e8d8";
          g.fillRect(x + 11, y0 + 15, 2, 6); // a little card
        }
      }
      noise(14);
      break;
    }
    case "frosted": {
      const grad = g.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, "#e8ece8");
      grad.addColorStop(1, "#b8c0bc");
      g.fillStyle = grad;
      g.fillRect(0, 0, S, S);
      noise(10);
      break;
    }
    case "plaster":
    default: {
      g.fillStyle = "#3a3734";
      g.fillRect(0, 0, S, S);
      g.fillStyle = "rgba(0,0,0,0.25)";
      for (let k = 0; k < 10; k++) g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 2 + r() * 14, 1 + r() * 4);
      noise(28);
      break;
    }
  }
  return c;
}

/**
 * A photo texture starts empty and fills when its PNG arrives. Clones share
 * the image but keep their own version, so each one made before then is told
 * when it lands (and none is marked for upload while there is nothing to send).
 */
function photoBase(kind: PhotoTex) {
  let p = photos.get(kind);
  if (!p) {
    const entry = { base: new THREE.Texture(), clones: [] as THREE.Texture[], loaded: false };
    entry.base = loader.load(`/shorts/ghost-of-ai/textures/${kind}.png`, () => {
      entry.loaded = true;
      for (const c of entry.clones) c.needsUpdate = true;
      entry.clones.length = 0;
    });
    setup(entry.base);
    p = entry;
    photos.set(kind, p);
  }
  return p;
}

function setup(t: THREE.Texture) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  crunchTexture(t);
}

export function getTexture(kind: Tex, repeatX = 1, repeatY = 1) {
  if (isPhoto(kind)) {
    const p = photoBase(kind);
    const t = p.base.clone();
    t.repeat.set(repeatX, repeatY);
    if (p.loaded) t.needsUpdate = true;
    else p.clones.push(t);
    return t;
  }
  let base = painted.get(kind);
  if (!base) {
    base = new THREE.CanvasTexture(paint(kind));
    setup(base);
    painted.set(kind, base);
  }
  const t = base.clone();
  t.repeat.set(repeatX, repeatY);
  t.needsUpdate = true;
  return t;
}
