import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { interactables } from "./level";
import { softPointMaterial } from "./ps1/PointCloud";
import { useGame } from "./store";
import { FRAGMENTS, story } from "./story";

/** The case in the keeper's neon, what's really its own in the cold of the street. */
const TINT = { case: new THREE.Color("#ff7058"), own: new THREE.Color("#a8c4ff") };
const HEIGHT = 1.25;
const BLACK = new THREE.Color(0, 0, 0);

/** What the guest has lost, where it lost it. Only you can see these: they're how you know where to lead it. */
export function Fragments() {
  const { points, items } = useMemo(() => {
    const items = interactables.filter((it) => FRAGMENTS[it.id]);
    const position = new Float32Array(items.flatMap((it) => [it.pos[0], HEIGHT, it.pos[1]]));
    const color = new Float32Array(items.length * 3);
    items.forEach((it, i) => TINT[FRAGMENTS[it.id].kind].toArray(color, i * 3));
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(color, 3));
    const points = new THREE.Points(geom, softPointMaterial(0.24, 0.7, 1.6, 0.05, true));
    points.frustumCulled = false;
    return { points, items };
  }, []);
  const taken = useRef(0);

  useFrame(({ clock }) => {
    points.visible = useGame.getState().role !== "keeper";
    const mat = points.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uOpacity.value = 0.55 + Math.sin(clock.elapsedTime * 1.3) * 0.15;
    if (story.found.length === taken.current) return;
    taken.current = story.found.length;
    // additive: a fragment it has found goes black, which is to say out
    const color = points.geometry.getAttribute("color") as THREE.BufferAttribute;
    items.forEach((it, i) => {
      const c = story.found.includes(it.id) ? BLACK : TINT[FRAGMENTS[it.id].kind];
      color.setXYZ(i, c.r, c.g, c.b);
    });
    color.needsUpdate = true;
  });

  return <primitive object={points} />;
}
