import * as THREE from "three";
import type { FaceLandmarker, HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { useGame } from "./store";
import { PoseFilter, Rhythm, readPose, type Pose } from "./gesture";

/**
 * The visitor, seen through the webcam (K). MediaPipe finds a face and up to
 * one hand; everything is smoothed into a few numbers the camera, the ghost
 * and the hand motes read each frame. Nothing leaves the browser: the frames
 * go straight from the video element to the in-page models.
 *
 * Coordinates are mirrored (as in a mirror) and normalised to -1..1, y up.
 */
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** Eyes count as shut above this blink blendshape. */
const BLINK = 0.45;
/** Back and forth across this share of the frame, three times in 1.6 s, is a wave. */
const WAVE = { size: 0.1, turns: 3, span: 1.6 };
/** The index finger curling and uncurling three times in 2.2 s, the hand otherwise still, is a beckon. */
const BECKON = { size: 0.3, turns: 3, span: 2.2, stillness: 0.7 };

export const presence = {
  active: false,
  video: null as HTMLVideoElement | null,
  face: {
    seen: false,
    /** head position in the frame */
    x: 0,
    y: 0,
    /** how close to the screen: face width as a share of the frame (~0.15 sitting back, 0.35+ leaning in) */
    size: 0.2,
    /** 0..1 */
    blink: 0,
    /** 0..1, jaw open: talking, or a breath */
    mouth: 0,
  },
  /** 0..1: someone is looking at the screen with their eyes open. Smoothed. */
  watched: 0,
  hand: {
    seen: false,
    /** 21 landmarks, mirrored, -1..1, y up; z is MediaPipe's relative depth */
    points: Array.from({ length: 21 }, () => new THREE.Vector3()),
    /** palm size in the frame: bigger when the hand comes toward the screen */
    size: 0.15,
    /** how fast the hand is moving, in frame-widths per second, smoothed */
    speed: 0,
    /** the palm's velocity across the screen, -1..1 per second, y up */
    vel: new THREE.Vector2(),
    /** where the hand reaches into the house; written by HandMotes, which knows the camera */
    world: new THREE.Vector3(),
    /** the shape it's making, held steady across frames */
    pose: "none" as Pose,
    /** waving side to side */
    wave: false,
    /** curling its fingers: come here */
    beckon: false,
  },
  /** raw landmarks for the debug preview */
  raw: { face: null as NormalizedLandmark[] | null, hand: null as NormalizedLandmark[] | null },
};

let face: FaceLandmarker | null = null;
let hands: HandLandmarker | null = null;
let stream: MediaStream | null = null;
let raf = 0;
let lastVideoTime = -1;
let lastTick = 0;
const prevPalm = new THREE.Vector2();
const poses = new PoseFilter();
const wave = new Rhythm(WAVE.size, WAVE.turns, WAVE.span);
const beckon = new Rhythm(BECKON.size, BECKON.turns, BECKON.span);

async function loadModels() {
  if (face && hands) return;
  const { FilesetResolver, FaceLandmarker, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM);
  const make = async (delegate: "GPU" | "CPU") => {
    face ??= await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
    });
    hands ??= await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate },
      runningMode: "VIDEO",
      numHands: 1,
    });
  };
  try {
    await make("GPU");
  } catch {
    await make("CPU");
  }
}

export async function startWebcam() {
  const g = useGame.getState();
  if (presence.active || g.webcam === "starting") return;
  g.setWebcam("starting");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
  } catch {
    g.setWebcam("denied");
    return;
  }
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await loadModels();
    presence.video = video;
    presence.active = true;
    lastVideoTime = -1;
    lastTick = performance.now();
    g.setWebcam("on");
    raf = requestAnimationFrame(loop);
  } catch (e) {
    console.error("webcam presence:", e);
    stopWebcam();
    g.setWebcam("error");
  }
}

export function stopWebcam() {
  cancelAnimationFrame(raf);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  presence.active = false;
  presence.video = null;
  presence.face.seen = false;
  presence.hand.seen = false;
  presence.hand.pose = "none";
  presence.hand.wave = presence.hand.beckon = false;
  presence.raw.face = presence.raw.hand = null;
  presence.watched = 0;
  useGame.getState().setWebcam("off");
}

export const toggleWebcam = () => (presence.active || useGame.getState().webcam === "starting" ? stopWebcam() : startWebcam());

const ease = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

function loop() {
  raf = requestAnimationFrame(loop);
  const video = presence.video;
  if (!video || !face || !hands || video.readyState < 2 || video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastTick) / 1000);
  lastTick = now;

  const fr = face.detectForVideo(video, now);
  const f = presence.face;
  const lm = fr.faceLandmarks[0];
  presence.raw.face = lm ?? null;
  f.seen = !!lm;
  if (lm) {
    // nose tip for position, cheek to cheek for size
    const nose = lm[1];
    f.x = ease(f.x, -(nose.x * 2 - 1), 10, dt);
    f.y = ease(f.y, -(nose.y * 2 - 1), 10, dt);
    f.size = ease(f.size, Math.abs(lm[454].x - lm[234].x), 6, dt);
    const shapes = fr.faceBlendshapes[0]?.categories ?? [];
    const score = (n: string) => shapes.find((c) => c.categoryName === n)?.score ?? 0;
    // blinks are quick: follow them fast so the ghost can use them
    f.blink = ease(f.blink, (score("eyeBlinkLeft") + score("eyeBlinkRight")) / 2, 30, dt);
    f.mouth = ease(f.mouth, score("jawOpen"), 12, dt);
  }
  const looking = f.seen && f.blink < BLINK ? 1 : 0;
  // it notices you look away a beat later than you do, and you back sooner
  presence.watched = ease(presence.watched, looking, looking ? 8 : 3, dt);

  const hr = hands.detectForVideo(video, now);
  const h = presence.hand;
  const hl = hr.landmarks[0];
  presence.raw.hand = hl ?? null;
  h.seen = !!hl;
  if (hl) {
    hl.forEach((p, i) => {
      const v = h.points[i];
      v.set(ease(v.x, -(p.x * 2 - 1), 18, dt), ease(v.y, -(p.y * 2 - 1), 18, dt), p.z);
    });
    // wrist to the middle knuckle
    h.size = ease(h.size, Math.hypot(hl[0].x - hl[9].x, hl[0].y - hl[9].y), 8, dt);
    const px = hl[9].x, py = hl[9].y;
    const v = prevPalm.x || prevPalm.y ? Math.hypot(px - prevPalm.x, py - prevPalm.y) / Math.max(dt, 1e-3) : 0;
    h.speed = ease(h.speed, v, 6, dt);
    if (prevPalm.x || prevPalm.y) {
      h.vel.x = ease(h.vel.x, (-(px - prevPalm.x) * 2) / Math.max(dt, 1e-3), 8, dt);
      h.vel.y = ease(h.vel.y, (-(py - prevPalm.y) * 2) / Math.max(dt, 1e-3), 8, dt);
    }
    prevPalm.set(px, py);
    const { pose, index } = readPose(hr.worldLandmarks[0] ?? hl);
    h.pose = poses.feed(pose, dt);
    h.wave = wave.feed(px, dt) && h.pose !== "fist" && h.pose !== "pinch";
    h.beckon = beckon.feed(index, dt) && h.speed < BECKON.stillness;
  } else {
    prevPalm.set(0, 0);
    h.speed = ease(h.speed, 0, 6, dt);
    h.pose = poses.feed("none", dt);
    wave.clear();
    beckon.clear();
    h.wave = h.beckon = false;
  }
}
