import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCREEN } from "./level";
import { world } from "./world";
import { useGame } from "./store";
import { storm } from "./weather";
import { story } from "./story";

/** The two reels never run at the same speed or the same length, so they can't line up. */
const REEL = { romance: { fps: 12, loop: 15 }, noir: { fps: 9, loop: 13 } };
/** Seconds of each way of putting them together: cut, side by side, laid over. */
const SPELL = 14;

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Two films drawn from nothing but shapes, at the few dozen texels a screen
 * gets at this resolution. p runs -1..1 across and -0.5..0.5 up.
 */
const fragment = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uLevel;
/** the film is speaking: it cuts to the face */
uniform float uClose;
/** 0..1: how much of the guest has gone into the film */
uniform float uGuest;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float blob(vec2 p, vec2 c, vec2 r) { return 1.0 - step(1.0, length((p - c) / r)); }
float box(vec2 p, vec2 c, vec2 h) { vec2 d = abs(p - c) - h; return 1.0 - step(0.0, max(d.x, d.y)); }

/** Someone in a long coat, feet at 'at', h tall. turn: 0 edge on, 1 square on. */
float figure(vec2 p, vec2 at, float h, float turn) {
  vec2 q = (p - at) / h;
  float wide = mix(0.085, mix(0.1, 0.17, turn), smoothstep(0.0, 0.75, q.y));
  float coat = step(0.0, q.y) * step(q.y, 0.8) * step(abs(q.x), wide);
  return max(coat, blob(q, vec2(0.0, 0.9), vec2(0.075, 0.095)));
}

/** The one it lost: warm, patient, a love story that never gets past the first reel. */
vec3 romance(vec2 p, float t) {
  float s = mod(t, ${REEL.romance.loop.toFixed(1)});
  if (uClose > 0.5 || (s > 6.0 && s < 11.0)) {
    // the face, lit from one side
    vec3 c = vec3(0.08, 0.05, 0.04) + vec3(0.07, 0.035, 0.015) * (p.x + 1.0);
    c = mix(c, vec3(0.06, 0.035, 0.03), blob(p, vec2(0.0, -0.62), vec2(0.66, 0.36)));
    c = mix(c, vec3(0.07, 0.04, 0.03), blob(p, vec2(0.0, 0.08), vec2(0.28, 0.42)));
    vec3 skin = mix(vec3(0.16, 0.08, 0.06), vec3(0.74, 0.56, 0.42), smoothstep(-0.18, 0.12, p.x + p.y * 0.3));
    c = mix(c, skin, blob(p, vec2(0.02, 0.0), vec2(0.21, 0.3)));
    float open = step(0.07, fract(t * 0.23));
    vec3 eye = vec3(0.05, 0.03, 0.03);
    c = mix(c, eye, open * (box(p, vec2(-0.07, 0.07), vec2(0.035, 0.014)) + box(p, vec2(0.11, 0.07), vec2(0.035, 0.014))));
    // the smile: a mouth bent up at the corners, moving while it speaks
    vec2 m = p - vec2(0.02, -0.14);
    m.y -= m.x * m.x * 2.2;
    c = mix(c, vec3(0.42, 0.1, 0.09), box(m, vec2(0.0), vec2(0.085, 0.01 + uClose * 0.016 * (0.5 + 0.5 * sin(t * 15.0)))));
    return c;
  }
  if (s > 11.0) {
    // row C: two can sit here, one does
    vec3 c = vec3(0.07, 0.04, 0.05) + vec3(0.3, 0.26, 0.24) * smoothstep(0.1, 0.5, p.y);
    c = mix(c, vec3(0.34, 0.06, 0.05), box(p, vec2(0.0, -0.2), vec2(0.5, 0.2)));
    c = mix(c, vec3(0.2, 0.03, 0.03), box(p, vec2(0.0, -0.36), vec2(0.56, 0.14)));
    return mix(c, vec3(0.03, 0.02, 0.02), figure(p, vec2(0.27, -0.45), 0.72, 1.0));
  }
  // the doorway: the back of someone, who turns, and smiles at whoever is coming in
  vec3 c = vec3(0.13, 0.08, 0.06) + vec3(0.05, 0.03, 0.02) * (p.x + 1.0);
  c = mix(c, vec3(0.22, 0.14, 0.09), box(p, vec2(0.0, -0.46), vec2(1.0, 0.06)));
  vec2 d = p - vec2(0.32, -0.04);
  c = mix(c, vec3(0.32, 0.2, 0.13), box(p, vec2(0.32, -0.04), vec2(0.27, 0.46)));
  c = mix(c, vec3(1.0, 0.86, 0.62) * (0.8 + 0.25 * (d.y + 0.5)), box(d, vec2(0.0), vec2(0.23, 0.42)));
  float turn = smoothstep(1.5, 3.5, s);
  c = mix(c, vec3(0.05, 0.03, 0.03), figure(p, vec2(0.32, -0.46), 0.8, turn));
  return mix(c, vec3(0.8, 0.55, 0.42), turn * blob(p, vec2(0.3, 0.26), vec2(0.04, 0.052)));
}

/** The case it was given: cold, wet, a detective picture about somebody else. */
vec3 noir(vec2 p, float t) {
  float s = mod(t, ${REEL.noir.loop.toFixed(1)});
  vec3 neon = vec3(1.0, 0.3, 0.2);
  if (s > 5.0 && s < 8.5) {
    // the side of a face under a hat, looking the way the other film is
    vec3 c = vec3(0.03, 0.05, 0.08) + vec3(0.09, 0.14, 0.2) * smoothstep(0.5, -0.1, p.x);
    vec2 h = p - vec2(-0.1, 0.0);
    float head = max(blob(h, vec2(0.0), vec2(0.21, 0.28)), blob(h, vec2(0.2, -0.04), vec2(0.06, 0.05)));
    float hat = max(box(h, vec2(0.0, 0.27), vec2(0.21, 0.12)), box(h, vec2(0.03, 0.17), vec2(0.34, 0.016)));
    float collar = box(h, vec2(-0.05, -0.42), vec2(0.34, 0.16));
    c = mix(c, vec3(0.26, 0.31, 0.36), head);
    c = mix(c, vec3(0.02, 0.02, 0.03), max(hat, collar));
    return mix(c, neon, box(h, vec2(0.09, 0.04), vec2(0.03, 0.012)));
  }
  if (s > 8.5) {
    // the street door, and someone standing at it
    vec3 c = vec3(0.04, 0.06, 0.08);
    c = mix(c, vec3(0.13, 0.2, 0.17), box(p, vec2(0.14, -0.02), vec2(0.34, 0.46)));
    c = mix(c, vec3(0.05, 0.08, 0.07), box(p, vec2(0.14, -0.02), vec2(0.01, 0.46)));
    c = mix(c, vec3(0.5, 0.56, 0.6), box(p, vec2(0.14, 0.38), vec2(0.28, 0.05)));
    float me = figure(p, vec2(-0.1, -0.46), 0.8, 0.3);
    float edge = figure(p, vec2(-0.1, -0.47), 0.84, 0.32) - me;
    return mix(mix(c, vec3(0.02, 0.02, 0.03), me), neon, max(edge, 0.0));
  }
  // walking in the rain and getting no closer, under the one lamp on Decho Road
  vec3 c = vec3(0.03, 0.05, 0.08);
  float cone = step(abs(p.x + 0.3), (0.5 - p.y) * 0.5);
  c += vec3(0.12, 0.18, 0.24) * cone;
  c = mix(c, vec3(0.08, 0.11, 0.14), box(p, vec2(0.0, -0.46), vec2(1.0, 0.06)));
  float col = floor(p.x * 55.0);
  float drop = step(0.965, hash(vec2(col, floor(p.y * 7.0 + t * 8.0 + hash(vec2(col, 1.0)) * 9.0))));
  c += vec3(0.35, 0.45, 0.55) * drop;
  vec2 at = vec2(-0.3, -0.46 + abs(sin(t * 3.0)) * 0.012);
  float me = figure(p, at, 0.8, 0.45);
  float edge = figure(p, at - vec2(0.0, 0.01), 0.84, 0.47) - me;
  me = max(me, box(p, at + vec2(0.0, 0.8), vec2(0.13, 0.012)));
  return mix(mix(c, vec3(0.02, 0.02, 0.03), me), neon, max(edge, 0.0));
}

/** One frame of a reel: stepped time, a little gate weave, a scratch, the odd dust. */
vec3 reel(vec2 p, float fps, float seed, bool warm) {
  float t = floor(uTime * fps) / fps;
  vec2 q = p + (vec2(hash(vec2(t, seed)), hash(vec2(seed, t))) - 0.5) * 0.008;
  vec3 c = warm ? romance(q, t) : noir(q, t);
  c *= 0.9 + 0.14 * hash(vec2(t * 3.0, seed));
  float scratch = step(0.9, hash(vec2(t, seed + 2.0))) * step(abs(q.x - (hash(vec2(seed, t * 7.0)) * 2.0 - 1.0)), 0.006);
  return c + (warm ? vec3(0.3, 0.26, 0.2) : vec3(0.2, 0.24, 0.3)) * scratch;
}

vec3 love(vec2 p) { return reel(p, ${REEL.romance.fps.toFixed(1)}, 3.1, true); }
vec3 case_(vec2 p) { return reel(p, ${REEL.noir.fps.toFixed(1)}, 8.7, false); }

void main() {
  vec2 cell = vec2(128.0, 64.0);
  vec2 p = (floor(vUv * cell) / cell - 0.5) * vec2(2.0, 1.0);
  vec3 c = love(p);
  if (uGuest > 0.0 && uGuest < 1.0) {
    // it comes up through the other film, like a stain
    c += case_(p) * uGuest * (0.6 + 0.4 * hash(vec2(floor(uTime * 12.0), 5.0)));
  } else if (uGuest >= 1.0) {
    float spell = floor(mod(uTime / ${SPELL.toFixed(1)}, 3.0));
    if (spell < 1.0) {
      // cut together: each seems to answer the other, as a cut always can
      if (fract(uTime / 4.4) > 0.5) c = case_(p);
    } else if (spell < 2.0) {
      // side by side, looking at each other across the black of the frame line
      float gap = 1.0 - step(0.035, abs(p.x));
      c = p.x < 0.0 ? case_(p + vec2(0.5, 0.0)) : love(p - vec2(0.5, 0.0));
      c *= 1.0 - gap;
    } else {
      // laid over each other, sliding: when they would line up the film jumps a splice
      float slide = sin(uTime * 0.31) * 0.42;
      c = 1.0 - (1.0 - love(p + vec2(slide, 0.0))) * (1.0 - case_(p - vec2(slide, 0.0)));
      c *= step(0.07, abs(slide));
    }
  }
  vec2 v = vUv - 0.5;
  c *= (1.0 - dot(v, v) * 1.1) * uLevel;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * The cinema screen: a film nobody is projecting. Brightness holds for a "shot"
 * and cuts to a new level, with a little gate flicker on top.
 */
export function Screen() {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uLevel: { value: 1 }, uClose: { value: 0 }, uGuest: { value: 0 } },
      vertexShader: vertex,
      fragmentShader: fragment,
      fog: false,
    }),
    []
  );
  const light = useRef<THREE.PointLight>(null);
  const shot = useRef({ level: 0.9, next: 0 });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t > shot.current.next) {
      shot.current.level = 0.72 + Math.random() * 0.28;
      shot.current.next = t + 2 + Math.random() * 5;
    }
    // the film sags a little when the ghost stands in front of it
    const g = world.enemies.ghost;
    const near = g ? Math.max(0, 1 - Math.hypot(g.x - SCREEN.x, g.z - SCREEN.z) / 4) : 0;
    const v = shot.current.level * (0.92 + Math.sin(t * 48) * 0.04 + Math.random() * 0.04) * (1 - near * (0.35 + 0.15 * Math.sin(t * 9))) * storm.brown;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uLevel.value = v;
    // once it's a reel the two films have the screen to themselves, and neither cuts for the other
    mat.uniforms.uClose.value = story.act !== "reel" && useGame.getState().whisper?.who === "lover" ? 1 : 0;
    mat.uniforms.uGuest.value = story.gone;
    if (light.current) light.current.intensity = 14 * v;
  });
  return (
    <group>
      <mesh position={[SCREEN.x, SCREEN.y, SCREEN.z]} rotation-y={Math.PI} material={mat}>
        <planeGeometry args={[SCREEN.w, SCREEN.h]} />
      </mesh>
      <pointLight ref={light} position={[SCREEN.x, SCREEN.y, SCREEN.z - 1.4]} color="#ffe6cc" intensity={10} distance={11} decay={2} />
    </group>
  );
}
