import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cameras, type CamZone } from "./level";
import { world, inBox, you } from "./world";
import { useGame } from "./store";
import { presence } from "./presence";

/** How far the fixed camera follows your head (webcam on): metres across, up, and in. */
const PARALLAX = { x: 0.45, y: 0.25, lean: 0.6 };
/** The ghost camera: not one of the house's fixed cameras, but where you are, looking where you look. */
const EYES: CamZone = { id: "eyes", x1: 0, x2: 0, z1: 0, z2: 0, pos: [0, 0, 0], look: [0, 0, 0], fov: 62 };
/** Eye height, and how far it rises and sinks on the air. */
const EYE_Y = 1.45;
const EYE_BOB = 0.03;

const base = new THREE.Vector3();
const look = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const fwd = new THREE.Vector3();
const head = new THREE.Vector3();

/**
 * Resident Evil style: fixed cameras per zone, hard cuts between them.
 * With the webcam on, the fixed camera sways with your head, so the screen
 * becomes a window you can look around the edge of. They follow you, not the
 * guest; as the ghost camera you are the camera, and there are no cuts.
 */
export function CameraDirector() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useFrame(({ clock }, dt) => {
    const p = you().pos;
    const eyes = useGame.getState().role === "camera";
    if (eyes) aim(clock.elapsedTime);
    const zone = eyes ? EYES : cameras.find((c) => inBox(c, p.x, p.z)) ?? cameras.find((c) => c.id === world.zone) ?? cameras[0];
    const cut = zone.id !== world.zone;
    if (cut) {
      world.zone = zone.id;
      camera.fov = zone.fov ?? 50;
      camera.updateProjectionMatrix();
      useGame.getState().setCamera(zone.id);
    }
    // where your head is relative to the screen, eased so tracking jitter doesn't shake the room
    const f = presence.face;
    const on = presence.active && f.seen;
    const k = cut ? 1 : 1 - Math.exp(-4 * Math.min(dt, 0.05));
    head.x += ((on ? f.x : 0) - head.x) * k;
    head.y += ((on ? f.y : 0) - head.y) * k;
    head.z += ((on ? THREE.MathUtils.clamp((f.size - 0.2) / 0.2, -0.5, 1) : 0) - head.z) * k;
    place(camera, zone);
  });
  return null;
}

function aim(t: number) {
  const { pos, yaw, pitch } = world.ghost;
  const y = EYE_Y + Math.sin(t * 0.9) * EYE_BOB;
  EYES.pos = [pos.x, y, pos.z];
  EYES.look = [pos.x + Math.sin(yaw) * Math.cos(pitch), y + Math.sin(pitch), pos.z + Math.cos(yaw) * Math.cos(pitch)];
}

function place(camera: THREE.PerspectiveCamera, zone: CamZone) {
  base.set(...zone.pos);
  look.set(...zone.look);
  fwd.copy(look).sub(base).normalize();
  right.crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
  up.crossVectors(right, fwd);
  camera.position
    .copy(base)
    .addScaledVector(right, head.x * PARALLAX.x)
    .addScaledVector(up, head.y * PARALLAX.y)
    .addScaledVector(fwd, head.z * PARALLAX.lean);
  camera.lookAt(look);
}
