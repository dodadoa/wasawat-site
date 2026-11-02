import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  walls, floors, ceilings, props, lights, blocks, SCREEN, PROJECTOR,
  WALL_H, WALL_T, KIT_SCALE, type Prop, type Seg, type Block, type Tex, type Box, type Floor, type Ceiling,
} from "./level";
import { getTexture, isPhoto, texSize } from "./textures";
import { makePS1Material, patchPS1 } from "./ps1/PS1Material";
import { useModel } from "./Model";
import { addSolid, world } from "./world";
import { storm } from "./weather";
import { Screen } from "./Film";

/** Lambert colour under the photographed surfaces (the painted ones were tuned darker). */
const PHOTO_TINT = "#d2ccc6";
const PAINTED_TINT = "#bdb6b0";
const tint = (tex: Tex) => (isPhoto(tex) ? PHOTO_TINT : PAINTED_TINT);

const wallMats = new Map<string, THREE.Material>();
function wallMat(tex: Tex, len: number) {
  const key = `${tex}|${len}`;
  let m = wallMats.get(key);
  if (!m) {
    const [sx, sy] = texSize(tex);
    m = makePS1Material({ map: getTexture(tex, len / sx, WALL_H / sy), color: tint(tex) });
    wallMats.set(key, m);
  }
  return m;
}

/** A full-height wall; with `back`, two half-thickness skins, one per room. */
function Wall({ seg }: { seg: Seg }) {
  const alongX = seg.z1 === seg.z2;
  const len = (alongX ? Math.abs(seg.x2 - seg.x1) : Math.abs(seg.z2 - seg.z1)) + WALL_T;
  const front = seg.tex ?? "wallpaper";
  const back = seg.back ?? front;
  const skins: [Tex, number, number][] = back === front ? [[front, 0, WALL_T]] : [[front, WALL_T / 4, WALL_T / 2], [back, -WALL_T / 4, WALL_T / 2]];
  return (
    <group position={[(seg.x1 + seg.x2) / 2, WALL_H / 2, (seg.z1 + seg.z2) / 2]} rotation-y={alongX ? 0 : Math.PI / 2}>
      {skins.map(([tex, off, t]) => (
        <mesh key={tex} position-z={off} material={wallMat(tex, len)}>
          <boxGeometry args={[len, WALL_H, t]} />
        </mesh>
      ))}
    </group>
  );
}

/** Floor planes keep their pattern lined up across the pieces cut round a stairwell. */
function FloorPlane({ x1, x2, z1, z2, tex, color }: Floor) {
  const w = x2 - x1;
  const d = z2 - z1;
  const mat = useMemo(() => {
    const [s] = texSize(tex);
    const map = getTexture(tex, w / s, d / s);
    map.offset.set(x1 / s, -z2 / s);
    return makePS1Material({ map, color: color ?? "#a89e94" });
  }, [tex, w, d, x1, z2, color]);
  return (
    <mesh position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} rotation-x={-Math.PI / 2} material={mat}>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

function CeilingPlane({ x1, x2, z1, z2, color }: Ceiling) {
  const w = x2 - x1;
  const d = z2 - z1;
  const mat = useMemo(() => makePS1Material({ map: getTexture("plaster", w / 2, d / 2), color: color ?? "#5a4a44" }), [w, d, color]);
  return (
    <mesh position={[(x1 + x2) / 2, WALL_H, (z1 + z2) / 2]} rotation-x={Math.PI / 2} material={mat}>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

// ---------- blocks: everything static, merged into one mesh per material

const DEG = Math.PI / 180;
const blockMats = new Map<string, THREE.Material>();

function blockMaterial(b: Block): [string, THREE.Material] {
  const rep = b.world ? [1, 1] : (b.rep ?? [1, 1]);
  const glow = b.glow === true ? 1 : b.glow || 0;
  const opacity = b.opacity ?? 1;
  const side = b.shape === "tube" ? THREE.DoubleSide : THREE.FrontSide;
  const key = `${b.tex}|${b.color}|${rep}|${glow}|${opacity}|${side}`;
  let m = blockMats.get(key);
  if (!m) {
    const map = b.tex ? getTexture(b.tex, rep[0], rep[1]) : null;
    if (glow) {
      // self-lit: a lamp, a screen, a strip of LEDs, a backlit curtain
      const color = new THREE.Color(b.color ?? "#ffffff").multiplyScalar(glow);
      if (map) map.colorSpace = THREE.SRGBColorSpace;
      m = patchPS1(new THREE.MeshBasicMaterial({ map, color, fog: true, side }));
    } else {
      m = makePS1Material({
        map,
        color: b.color ?? (b.tex ? tint(b.tex) : "#888888"),
        side,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity >= 1,
      });
    }
    blockMats.set(key, m);
  }
  return [key, m];
}

/** UVs scaled by each face's real size, so a tiling surface keeps its scale on any block. */
function worldUVs(g: THREE.BufferGeometry, b: Block) {
  const [sx, sy] = texSize(b.tex!);
  const [w, h, d] = b.size;
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  if (b.shape === "cyl" || b.shape === "tube") {
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * w) / sx, (uv.getY(i) * h) / sy);
  } else if (!b.shape || b.shape === "box") {
    // BoxGeometry: four vertices per face, faces in the order +x -x +y -y +z -z
    const faces: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let i = 0; i < uv.count; i++) {
      const [fu, fv] = faces[Math.floor(i / 4)];
      uv.setXY(i, (uv.getX(i) * fu) / sx, (uv.getY(i) * fv) / sy);
    }
  }
}

function blockGeometry(b: Block) {
  const [w, h, d] = b.size;
  const seg = b.seg ?? 8;
  const g =
    b.shape === "cyl" ? new THREE.CylinderGeometry((w / 2) * (b.taper ?? 1), w / 2, h, seg)
    : b.shape === "tube" ? new THREE.CylinderGeometry(w / 2, w / 2, h, seg, 1, true)
    : b.shape === "sphere" ? new THREE.SphereGeometry(w / 2, seg, Math.max(4, Math.round(seg * 0.6)))
    : new THREE.BoxGeometry(w, h, d);
  if (b.world && b.tex) worldUVs(g, b);
  const r = b.rot ?? 0;
  const e = typeof r === "number" ? new THREE.Euler(0, r * DEG, 0, "YXZ") : new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG, "YXZ");
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...b.pos), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1)));
  return g;
}

function Blocks() {
  const { meshes, boxes } = useMemo(() => {
    const groups = new Map<string, { mat: THREE.Material; geoms: THREE.BufferGeometry[] }>();
    const boxes: Box[] = [];
    for (const b of blocks) {
      const g = blockGeometry(b);
      if (b.solid) {
        g.computeBoundingBox();
        const bb = g.boundingBox!;
        boxes.push({ x1: bb.min.x, x2: bb.max.x, z1: bb.min.z, z2: bb.max.z });
      }
      const [key, mat] = blockMaterial(b);
      let e = groups.get(key);
      if (!e) groups.set(key, (e = { mat, geoms: [] }));
      e.geoms.push(g);
    }
    const meshes = [...groups.values()].map(({ mat, geoms }) => {
      const merged = mergeGeometries(geoms);
      for (const g of geoms) g.dispose();
      return new THREE.Mesh(merged, mat);
    });
    return { meshes, boxes };
  }, []);
  useEffect(() => {
    const off = boxes.map(addSolid);
    return () => off.forEach((f) => f());
  }, [boxes]);
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

/** The cone of light from the projector on the ceiling to the screen. */
function ProjectorBeam() {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#c8d0ff",
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    []
  );
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(PROJECTOR.x, PROJECTOR.y, PROJECTOR.z);
    const b = new THREE.Vector3(SCREEN.x, SCREEN.y, SCREEN.z + 0.05);
    const dir = b.clone().sub(a);
    const len = dir.length();
    return {
      pos: a.clone().add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
      len,
    };
  }, []);
  return (
    <mesh position={pos} quaternion={quat} material={mat}>
      <cylinderGeometry args={[SCREEN.h * 0.6, 0.05, len, 10, 1, true]} />
    </mesh>
  );
}

function PropMesh({ p }: { p: Prop }) {
  const obj = useModel(p.model);
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!p.solid) return;
    let box;
    if (p.solid === "auto") {
      ref.current!.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(ref.current!);
      box = { x1: b.min.x + 0.06, x2: b.max.x - 0.06, z1: b.min.z + 0.06, z2: b.max.z - 0.06 };
    } else box = p.solid;
    return addSolid(box);
  }, [p]);
  return (
    <primitive
      ref={ref}
      object={obj}
      position={p.pos}
      rotation-y={THREE.MathUtils.degToRad(p.rot ?? 0)}
      scale={p.scale ?? KIT_SCALE}
    />
  );
}

/**
 * How much a light bows when the ghost is near it: lamps and candles within
 * GHOST_DIM_RANGE dim and stutter, as if something had stepped between them
 * and the room. Returns 1 when it's nowhere near.
 */
const GHOST_DIM_RANGE = 2.4;
/** Ghost mode: stirring (ENTER) sags every light this close, hard, for this long. */
const STIR_RANGE = 4.5;
const STIR_SECONDS = 2.2;
function ghostDim(x: number, y: number, z: number, t: number) {
  const g = world.enemies.ghost;
  if (!g) return 1;
  let out = 1;
  const d = Math.hypot(g.x - x, g.y + 1 - y, g.z - z);
  if (d < GHOST_DIM_RANGE) out = 1 - (1 - d / GHOST_DIM_RANGE) * (0.45 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3));
  const st = world.stir;
  const age = st ? (performance.now() - st.t) / 1000 : Infinity;
  if (st && age < STIR_SECONDS) {
    const ds = Math.hypot(st.x - x, st.z - z);
    if (ds < STIR_RANGE) {
      const k = (1 - ds / STIR_RANGE) * (1 - age / STIR_SECONDS);
      out = Math.min(out, 1 - k * (0.75 + 0.25 * Math.sin(t * 31) * Math.sin(t * 7.1)));
    }
  }
  return Math.max(0.03, out);
}

function FlickerLight({ pos, color, intensity, distance, flicker }: (typeof lights)[number]) {
  const ref = useRef<THREE.PointLight>(null);
  const seed = useMemo(() => Math.random() * 100, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + seed;
    const base = flicker ? 0.8 + Math.sin(t * 13) * 0.08 + Math.sin(t * 29.7) * 0.07 + Math.sin(t * 3.1) * 0.05 : 1;
    // the old wiring sags when the thunder rolls
    ref.current.intensity = intensity * base * ghostDim(pos[0], pos[1], pos[2], t) * storm.brown;
  });
  return <pointLight ref={ref} position={pos} color={color} intensity={intensity} distance={distance} decay={2} />;
}

export function House() {
  return (
    <group>
      {walls.map((w, i) => (
        <Wall key={i} seg={w} />
      ))}
      {floors.map((f, i) => (
        <FloorPlane key={i} {...f} />
      ))}
      {ceilings.map((c, i) => (
        <CeilingPlane key={i} {...c} />
      ))}
      <Blocks />
      <Screen />
      <ProjectorBeam />
      {props.map((p, i) => (
        <PropMesh key={i} p={p} />
      ))}
      {lights.map((l, i) => (
        <FlickerLight key={i} {...l} />
      ))}
    </group>
  );
}
