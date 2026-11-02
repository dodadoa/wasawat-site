import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * A human-proportioned figure built from capsules and spheres, laid out with
 * the same part names, pivots and T-pose convention as the Kenney characters
 * so `humanoidParts` / `animateHumanoid` drive it unchanged:
 *
 *   root
 *   ├─ leg-left / leg-right   pivot at the hip, geometry hangs down -Y
 *   └─ torso                  pivot at the hip, geometry rises +Y
 *      ├─ head                pivot at the neck
 *      ├─ arm-left            pivot at the shoulder, extends +X (T-pose)
 *      └─ arm-right           pivot at the shoulder, extends -X (T-pose)
 *
 * Dimensions are in model units before KIT_SCALE (2), so H = 0.8 is 1.6 m.
 */
const H = 0.8;
const HIP = 0.48 * H;
const SHOULDER = 0.3 * H; // above the hip
const NECK = SHOULDER + 0.03 * H;

function capsuleY(r: number, len: number, y0: number, y1: number, x = 0, z = 0) {
  // capsule whose straight section runs from y0 to y1 (y1 > y0)
  const g = new THREE.CapsuleGeometry(r, len, 4, 10);
  g.translate(x, (y0 + y1) / 2, z);
  return g;
}

function blob(rx: number, ry: number, rz: number, x: number, y: number, z: number) {
  const g = new THREE.SphereGeometry(1, 12, 10);
  g.scale(rx, ry, rz);
  g.translate(x, y, z);
  return g;
}

function part(name: string, geoms: THREE.BufferGeometry[], mat: THREE.Material) {
  const merged = mergeGeometries(geoms, false)!;
  geoms.forEach((g) => g.dispose());
  const m = new THREE.Mesh(merged, mat);
  m.name = name;
  return m;
}

function leg(name: string, x: number, mat: THREE.Material) {
  const thighR = 0.075 * H;
  const calfR = 0.055 * H;
  const knee = -HIP * 0.5;
  const m = part(
    name,
    [
      capsuleY(thighR, HIP * 0.5 - thighR, knee, 0),
      capsuleY(calfR, HIP * 0.48 - calfR, -HIP + calfR, knee),
      blob(0.05 * H, 0.03 * H, 0.1 * H, 0, -HIP + 0.03 * H, 0.04 * H), // foot
    ],
    mat,
  );
  m.position.set(x, HIP, 0);
  return m;
}

function arm(name: string, side: 1 | -1, mat: THREE.Material) {
  const upperR = 0.048 * H;
  const foreR = 0.04 * H;
  const upper = 0.17 * H;
  const fore = 0.15 * H;
  const geoms = [
    capsuleY(upperR, upper - upperR, 0, upper),
    capsuleY(foreR, fore - foreR, upper - foreR, upper + fore),
    blob(0.035 * H, 0.05 * H, 0.025 * H, 0, upper + fore + 0.04 * H, 0), // hand
    blob(0.06 * H, 0.055 * H, 0.06 * H, 0, 0.01 * H, 0), // shoulder cap
  ];
  // built along +Y; lay it along ±X for the T-pose
  geoms.forEach((g) => g.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2));
  const m = part(name, geoms, mat);
  m.position.set(side * 0.19 * H, SHOULDER - 0.02 * H, 0);
  return m;
}

export function buildHumanFigure(color = new THREE.Color(0.85, 0.8, 0.75)): THREE.Group {
  const mat = new THREE.MeshLambertMaterial({ color });
  const root = new THREE.Group();
  root.name = "root";

  const torso = part(
    "torso",
    [
      blob(0.13 * H, 0.09 * H, 0.085 * H, 0, 0.03 * H, 0), // pelvis
      capsuleY(0.095 * H, 0.1 * H, 0.08 * H, 0.22 * H), // waist to chest
      blob(0.17 * H, 0.1 * H, 0.09 * H, 0, SHOULDER - 0.05 * H, 0), // chest + shoulders
      capsuleY(0.035 * H, 0.04 * H, SHOULDER - 0.02 * H, NECK + 0.01 * H), // neck
    ],
    mat,
  );
  torso.position.set(0, HIP, 0);

  const head = part(
    "head",
    [
      blob(0.075 * H, 0.09 * H, 0.08 * H, 0, 0.09 * H, 0),
      blob(0.055 * H, 0.05 * H, 0.05 * H, 0, 0.04 * H, 0.02 * H), // jaw
    ],
    mat,
  );
  head.position.set(0, NECK, 0);

  torso.add(head, arm("arm-left", 1, mat), arm("arm-right", -1, mat));
  root.add(leg("leg-left", 0.085 * H, mat), leg("leg-right", -0.085 * H, mat), torso);
  return root;
}
