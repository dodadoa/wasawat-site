import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WINDOWS, BAR_GLASSES, floorAt, type FloorId, type StreetWindow } from "./level";
import { storm, tickStorm } from "./weather";
import { setRainRoom } from "./audio";
import { useGame } from "./store";
import { you } from "./world";

const GLASS_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Night over Decho Road through wet glass: blurred street lights, rain in
// threads, drops sliding down, and the lightning. In the brightest strikes
// two figures stand close under one umbrella, dark against the flash.
const GLASS_FRAG = /* glsl */ `
uniform float uTime;
uniform float uFlash;
uniform float uCouple;
uniform float uSeed;
uniform vec2 uSize;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float box(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void main() {
  // chunky texels, like everything else in the house
  vec2 px = uSize * 56.0;
  vec2 uv = (floor(vUv * px) + 0.5) / px;
  // height-normalised coordinates, centred
  vec2 q = vec2((uv.x - 0.5) * uSize.x / uSize.y, uv.y);

  vec3 col = mix(vec3(0.07, 0.08, 0.13), vec3(0.015, 0.02, 0.04), uv.y);
  col += vec3(0.3, 0.14, 0.05) * smoothstep(0.55, 0.0, uv.y) * 0.3; // sodium glow off the street

  // street lights, smeared by the water
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 c = vec2((hash(vec2(fi, uSeed)) - 0.5) * uSize.x / uSize.y, 0.08 + 0.4 * hash(vec2(uSeed, fi)));
    vec2 d = (q - c) * vec2(1.0, 0.55);
    float wob = 0.85 + 0.15 * sin(uTime * (0.7 + fi * 0.3) + fi);
    vec3 tint = mix(vec3(1.0, 0.55, 0.25), vec3(0.55, 0.7, 1.0), step(0.6, hash(vec2(fi, fi + uSeed))));
    col += tint * 0.22 * wob * smoothstep(0.09, 0.0, length(d));
  }

  // lightning lights the whole sky
  col += vec3(0.6, 0.68, 1.0) * uFlash * (0.5 + 0.5 * uv.y);

  // the two of them
  if (uCouple > 0.0) {
    vec2 p = q - vec2(0.02, 0.0);
    float s = box(p - vec2(-0.075, 0.24), vec2(0.06, 0.25), 0.04);
    s = min(s, box(p - vec2(0.07, 0.23), vec2(0.055, 0.24), 0.04));
    s = min(s, length(p - vec2(-0.05, 0.56)) - 0.05);  // heads tipped together
    s = min(s, length(p - vec2(0.045, 0.545)) - 0.046);
    vec2 u = p - vec2(0.0, 0.64);
    s = min(s, max(length(u * vec2(1.0, 1.6)) - 0.2, -u.y)); // one umbrella
    s = min(s, box(p - vec2(0.0, 0.6), vec2(0.006, 0.05), 0.0));
    float sil = smoothstep(0.012, 0.0, s);
    col = mix(col, vec3(0.01, 0.012, 0.02), sil * uCouple * smoothstep(0.05, 0.35, uFlash));
  }

  // rain falling outside, in threads
  float lane = floor(uv.x * px.x / 2.0);
  float speed = 1.6 + hash(vec2(lane, 1.0)) * 1.4;
  float fall = fract(uv.y * uSize.y * 1.8 + uTime * speed + hash(vec2(lane, 2.0)));
  col += vec3(0.42, 0.48, 0.62) * step(0.88, fall) * step(0.55, hash(vec2(lane, 3.0))) * (0.18 + uFlash * 0.6);

  // drops on the glass, sliding down slowly, leaving a wet trail
  vec2 cell = vec2(6.0, 4.0) * uSize;
  vec2 ci = floor(vUv * cell);
  vec2 cf = fract(vUv * cell);
  float h = hash(ci + uSeed);
  if (h > 0.62) {
    float y = 1.0 - fract(uTime * (0.04 + h * 0.08) + h * 7.0);
    float drop = smoothstep(0.16, 0.06, length((cf - vec2(0.5, y)) * vec2(1.0, 1.3)));
    float trail = step(abs(cf.x - 0.5), 0.05) * step(y, cf.y) * (1.0 - cf.y) * 0.5;
    col += vec3(0.5, 0.55, 0.7) * (drop * 0.35 + trail * 0.12) * (0.4 + uFlash * 1.5);
  }

  gl_FragColor = vec4(col, 1.0);
}`;

function Glass({ win, index }: { win: StreetWindow; index: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLASS_VERT,
        fragmentShader: GLASS_FRAG,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uFlash: { value: 0 },
          uCouple: { value: 0 },
          uSeed: { value: index * 13.7 + 3.1 },
          uSize: { value: new THREE.Vector2(win.w, win.h) },
        },
      }),
    [win, index]
  );
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uFlash.value = storm.flash;
    mat.uniforms.uCouple.value = storm.couple === index ? 1 : 0;
    if (light.current) light.current.intensity = storm.flash * 34;
  });
  return (
    <>
      <mesh position={[win.x, win.y, win.z]} rotation-y={Math.atan2(win.face[0], win.face[1])} material={mat}>
        <planeGeometry args={[win.w, win.h]} />
      </mesh>
      {/* the cold light that comes in with each strike (one window per room carries it) */}
      {win.light && <pointLight ref={light} position={win.light} color="#a8b8ff" intensity={0} distance={9} decay={1.6} />}
    </>
  );
}

/**
 * Two glasses on the bar in front of the fourth stool, the one someone said
 * yes on. They are only there while the lightning is.
 */
function LightningGlasses() {
  const ref = useRef<THREE.Group>(null);
  const { glass, wine } = useMemo(
    () => ({
      glass: new THREE.MeshBasicMaterial({ color: "#9aa4c0", transparent: true, opacity: 0.55, fog: false }),
      wine: new THREE.MeshBasicMaterial({ color: "#5a0812", fog: false }),
    }),
    []
  );
  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = storm.flash > 0.22;
    glass.opacity = 0.25 + storm.flash * 0.5;
  });
  const one = (x: number, lean: number) => (
    <group position={[x, BAR_GLASSES.y + 0.005, BAR_GLASSES.z]} rotation-z={lean}>
      <mesh position={[0, 0.004, 0]} material={glass}>
        <cylinderGeometry args={[0.03, 0.03, 0.008, 8]} />
      </mesh>
      <mesh position={[0, 0.045, 0]} material={glass}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 4]} />
      </mesh>
      <mesh position={[0, 0.115, 0]} material={glass}>
        <cylinderGeometry args={[0.04, 0.026, 0.07, 8]} />
      </mesh>
      <mesh position={[0, 0.1, 0]} material={wine}>
        <cylinderGeometry args={[0.03, 0.022, 0.03, 8]} />
      </mesh>
    </group>
  );
  return (
    <group ref={ref} visible={false}>
      {one(BAR_GLASSES.x - 0.11, 0.04)}
      {one(BAR_GLASSES.x + 0.11, -0.04)}
    </group>
  );
}

export function Storm() {
  const ambient = useRef<THREE.AmbientLight>(null);
  const room = useRef<FloorId | null>(null);
  useFrame((_, dt) => {
    if (useGame.getState().phase !== "playing") return;
    tickStorm(Math.min(dt, 0.05));
    if (ambient.current) ambient.current.intensity = storm.flash * 2.2;
    const f = floorAt(you().pos.x);
    if (f !== room.current) {
      room.current = f;
      setRainRoom(f);
    }
  });
  return (
    <>
      <ambientLight ref={ambient} color="#8090ff" intensity={0} />
      {WINDOWS.map((w, i) => (
        <Glass key={i} win={w} index={i} />
      ))}
      <LightningGlasses />
    </>
  );
}
