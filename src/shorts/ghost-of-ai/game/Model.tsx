import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { applyPS1, makePS1Material, patchPS1 } from "./ps1/PS1Material";
import { toPointCloud, type PointCloudOptions } from "./ps1/PointCloud";
import { buildHumanFigure } from "./HumanFigure";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Clip } from "./world";

export const modelUrl = (n: string) => `/shorts/ghost-of-ai/models/${n}.glb`;

/**
 * Loads a PS1-ified GLB and returns a fresh clone of its scene graph.
 * Pass `points` (keep the object identity stable, e.g. a module constant) to
 * render it as a point cloud instead of polygons.
 */
export function useModel(name: string, points?: PointCloudOptions): THREE.Group {
  const gltf = useGLTF(modelUrl(name));
  return useMemo(() => {
    applyPS1(gltf.scene);
    const clone = gltf.scene.clone(true) as THREE.Group;
    if (points) toPointCloud(clone, points);
    return clone;
  }, [gltf, points]);
}

/**
 * A procedural human-proportioned figure (see HumanFigure.ts): solid PS1
 * meshes, or a point cloud when `points` is given.
 */
export function useHumanFigure(points?: PointCloudOptions): THREE.Group {
  return useMemo(() => {
    const g = buildHumanFigure();
    if (points) toPointCloud(g, points);
    else applyPS1(g);
    return g;
  }, [points]);
}

/**
 * Neon-tube look: every part keeps a dark, normally lit body and gets a thin
 * self-lit shell around its silhouette (an inverted hull: the same geometry,
 * slightly inflated about its own centre, drawn back-face only). The body
 * stays readable as arms, legs and head; only the outline feeds the bloom.
 */
export function neonOutline(root: THREE.Object3D, color = "#ff5a40", thickness = 0.07, bodyDiffuse = 0.8) {
  // snapped like everything else so the outline wobbles with the body
  const shellMat = patchPS1(new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, fog: true }));
  const bodies = new Map<THREE.Material, THREE.Material>();
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !o.name.endsWith("-neon")) meshes.push(o as THREE.Mesh);
  });
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  for (const mesh of meshes) {
    const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshLambertMaterial;
    let body = bodies.get(src);
    if (!body) {
      body = makePS1Material({
        map: src.map ?? null,
        color: (src.color ?? new THREE.Color(1, 1, 1)).clone().multiplyScalar(bodyDiffuse),
        flatShading: true,
      });
      bodies.set(src, body);
    }
    mesh.material = body;

    mesh.geometry.computeBoundingBox();
    box.copy(mesh.geometry.boundingBox!).getCenter(center);
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    // inflate by a constant world thickness, not a percentage, so thin arms
    // and the chest get the same tube width
    const k = 1 + thickness / (size * 0.5);
    const shell = new THREE.Mesh(mesh.geometry, shellMat);
    shell.name = `${mesh.name}-neon`;
    shell.scale.setScalar(k);
    shell.position.copy(center).multiplyScalar(1 - k);
    mesh.add(shell);
  }
}

/** Kenney characters: separate rigid parts with pivots at the joints. */
export type Humanoid = {
  legL?: THREE.Object3D;
  legR?: THREE.Object3D;
  armL?: THREE.Object3D;
  armR?: THREE.Object3D;
  torso?: THREE.Object3D;
  head?: THREE.Object3D;
  /** rest height of the torso pivot (the hip) */
  hip: number;
};

export function humanoidParts(root: THREE.Object3D): Humanoid {
  const g = (n: string) => root.getObjectByName(n) ?? undefined;
  const torso = g("torso");
  return { legL: g("leg-left"), legR: g("leg-right"), armL: g("arm-left"), armR: g("arm-right"), torso, head: g("head"), hip: torso?.position.y ?? 0.22 };
}

/** +1 if the character meshes face +Z in model space, -1 if they face -Z. */
export const FACE = 1;

export type AnimMode = "idle" | "walk" | "run" | "zombie" | "ghost";

/**
 * Kenney characters are modelled in a T-pose: arm-left extends +X and
 * arm-right -X from a pivot at the shoulder. Rotating about Z by ~90°
 * drops them to the sides; `spread` leaves a little daylight between arm
 * and torso. Euler order is XYZ, so this Z rotation is applied first and
 * the per-mode X swing then pivots the lowered arm forward/back.
 */
export const ARM_DOWN = Math.PI / 2 - 0.12;
export function armsDown(h: Humanoid, spread = 0) {
  if (h.armL) h.armL.rotation.z = -(ARM_DOWN - spread);
  if (h.armR) h.armR.rotation.z = ARM_DOWN - spread;
}

export function animateHumanoid(h: Humanoid, t: number, mode: AnimMode) {
  const F = FACE;
  armsDown(h, mode === "zombie" ? 0.25 : 0);
  switch (mode) {
    case "walk":
    case "run": {
      const f = mode === "run" ? 11 : 7.5;
      const a = mode === "run" ? 0.85 : 0.6;
      const s = Math.sin(t * f);
      if (h.legL) h.legL.rotation.x = -F * s * a;
      if (h.legR) h.legR.rotation.x = F * s * a;
      if (h.armL) h.armL.rotation.x = F * s * a * 0.8;
      if (h.armR) h.armR.rotation.x = -F * s * a * 0.8;
      if (h.torso) {
        h.torso.rotation.x = F * 0.06;
        h.torso.position.y = h.hip + Math.abs(Math.cos(t * f)) * 0.015;
      }
      if (h.head) h.head.rotation.z = Math.sin(t * f * 0.5) * 0.04;
      break;
    }
    case "zombie": {
      const s = Math.sin(t * 3.2);
      if (h.legL) h.legL.rotation.x = -F * (s * 0.35 + 0.1);
      if (h.legR) h.legR.rotation.x = F * (s * 0.35 - 0.1);
      // Lowered arms raised forward into a reach.
      if (h.armL) h.armL.rotation.x = -F * (1.35 + Math.sin(t * 2.1) * 0.12);
      if (h.armR) h.armR.rotation.x = -F * (1.25 + Math.cos(t * 1.7) * 0.12);
      if (h.torso) {
        h.torso.rotation.x = F * 0.22;
        h.torso.rotation.z = Math.sin(t * 1.6) * 0.08;
      }
      if (h.head) {
        h.head.rotation.z = 0.3 + Math.sin(t * 0.9) * 0.1;
        h.head.rotation.x = F * 0.15;
      }
      break;
    }
    case "ghost": {
      // standing the way someone stands in a room they know: arms loose,
      // head a little down, swaying with the air
      if (h.legL) h.legL.rotation.x = 0;
      if (h.legR) h.legR.rotation.x = 0;
      if (h.armL) h.armL.rotation.x = Math.sin(t * 0.5) * 0.04;
      if (h.armR) h.armR.rotation.x = Math.sin(t * 0.5 + 1.3) * 0.04;
      if (h.torso) {
        h.torso.rotation.x = F * 0.04;
        h.torso.rotation.z = Math.sin(t * 0.35) * 0.03;
      }
      if (h.head) {
        h.head.rotation.x = F * 0.18;
        h.head.rotation.z = 0.08 + Math.sin(t * 0.27) * 0.05;
      }
      break;
    }
    case "idle":
    default: {
      const b = Math.sin(t * 1.8);
      if (h.legL) h.legL.rotation.x = 0;
      if (h.legR) h.legR.rotation.x = 0;
      if (h.armL) h.armL.rotation.x = b * 0.03;
      if (h.armR) h.armR.rotation.x = -b * 0.03;
      if (h.torso) {
        h.torso.rotation.x = 0;
        h.torso.position.y = h.hip + b * 0.004;
      }
      if (h.head) h.head.rotation.z = 0;
    }
  }
}

/** A rigged GLB character: its own clone of the scene and skeleton, plus a mixer. */
export type SkinnedCharacter = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  /** clips by the last part of their name ("Idle", "Walk", "Run"…) */
  actions: Record<string, THREE.AnimationAction>;
  /** what playClip last started */
  playing: THREE.AnimationAction | null;
};

/** The man the keeper and the guest are, and the shape you take as the ghost. */
export const MAN_HEIGHT = 1.72;
/** The Quaternius clips play at a fixed stride; these speeds keep the feet from sliding. */
const CLIP_RATE = { idle: 1, walk: 1.05, run: 1 };
const CLIP_NAME = { idle: "Idle", walk: "Walk", run: "Run" };

/** Crossfades to `clip` if it isn't already playing, and advances the character. */
export function playClip(c: SkinnedCharacter, clip: Clip, dt: number) {
  const next = c.actions[CLIP_NAME[clip]];
  if (next && next !== c.playing) {
    next.reset().setEffectiveTimeScale(CLIP_RATE[clip]).fadeIn(0.15).play();
    c.playing?.fadeOut(0.15);
    c.playing = next;
  }
  c.mixer.update(dt);
}

/**
 * Loads a rigged, animated GLB (e.g. the Quaternius "Man"), converts its
 * materials to PS1 Lambert, scales it to `height` metres standing on y = 0,
 * and optionally gives it the neon inverted-hull outline. The shell is itself
 * a SkinnedMesh on the same skeleton, pushed out along the normals in the
 * vertex shader, so it bends with the body. Or pass `points` (a stable object,
 * like useModel's) to draw it as a point cloud that bends with it instead.
 */
export function useSkinnedCharacter(name: string, height: number, neon?: { color: string; thickness: number }, points?: PointCloudOptions): SkinnedCharacter {
  const gltf = useGLTF(modelUrl(name));
  return useMemo(() => {
    const root = cloneSkinned(gltf.scene) as THREE.Group;
    applyPS1(root);

    // measure the posed skin (bone matrices must be current, or the bounds
    // come out in raw bind-space units)
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    root.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      m.skeleton.update();
      m.computeBoundingBox();
      box.union(m.boundingBox!.clone().applyMatrix4(m.matrixWorld));
    });
    const scale = height / Math.max(1e-6, box.max.y - box.min.y);
    root.scale.setScalar(scale);
    root.position.y = -box.min.y * scale;

    if (neon) {
      root.updateMatrixWorld(true);
      const skinned: THREE.SkinnedMesh[] = [];
      root.traverse((o) => {
        if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
      });
      for (const mesh of skinned) {
        // geometry units → metres, measured on the bind pose
        mesh.geometry.computeBoundingBox();
        const gb = mesh.geometry.boundingBox!;
        const geomSize = Math.max(gb.max.x - gb.min.x, gb.max.y - gb.min.y, gb.max.z - gb.min.z) || 1;
        const push = neon.thickness * (geomSize / height);
        const mat = patchPS1(new THREE.MeshBasicMaterial({ color: neon.color, side: THREE.BackSide, fog: true }));
        const ps1 = mat.onBeforeCompile;
        mat.onBeforeCompile = (shader, renderer) => {
          ps1(shader, renderer);
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            transformed += normal * ${push.toFixed(5)};`
          );
        };
        mat.customProgramCacheKey = () => `ps1-neon-${push.toFixed(5)}`;
        const shell = new THREE.SkinnedMesh(mesh.geometry, mat);
        shell.name = `${mesh.name}-neon`;
        shell.position.copy(mesh.position);
        shell.quaternion.copy(mesh.quaternion);
        shell.scale.copy(mesh.scale);
        shell.bind(mesh.skeleton, mesh.bindMatrix);
        shell.frustumCulled = false;
        mesh.frustumCulled = false;
        mesh.parent!.add(shell);
      }
    }

    if (points) toPointCloud(root, points);

    const mixer = new THREE.AnimationMixer(root);
    const actions: Record<string, THREE.AnimationAction> = {};
    for (const clip of gltf.animations) {
      // "HumanArmature|Man_Walk" → "Walk"
      const key = clip.name.split(/[|_]/).pop()!;
      actions[key] = mixer.clipAction(clip);
    }
    return { root, mixer, actions, playing: null };
  }, [gltf, height, neon, points]);
}

/** Bones whose skin gets covered by clothing in `dressCharacter` (long sleeves, long trousers). */
// three.js strips the dots from glTF names ("UpperLeg.L" → "UpperLegL")
const COVERED = /^(Shoulder|UpperArm|LowerArm|UpperLeg|LowerLeg|Foot)[LR]?$/;

/**
 * Recolours a Quaternius character: the clothing materials (Shirt, Pants,
 * Socks) take `cloth`, and the skin over the arms and legs is painted `cloth`
 * too, by bone weight, so short sleeves become long ones. Face, neck and
 * hands stay bare.
 */
export function dressCharacter(root: THREE.Object3D, cloth: THREE.ColorRepresentation) {
  const clothColor = new THREE.Color(cloth);
  // clone() copies userData (so patchPS1 would skip it) but not the shader hook
  const repatch = (m: THREE.Material) => {
    delete m.userData.ps1;
    return patchPS1(m);
  };
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || mesh.name.endsWith("-neon")) return;
    const src = mesh.material as THREE.MeshLambertMaterial;
    if (/^(Shirt|Pants|Socks)$/.test(src.name)) {
      const m = src.clone();
      m.color.copy(clothColor);
      repatch(m);
      mesh.material = m;
    } else if (src.name === "Skin") {
      const covered = mesh.skeleton.bones.map((b) => COVERED.test(b.name));
      const idx = mesh.geometry.getAttribute("skinIndex");
      const wgt = mesh.geometry.getAttribute("skinWeight");
      const colors = new Float32Array(idx.count * 3);
      for (let i = 0; i < idx.count; i++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (covered[idx.getComponent(i, k)]) w += wgt.getComponent(i, k);
        (w > 0.5 ? clothColor : src.color).toArray(colors, i * 3);
      }
      mesh.geometry = mesh.geometry.clone();
      mesh.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const m = src.clone();
      m.color.set(0xffffff);
      m.vertexColors = true;
      repatch(m);
      mesh.material = m;
    }
  });
}
