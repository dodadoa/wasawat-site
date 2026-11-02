import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useHumanFigure, useSkinnedCharacter, playClip, humanoidParts, animateHumanoid, FACE, MAN_HEIGHT } from "./Model";
import { world } from "./world";
import { useGame } from "./store";
import { whisper } from "./audio";
import { CX, LX, FLOOR_BOUNDS, FLOOR_ORDER, KIT_SCALE, floorAt, type FloorId } from "./level";
import { isLate, loadMemories, memoryBus, pickMemory, recall, speak, tickMemories, allMemories, type Memory } from "./memory";
import { voiceLines } from "./voice";
import { presence } from "./presence";

/**
 * The ghost is the house's own spirit, not a body: a person-shaped thinning
 * of the air, a few hundred blurred motes that take the colour of whichever
 * room it is in. It reads best from across the room, thins to almost nothing
 * when you come close, and gathers a little while it speaks.
 */
const GHOST_POINTS = { count: 420, size: 0.28, opacity: 0, brightness: 1, soft: 1.1, curve: 0.8, flow: 0.07, additive: true, haze: 6, pace: 0.3 };
/** Opacity at rest and while speaking (before presence and nearness). */
const OPACITY_REST = 0.035;
const OPACITY_SPEAKING = 0.12;
/** The colour of the room it borrows: street light by the door, lamp amber in the bistro, screen light upstairs. */
const TINT: Record<FloorId, THREE.Color> = { lobby: new THREE.Color("#a9aed8"), bar: new THREE.Color("#c4a08c"), cinema: new THREE.Color("#8f9cd0") };
const MODEL_ROT = FACE > 0 ? 0 : Math.PI;
const DRIFT_SPEED = 0.32;
/** It stands, barely: feet a hair above the parquet. */
const HOVER = 0.03;
/** It only talks when you're this close, on the same floor. */
const EARSHOT = 4.2;
/** Inside this distance it thins out; beyond FADE_FAR it is as clear as it gets. */
const FADE_NEAR = 0.9;
const FADE_FAR = 2.8;
/**
 * With the webcam on (C) it keeps to the edges of being seen: it all but
 * stops while you watch, and moves, and gathers, when you blink or look away.
 * Drift speed and opacity at watched = 0 and watched = 1.
 */
const UNSEEN = { speed: 3.2, opacity: 1.5 };
const SEEN = { speed: 0.12, opacity: 0.55 };
/** It comes to your hand within this distance, and a hand moving faster than SCATTER (frame-widths/s) sends it away. */
const TOUCH = 1.1;
const SCATTER = 1.6;
/**
 * You, as the ghost figure (G): the guest's own body and walk, as points. Much
 * denser than the spirit, since you have to be able to see yourself. Opacity
 * at rest, and just after you stir the lamps, fading back over STIR_GLOW seconds.
 * (The rig is scaled up about 37 times, so its flow of 0.0005 is some 2 cm.)
 */
const FIGURE_POINTS = { count: 520, size: 0.22, opacity: 0, soft: 1.3, flow: 0.004, additive: true, flat: true, haze: 7, pace: 0.3 };
const FIGURE = { opacity: 0.08, stirred: 0.18 };
const STIR_GLOW = 1.4;

/** Places it likes to linger, per floor. */
const WAYPOINTS: Record<FloorId, [number, number][]> = {
  lobby: [[LX + 0, 2.6], [LX - 2.6, 2.4], [LX + 2.4, 2.0], [LX + 0.5, 5.2], [LX - 2.4, 6.0], [LX + 1.8, 4.2], [LX - 1.0, 7.1]],
  bar: [
    [2.6, 4.4], [4.4, 2.0], [1.4, 5.6], [2.6, 9.4], [5.2, 9.0], [-1.8, 3.4], [-1.6, 5.8], [-1.6, 9.8],
    [-8.2, 6.8], [-10.6, 4.6], [-6.4, 4.6], [-8.2, 2.0], [-6.0, 8.0], [-10.4, 8.0], [-14.4, 6.4], [-14.8, 9.2],
  ],
  cinema: [
    [CX + 1.6, 5.4], [CX + 2.9, 9.0], [CX + 5.6, 3.6], [CX + 6.6, 6.6], [CX + 5.0, 9.8], [CX + 10.0, 0.7],
    [CX + 13.0, 0.7], [CX + 14.3, 3.0], [CX + 14.3, 7.6], [CX + 11.5, 4.4], [CX + 11.4, 2.4], [CX + 9.2, 2.4],
  ],
};
const level = (f: FloorId) => FLOOR_ORDER.indexOf(f);
/** Somewhere else to be: the floor next door twice as often as the one beyond. */
function otherFloor(f: FloorId): FloorId {
  const opts = FLOOR_ORDER.filter((o) => o !== f).flatMap((o) => (Math.abs(level(o) - level(f)) === 1 ? [o, o] : [o]));
  return opts[Math.floor(Math.random() * opts.length)];
}

type Mode = "drift" | "leave" | "arrive";

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pickWaypoint = (f: FloorId) => WAYPOINTS[f][Math.floor(Math.random() * WAYPOINTS[f].length)];

function turnToward(cur: number, target: number, maxStep: number) {
  let d = target - cur;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return cur + THREE.MathUtils.clamp(d, -maxStep, maxStep);
}

function cloudsOf(root: THREE.Object3D) {
  const out: THREE.ShaderMaterial[] = [];
  root.traverse((o) => {
    if ((o as THREE.Points).isPoints) out.push((o as THREE.Points).material as THREE.ShaderMaterial);
  });
  return out;
}

export function Ghost() {
  const model = useHumanFigure(GHOST_POINTS);
  const parts = useMemo(() => humanoidParts(model), [model]);
  const clouds = useMemo(() => cloudsOf(model), [model]);
  const ref = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const st = useRef({
    t: 0,
    yaw: 0,
    mode: "drift" as Mode,
    floor: "lobby" as FloorId,
    /** where it is going when it fades out */
    dest: "bar" as FloorId,
    pos: new THREE.Vector3(LX - 1.0, HOVER, 7.1),
    target: [LX - 1.0, 7.1] as [number, number],
    linger: 2,
    /** seconds until it wanders to the other floor */
    floorTimer: rand(50, 90),
    /** seconds the player has been on the other floor */
    apart: 0,
    /** seconds since it arrived on this floor */
    since: 0,
    talkCd: 4,
    farCd: rand(20, 35),
    /** 0..1, glow while speaking */
    voice: 0,
    thinking: false,
    /** 0..1: how much of it is here. It comes and goes on its own. */
    presence: 0,
    presenceTarget: 1,
    presenceCd: rand(8, 16),
    /** 0..1: how near your hand is (webcam) */
    touch: 0,
    /** seconds since you last looked at the screen (webcam) */
    unseen: 0,
    /** you've taken its place */
    you: false,
  });
  world.enemies.ghost = st.current.pos;

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const g = ref.current!;
    const z = st.current;
    const s = useGame.getState();
    const active = s.phase === "playing" && !world.locked;
    if (active) {
      loadMemories();
      tickMemories(dt);
      z.t += dt;
      const p = world.player.pos;
      const pFloor = floorAt(p.x);
      const together = pFloor === z.floor;
      z.apart = together ? 0 : z.apart + dt;
      z.floorTimer -= dt;
      z.since += dt;
      z.voice = Math.max(0, z.voice - dt * 0.35);

      // you take its place; when you give it back it gathers where you left it
      const you = s.role !== "keeper";
      if (you !== z.you) {
        z.you = you;
        z.presenceTarget = 1;
        z.mode = "drift";
        z.thinking = false;
      }

      // the webcam: are you looking, and is your hand in the room on its floor?
      // (in ghost mode you are the ghost, so none of this moves it)
      const cam = presence.active && !you;
      const watched = cam ? presence.watched : 1;
      z.unseen = cam && watched < 0.5 ? z.unseen + dt : 0;
      const h = presence.hand;
      const hand = cam && h.seen && floorAt(h.world.x) === z.floor && z.mode === "drift";
      const handDist = hand ? Math.hypot(h.world.x - z.pos.x, h.world.z - z.pos.z) : Infinity;
      z.touch += ((handDist < TOUCH ? 1 - handDist / TOUCH : 0) - z.touch) * Math.min(1, dt * 2);
      if (hand && h.speed > SCATTER && handDist < TOUCH * 1.6 && z.presenceTarget > 0.5) {
        // a sudden hand scatters it, for a while
        z.presenceTarget = 0.08;
        z.presenceCd = rand(4, 8);
      }

      // Some of the time it is only partly here, or barely at all.
      if (!you && (z.presenceCd -= dt) <= 0) {
        z.presenceCd = rand(6, 18);
        z.presenceTarget = Math.random() < 0.35 ? 0.12 : 1;
      }
      const target = z.mode === "leave" ? 0 : z.voice > 0.05 || z.thinking ? 1 : z.presenceTarget;
      z.presence += THREE.MathUtils.clamp(target - z.presence, -0.45 * dt, 0.3 * dt);

      if (you) {
        // nothing of it shows, but it stays with you: the lamps bow and the guest goes cold
        z.presence = 0;
        z.pos.copy(world.ghost.pos).setY(HOVER);
        z.floor = floorAt(z.pos.x);
      } else if (z.mode === "drift") {
        // It wanders off to another floor now and then, and sooner when
        // you've been up (or down) there a while: it's curious about you.
        if (z.apart > 18 && z.since > 40 && Math.random() < dt * 0.15) {
          z.mode = "leave";
          z.dest = pFloor;
        } else if (z.floorTimer <= 0) {
          z.mode = "leave";
          z.dest = otherFloor(z.floor);
        }

        // it drifts toward a still hand held out in the room
        if (hand && h.speed < SCATTER * 0.5) z.target = [h.world.x, h.world.z];
        const [tx, tz] = z.target;
        const dx = tx - z.pos.x;
        const dz = tz - z.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.08) {
          const speed = cam ? DRIFT_SPEED * THREE.MathUtils.lerp(UNSEEN.speed, SEEN.speed, watched) : DRIFT_SPEED;
          const step = Math.min(d, speed * dt);
          z.pos.x += (dx / d) * step;
          z.pos.z += (dz / d) * step;
          if (z.voice < 0.2) z.yaw = turnToward(z.yaw, Math.atan2(dx, dz), 2 * dt);
        } else if ((z.linger -= dt) <= 0) {
          z.linger = rand(3, 8);
          // drift over to you, or somewhere it remembers
          // unwatched, it comes over to you more often than not
          z.target = together && Math.random() < (z.unseen > 3 ? 0.9 : 0.45)
            ? [p.x + rand(-1.4, 1.4), p.z + rand(-1.4, 1.4)]
            : pickWaypoint(z.floor);
        }
        const b = FLOOR_BOUNDS[z.floor];
        z.pos.x = THREE.MathUtils.clamp(z.pos.x, b.x1 + 0.5, b.x2 - 0.5);
        z.pos.z = THREE.MathUtils.clamp(z.pos.z, b.z1 + 0.5, b.z2 - 0.5);
        z.pos.y = HOVER + Math.sin(z.t * 0.9) * 0.015;

        // you're speaking aloud (webcam): it goes quiet and turns to listen
        if (cam && presence.face.seen && presence.face.mouth > 0.35) {
          z.talkCd = Math.max(z.talkCd, 2.5);
          z.yaw = turnToward(z.yaw, Math.atan2(world.camera!.position.x - z.pos.x, world.camera!.position.z - z.pos.z), 1.5 * dt);
        }
        talk(z, s, pFloor, p, dt);
      } else if (z.mode === "leave") {
        // It doesn't climb the stairs. It thins out, drifting a little up
        // or down toward where it's going, until it's gone.
        const up = level(z.dest) > level(z.floor);
        z.pos.y += (up ? 0.25 : -0.25) * dt;
        if (z.presence <= 0.01) {
          z.floor = z.dest;
          const [wx, wz] = pickWaypoint(z.floor);
          z.pos.set(wx, HOVER + (up ? -0.4 : 0.4), wz);
          z.target = [wx, wz];
          z.mode = "arrive";
          z.floorTimer = rand(60, 110);
          z.since = 0;
        }
      } else {
        // gathers again on the other floor, settling as it does
        z.pos.y += (HOVER - z.pos.y) * Math.min(1, dt * 0.8);
        if (Math.abs(HOVER - z.pos.y) < 0.02) {
          z.mode = "drift";
          z.linger = rand(4, 9);
        }
      }
    }
    g.position.copy(z.pos);
    g.rotation.y = z.yaw + MODEL_ROT;
    animateHumanoid(parts, z.t, "ghost");

    // clearest from across the room; up close it is mostly air
    const p = world.player.pos;
    const near = THREE.MathUtils.smoothstep(Math.hypot(p.x - z.pos.x, p.z - z.pos.z), FADE_NEAR, FADE_FAR);
    const seen = presence.active && !z.you ? THREE.MathUtils.lerp(UNSEEN.opacity, SEEN.opacity, presence.watched) : 1;
    const opacity = THREE.MathUtils.lerp(OPACITY_REST, OPACITY_SPEAKING, Math.max(z.voice, z.touch * 0.6)) * z.presence * (0.2 + 0.8 * near) * seen;
    for (const m of clouds) {
      m.uniforms.uOpacity.value = opacity;
      (m.uniforms.uTint.value as THREE.Color).copy(TINT[z.floor]);
    }
    if (light.current) {
      // no glow of its own, only a faint warmth on the floor while it speaks
      light.current.intensity = z.voice * z.presence * 0.9;
      light.current.color.copy(TINT[z.floor]);
    }
  });

  return (
    <group ref={ref}>
      <primitive object={model} scale={KIT_SCALE} />
      <pointLight ref={light} position={[0, 1.0, 0]} intensity={0} distance={2.4} decay={2} />
    </group>
  );
}

/**
 * You, as the ghost figure: the guest's body as a cloud of points on its
 * skeleton, walking and running on its clips. Player moves world.ghost; this
 * only shows it. It takes the colour of the room like the spirit does.
 */
export function GhostFigure() {
  const body = useSkinnedCharacter("character-man", MAN_HEIGHT, undefined, FIGURE_POINTS);
  const clouds = useMemo(() => cloudsOf(body.root), [body]);
  const ref = useRef<THREE.Group>(null);

  useFrame((_, dtRaw) => {
    const g = ref.current!;
    g.visible = useGame.getState().role === "figure";
    if (!g.visible) return;
    const me = world.ghost;
    g.position.copy(me.pos).setY(HOVER);
    g.rotation.y = me.yaw;
    playClip(body, me.clip, Math.min(dtRaw, 0.05));
    const st = world.stir;
    const flare = st ? Math.max(0, 1 - (performance.now() - st.t) / 1000 / STIR_GLOW) : 0;
    for (const m of clouds) {
      m.uniforms.uOpacity.value = THREE.MathUtils.lerp(FIGURE.opacity, FIGURE.stirred, flare);
      (m.uniforms.uTint.value as THREE.Color).copy(TINT[floorAt(me.pos.x)]);
    }
  });

  return (
    <group ref={ref} visible={false}>
      <primitive object={body.root} />
    </group>
  );
}

type GhostState = {
  floor: FloorId;
  pos: THREE.Vector3;
  yaw: number;
  talkCd: number;
  farCd: number;
  voice: number;
  target: [number, number];
  /** waiting for Claude to find the words */
  thinking: boolean;
  presence: number;
};

function talk(z: GhostState, s: ReturnType<typeof useGame.getState>, pFloor: FloorId, p: THREE.Vector3, dt: number) {
  const together = pFloor === z.floor;
  z.talkCd -= dt;
  z.farCd -= dt;
  if (s.message || s.writing || s.whisper || z.thinking) return;
  // it can't talk from somewhere it isn't (examining something calls it back)
  if (z.presence < 0.3 && !memoryBus.pending) return;
  const dist = Math.hypot(p.x - z.pos.x, p.z - z.pos.z);

  // You examined something it remembers: it drifts over and answers sooner.
  if (memoryBus.pending && together) {
    const m = allMemories().find((x) => x.id === memoryBus.pending);
    memoryBus.pending = null;
    if (m?.spot) z.target = [m.spot[0], m.spot[1]];
    if (m && dist < EARSHOT * 1.8) {
      say(z, m, p);
      return;
    }
  }

  if (together && dist < EARSHOT && z.talkCd <= 0) {
    // what it remembers depends on where it is and where you are
    const m = pickMemory(z.floor, (z.pos.x + p.x) / 2, (z.pos.z + p.z) / 2);
    if (m) say(z, m, p);
  } else if (!together && z.farCd <= 0) {
    // through the floor: you only catch a few words, and only from the floor next to yours
    z.farCd = rand(25, 45);
    const below = level(z.floor) < level(pFloor);
    const m = Math.abs(level(z.floor) - level(pFloor)) === 1 ? pickMemory(z.floor, z.pos.x, z.pos.z) : null;
    if (m) s.whisperLines([`(${below ? "from below" : "from upstairs"}) ${speak(m, true)[0]}`]);
  }
}

function say(z: GhostState, m: Memory, p: THREE.Vector3) {
  // it turns to you and gathers itself while the words come
  z.thinking = true;
  z.voice = 0.6;
  z.yaw = Math.atan2(p.x - z.pos.x, p.z - z.pos.z);
  voiceLines(m, speak(m))
    .then((lines) => {
      z.thinking = false;
      const s = useGame.getState();
      // you took its place while it was finding the words
      if (s.phase !== "playing" || s.role !== "keeper") return;
      s.whisperLines(lines);
      whisper(lines.join(" ").length);
      recall(m.id); // telling it keeps it alive
      z.voice = 1;
      // chattier after dark
      z.talkCd = isLate() ? rand(9, 15) : rand(16, 26);
    });
}
