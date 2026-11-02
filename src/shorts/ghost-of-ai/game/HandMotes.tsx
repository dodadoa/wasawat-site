import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { presence } from "./presence";
import { you } from "./world";
import { softPointMaterial } from "./ps1/PointCloud";
import { reach } from "./reach";
import { useGame } from "./store";

/** MediaPipe's hand skeleton: wrist, thumb, four fingers, the palm's knuckle line. */
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const PER_JOINT = 3;
const PER_BONE = 5;
/** Motes that run down the line from a pointing finger to what it's on. */
const RAY = 26;
const COUNT = 21 * PER_JOINT + BONES.length * PER_BONE + RAY;
const OPACITY = 0.3;
/** Brighter while it's on the guest, or pointing at something. */
const OPACITY_ON = 0.6;
/** Seconds of holding a point until the line reaches what it's on. */
const RAY_GROW = 0.7;
const COLOR = new THREE.Color("#d8e2ff");

const fwd = new THREE.Vector3();
const dir = new THREE.Vector3();
const joints = Array.from({ length: 21 }, () => new THREE.Vector3());

/**
 * Your hand, reaching into the house through the webcam: a few dozen cold
 * motes along the bones, at about the keeper's depth, nearer the camera as
 * you reach toward the screen. The ghost can feel where it is (presence.hand.world).
 * As the ghost, it comes to the guest's depth when it's over him, and a held
 * point draws a thin line of motes out to whatever it's on.
 */
export function HandMotes() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { points, mat, jitter } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    const colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const b = 0.6 + Math.random() * 0.4;
      colors.set([COLOR.r * b, COLOR.g * b, COLOR.b * b], i * 3);
    }
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = softPointMaterial(0.16, 0, 0.8, 0.012, true);
    // it's your hand, on this side of the room: the floor doesn't hide it when it's low in the frame
    mat.depthTest = false;
    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;
    // each mote sits a little off the bone, so the hand reads as haze, not a wireframe
    const jitter = Float32Array.from({ length: COUNT * 3 }, () => (Math.random() - 0.5) * 0.05);
    return { points, mat, jitter };
  }, []);
  const fade = useMemo(() => ({ v: 0, pull: 0, lit: 0 }), []);

  useFrame(({ clock }, dt) => {
    const h = presence.hand;
    const on = presence.active && h.seen;
    fade.v += ((on ? 1 : 0) - fade.v) * (1 - Math.exp(-(on ? 5 : 2) * Math.min(dt, 0.05)));
    const ghostly = useGame.getState().role !== "keeper";
    const k = 1 - Math.exp(-8 * Math.min(dt, 0.05));
    fade.pull += ((ghostly && reach.over ? 1 : 0) - fade.pull) * k;
    fade.lit += ((ghostly && (reach.over || reach.aim) ? 1 : 0) - fade.lit) * k;
    mat.uniforms.uOpacity.value = fade.v * THREE.MathUtils.lerp(OPACITY, OPACITY_ON, fade.lit);
    mat.uniforms.uTime.value = clock.elapsedTime;
    if (!on) return;

    // the hand's plane: around the keeper, closer as the hand nears the webcam
    camera.getWorldDirection(fwd);
    const p = you().pos;
    const keeperDepth = Math.max(1.5, (p.x - camera.position.x) * fwd.x + (0.9 - camera.position.y) * fwd.y + (p.z - camera.position.z) * fwd.z);
    const near = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(h.size, 0.08, 0.28, 1.1, 0.45), 0.35, 1.3);
    const depth = THREE.MathUtils.lerp(keeperDepth * near, Math.max(1, reach.depth), fade.pull);
    // how wide the frame is at that depth, to scale MediaPipe's relative z
    const span = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    h.points.forEach((lm, i) => {
      dir.set(lm.x, lm.y, 0.5).unproject(camera).sub(camera.position);
      const t = depth / dir.dot(fwd);
      joints[i].copy(camera.position).addScaledVector(dir, t).addScaledVector(fwd, lm.z * span * 0.5);
    });
    h.world.copy(joints[0]).lerp(joints[9], 0.5);

    const pos = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    let n = 0;
    const put = (v: THREE.Vector3) => {
      pos.setXYZ(n, v.x + jitter[n * 3], v.y + jitter[n * 3 + 1], v.z + jitter[n * 3 + 2]);
      n++;
    };
    for (const j of joints) for (let k = 0; k < PER_JOINT; k++) put(j);
    for (const [a, b] of BONES)
      for (let k = 0; k < PER_BONE; k++) put(dir.copy(joints[a]).lerp(joints[b], (k + 0.5) / PER_BONE));
    const grown = ghostly && reach.aim ? Math.min(1, reach.aimed / RAY_GROW) : 0;
    for (let k = 0; k < RAY; k++) {
      // creeping outward, and only as far as the point has been held
      const along = ((k / RAY + clock.elapsedTime * 0.3) % 1) * grown;
      if (grown > 0) put(dir.copy(joints[8]).lerp(reach.target, along));
      else put(dir.set(0, -50, 0));
    }
    pos.needsUpdate = true;
  });

  return <primitive object={points} />;
}
