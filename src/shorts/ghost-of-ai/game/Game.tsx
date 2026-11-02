import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { House } from "./House";
import { Player } from "./Player";
import { Ghost, GhostFigure } from "./Ghost";
import { Storm } from "./Storm";
import { CameraDirector } from "./CameraDirector";
import { HandMotes } from "./HandMotes";
import { Fragments } from "./Fragments";
import { UI } from "./UI";
import { bindInput, input } from "./input";
import { PS1Effect } from "./ps1/PS1Effect";
import { RENDER_W } from "./ps1/PS1Material";
import { DEFAULT_FOG } from "./level";
import { world } from "./world";
import { useGame } from "./store";
import { strike } from "./weather";
import { presence } from "./presence";
import { guestState } from "./guest";
import { reach } from "./reach";
import { story } from "./story";

const BG = 0x050407;

/** Mounted last, so every controller sees this frame's key presses before they're cleared. */
function InputEnd() {
  useFrame(() => input.endFrame());
  return null;
}

function Scene() {
  return (
    <>
      <ambientLight color="#a89a98" intensity={4.2} />
      <hemisphereLight color="#5a5678" groundColor="#4a3628" intensity={2.2} />
      <House />
      <Player />
      <Ghost />
      <GhostFigure />
      <Storm />
      <HandMotes />
      <Fragments />
      <CameraDirector />
      <InputEnd />
    </>
  );
}

export default function Game() {
  const frame = useRef<HTMLDivElement>(null);
  const [dpr, setDpr] = useState(0.4);
  const effect = useMemo(() => new PS1Effect(), []);

  useEffect(() => {
    bindInput();
    // debug hooks for the console: __game.world.player.pos.set(x,0,z), __game.strike(), __game.presence, __game.guest, __game.reach, __game.story
    (window as unknown as { __game: unknown }).__game = { world, useGame, strike, presence, guest: guestState, reach, story };
    const el = frame.current!;
    const ro = new ResizeObserver(() => setDpr(RENDER_W / Math.max(1, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="game-root">
      <div className="game-frame" ref={frame}>
        <Canvas
          dpr={dpr}
          flat
          gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
          camera={{ fov: 50, near: 0.3, far: 40, position: [5.5, 2.75, 0.45] }}
          onCreated={({ scene, gl, camera }) => {
            world.camera = camera;
            // debug hook: __game.scene for inspecting the graph from the console
            Object.assign((window as unknown as { __game: object }).__game ?? {}, { scene });
            scene.background = new THREE.Color(BG);
            scene.fog = new THREE.Fog(BG, DEFAULT_FOG.near, DEFAULT_FOG.far); // per shot: CameraDirector
            gl.setClearColor(BG);
          }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
          <EffectComposer multisampling={0}>
            {/* neon glow on the self-lit keeper, candles, the screen and the ghost; the palette then quantises it */}
            <Bloom mipmapBlur luminanceThreshold={0.45} luminanceSmoothing={0.2} intensity={1.3} radius={0.6} levels={5} />
            <primitive object={effect} />
          </EffectComposer>
        </Canvas>
        <UI />
      </div>
    </div>
  );
}
