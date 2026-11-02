import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSkinnedCharacter, dressCharacter, playClip, MAN_HEIGHT } from "./Model";
import { input } from "./input";
import { world, moveWithCollision, forwardOf, type Clip } from "./world";
import { useGame } from "./store";
import { findNearby, interact, promptFor, stairsNearby, useDoor } from "./interactions";
import { footstep, whisper } from "./audio";
import { guestBody, openStory, poseGuest, resetGuest, stepGuest, wakeGuest } from "./guest";
import { story } from "./story";
import { FLOOR_BOUNDS, floorAt } from "./level";

/** The keeper's neon: a red tube outline around the body that the bloom pass makes glow. */
const NEON = { color: "#ff5a40", thickness: 0.018 };
/** All black, long sleeves. Not pure black: the post effect would crush it into the floor. */
const CLOTH = "#1b1a1d";

const WALK = 1.7;
const RUN = 3.6;
const BACK = 1.1;
const TURN = 2.7; // classic: yaw rate while turning in place
/** The ghost camera: metres/s, radians/s on the keys, radians per pixel dragged, and how far it looks up or down. */
const FLOAT = { speed: 1.6, run: 3.2, turn: 1.8, drag: 0.004, tilt: 1.2 };
/** Seconds between stirs of the lamps. */
const STIR_EVERY = 1.2;
/** Seconds of the two films before you can wake it again. */
const WAKE_AFTER = 40;
/** How far it flattens going into the film: the body's depth at the very end. */
const FLAT = 0.03;

const camDir = new THREE.Vector3();
const ndc = new THREE.Vector3();

/** Fixed cameras can lose the player: record where they went so the UI can point there. */
function trackOffscreen(pos: THREE.Vector3) {
  const cam = world.camera;
  if (!cam) return;
  ndc.set(pos.x, 0.9, pos.z).project(cam);
  const behind = ndc.z > 1;
  if (!behind && Math.abs(ndc.x) < 0.97 && Math.abs(ndc.y) < 0.97) {
    world.offscreen = null;
    return;
  }
  // behind the camera the projection mirrors: flip it back
  world.offscreen = behind ? { x: -ndc.x, y: -ndc.y } : { x: ndc.x, y: ndc.y };
}

const gait = (speed: number): Clip => (speed === 0 ? "idle" : speed > WALK ? "run" : "walk");

/** You leave the keeper's body a step behind it (or beside it, against a wall), and it walks on without you. */
function stepOut() {
  const p = world.player;
  const me = world.ghost;
  me.yaw = p.yaw;
  me.pitch = 0;
  for (const turn of [Math.PI, Math.PI / 2, -Math.PI / 2, 0]) {
    me.pos.copy(p.pos);
    const f = forwardOf(p.yaw + turn);
    for (let i = 0; i < 6; i++) moveWithCollision(me.pos, f.x * 0.2, f.z * 0.2);
    if (me.pos.distanceTo(p.pos) > 0.9) break;
  }
}

/** The ghost camera: through walls and furniture, but it stays in the building. */
function float(dt: number) {
  const me = world.ghost;
  if (input.justPressed("quickturn")) me.yaw += Math.PI;
  me.yaw += ((input.down("left") ? 1 : 0) - (input.down("right") ? 1 : 0)) * FLOAT.turn * dt - input.look.x * FLOAT.drag;
  me.pitch = THREE.MathUtils.clamp(me.pitch - input.look.y * FLOAT.drag, -FLOAT.tilt, FLOAT.tilt);
  const f = forwardOf(me.yaw);
  const step = ((input.down("forward") ? 1 : 0) - (input.down("back") ? 1 : 0)) * (input.down("run") ? FLOAT.run : FLOAT.speed) * dt;
  const b = FLOOR_BOUNDS[floorAt(me.pos.x)];
  me.pos.x = THREE.MathUtils.clamp(me.pos.x + f.x * step, b.x1 + 0.2, b.x2 - 0.2);
  me.pos.z = THREE.MathUtils.clamp(me.pos.z + f.z * step, b.z1 + 0.2, b.z2 - 0.2);
}

export function Player() {
  // a low-poly rigged human (Quaternius "Man", CC0) with a neon-red outline
  const keeper = useSkinnedCharacter("character-man", MAN_HEIGHT, NEON);
  useMemo(() => dressCharacter(keeper.root, CLOTH), [keeper]);
  const group = useRef<THREE.Group>(null);
  const neon = useRef<THREE.PointLight>(null);
  const t = useRef({ anim: 0, quick: 0, stepPhase: 0, stirCd: 0, begun: false });
  // Modern controls: the camera basis is latched while a direction is held so
  // a camera cut mid-walk doesn't flip the keeper around (RE remaster style).
  const latch = useRef<{ fx: number; fz: number; rx: number; rz: number } | null>(null);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = useGame.getState();
    const p = world.player;
    const g = group.current!;

    // you begin outside it, a step behind it, with the story still to give it
    if (s.phase === "playing" && !t.current.begun) {
      t.current.begun = true;
      stepOut();
      world.locked = true;
      setTimeout(openStory, 900);
    }

    let mode: Clip = "idle";
    const busy = s.phase !== "playing" || world.locked || !!s.message || s.writing || s.implanting;

    if (input.justPressed("scheme")) s.toggleControls();
    if (input.justPressed("memories")) s.toggleMemories();
    if (input.justPressed("role") && s.phase === "playing" && !world.locked) {
      s.nextRole();
      if (s.role === "keeper") stepOut();
      // it went into the film: there's no body to walk unless it wakes again
      if (useGame.getState().role === "keeper" && story.gone > 0) wakeGuest();
      // from figure to camera the guest just carries on: nobody swapped places with it
      if (useGame.getState().role !== "camera") resetGuest();
      latch.current = null;
    }
    const role = useGame.getState().role;
    const ghostly = role !== "keeper";

    // a footstep each time the stride comes round
    const stride = (m: "walk" | "run", heard = true) => {
      t.current.anim += dt;
      const phase = Math.sin(t.current.anim * (m === "run" ? 11 : 7.5));
      if (heard && phase > 0 !== t.current.stepPhase > 0) footstep();
      t.current.stepPhase = phase;
    };

    // the keeper's controls, for whichever of you is walking: returns the speed
    const steer = (me: { pos: THREE.Vector3; yaw: number }) => {
      const modern = s.controls === "modern";
      let speed = 0;

      // quick 180° turn (RE3 style)
      if (t.current.quick > 0) {
        const step = Math.min(t.current.quick, dt * 12);
        me.yaw += step;
        t.current.quick -= step;
      } else if (input.justPressed("quickturn") || (!modern && input.down("run") && input.justPressed("back"))) {
        t.current.quick = Math.PI;
      } else if (modern) {
        // Camera-relative: push a direction on screen and the keeper walks
        // that way immediately, snapping to face it (no turn-in-place).
        const ix = input.stick.x || (input.down("right") ? 1 : 0) - (input.down("left") ? 1 : 0);
        const iy = input.stick.y || (input.down("forward") ? 1 : 0) - (input.down("back") ? 1 : 0);
        if (ix === 0 && iy === 0) {
          latch.current = null;
        } else {
          if (!latch.current && world.camera) {
            world.camera.getWorldDirection(camDir);
            camDir.y = 0;
            camDir.normalize();
            latch.current = { fx: camDir.x, fz: camDir.z, rx: -camDir.z, rz: camDir.x };
          }
          const L = latch.current;
          if (L) {
            me.yaw = Math.atan2(L.rx * ix + L.fx * iy, L.rz * ix + L.fz * iy);
            speed = input.down("run") ? RUN : WALK;
          }
        }
      } else {
        latch.current = null;
        if (input.down("left")) me.yaw += TURN * dt;
        if (input.down("right")) me.yaw -= TURN * dt;
        if (input.down("forward")) speed = input.down("run") ? RUN : WALK;
        else if (input.down("back")) speed = -BACK;
      }

      if (speed !== 0) {
        const f = forwardOf(me.yaw);
        moveWithCollision(me.pos, f.x * speed * dt, f.z * speed * dt);
      }
      return speed;
    };

    let yours: Clip = "idle";

    if (s.message) {
      if (input.justPressed("interact")) s.advanceMessage();
    } else if (!busy && ghostly) {
      // the guest walks by itself, and you only hear it from its floor
      const speed = stepGuest(dt);
      if (speed > 0) {
        mode = gait(speed);
        stride(mode as "walk" | "run", floorAt(p.pos.x) === floorAt(world.ghost.pos.x));
      }
      // held off the floor, its legs go on running
      if (guestBody.flail) mode = "run";
      p.moving = speed > 0;
      p.running = mode === "run";

      // the figure walks like the guest, walls and all, but makes no sound; the camera goes through
      if (role === "figure") yours = gait(steer(world.ghost));
      else float(dt);
      const stairs = stairsNearby();
      const over = story.act === "reel" && story.since > WAKE_AFTER;
      s.setPrompt(stairs?.label ?? (over ? "▶ WAKE IT AGAIN" : null));
      t.current.stirCd -= dt;
      if (input.justPressed("interact")) {
        if (stairs) useDoor(stairs);
        else if (over) openStory(true);
        else if (t.current.stirCd <= 0) {
          t.current.stirCd = STIR_EVERY;
          world.stir = { x: world.ghost.pos.x, z: world.ghost.pos.z, t: performance.now() };
          whisper(14);
        }
      }
    } else if (!busy) {
      const speed = steer(p);
      mode = gait(speed);
      if (mode !== "idle") stride(mode);
      p.moving = speed !== 0;
      p.running = mode === "run";

      const near = findNearby();
      s.setPrompt(promptFor(near));
      if (near && input.justPressed("interact")) {
        s.setPrompt(null);
        interact(near);
      }
    }
    g.position.copy(p.pos);
    g.rotation.y = p.yaw;
    // going into the film: it thins to a sheet of itself, and the frames start to drop
    g.scale.z = 1 - story.gone * (1 - FLAT);
    keeper.root.visible = story.gone < 1 && Math.random() > story.gone * story.gone;
    if (neon.current) neon.current.intensity = 5 * (1 - story.gone);
    world.ghost.clip = yours;
    playClip(keeper, mode, dt);
    poseGuest(keeper.root, dt);
    // the arrow points to you, and as the camera you can't lose yourself
    if (role === "camera") world.offscreen = null;
    else trackOffscreen(ghostly ? world.ghost.pos : p.pos);
  });

  return (
    <group ref={group}>
      <primitive object={keeper.root} />
      {/* neon spill onto the nearby floor and walls; short-ranged so the rooms stay dim */}
      <pointLight ref={neon} position={[0, 1.0, 0]} color={NEON.color} intensity={5} distance={4.5} decay={2} />
    </group>
  );
}
