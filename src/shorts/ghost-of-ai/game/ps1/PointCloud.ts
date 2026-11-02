import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { RENDER_H } from "./PS1Material";

// Round, gaussian-soft point sprites (PointsMaterial only draws hard squares).
const pointVertex = /* glsl */ `
uniform float uSize;
uniform float uScale;
uniform float uTime;
uniform float uFlow;
uniform float uHaze;
varying vec3 vColor;
varying float vFade;
#include <fog_pars_vertex>
#ifdef SKINNED
// THREE.Points has no skinning of its own: the same sums SkinnedMesh does, on the skeleton's bone texture
uniform highp sampler2D uBones;
uniform mat4 uBind;
uniform mat4 uBindInverse;
attribute vec4 skinIndex;
attribute vec4 skinWeight;
mat4 bone(float i) {
  int size = textureSize(uBones, 0).x;
  int j = int(i) * 4;
  int x = j % size, y = j / size;
  return mat4(
    texelFetch(uBones, ivec2(x, y), 0),
    texelFetch(uBones, ivec2(x + 1, y), 0),
    texelFetch(uBones, ivec2(x + 2, y), 0),
    texelFetch(uBones, ivec2(x + 3, y), 0)
  );
}
#endif
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}
void main() {
  vColor = color;
  vec3 p = position;
  float sizeMul = 1.0;
  vFade = 1.0;
  if (uFlow > 0.0) {
    // Each point drifts on its own little orbit and breathes in size, so the
    // cloud reads as a living haze rather than a frozen scatter.
    float h0 = hash(position) * 6.2832;
    float h1 = hash(position.zxy + 1.7) * 6.2832;
    float h2 = hash(position.yzx + 4.1) * 6.2832;
    float t = uTime;
    p += uFlow * vec3(sin(t * 1.9 + h0), sin(t * 2.6 + h1) * 0.6 + sin(t * 0.7 + h2) * 0.4, cos(t * 2.2 + h2));
    sizeMul = 0.75 + 0.5 * (0.5 + 0.5 * sin(t * 3.1 + h1));
  }
  if (uHaze > 0.0) {
    // A scattered few points swell into wide dim blobs, the same light spread thinner.
    float h = hash(position.yxz + 9.1);
    float big = 1.0 + uHaze * h * h * h;
    sizeMul *= big;
    vFade = 1.0 / big;
  }
  #ifdef SKINNED
  mat4 skin = skinWeight.x * bone(skinIndex.x) + skinWeight.y * bone(skinIndex.y) + skinWeight.z * bone(skinIndex.z) + skinWeight.w * bone(skinIndex.w);
  p = (uBindInverse * skin * uBind * vec4(p, 1.0)).xyz;
  #endif
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * sizeMul * uScale / -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;
const pointFragment = /* glsl */ `
uniform float uOpacity;
uniform vec3 uTint;
uniform float uSoft;
varying vec3 vColor;
varying float vFade;
#include <fog_pars_fragment>
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0; // 0 at the centre, 1 at the sprite edge
  // gaussian core with a feathered rim: a blurred dot rather than a disc
  float a = exp(-r * r * uSoft) * (1.0 - smoothstep(0.75, 1.0, r));
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * uTint, a * uOpacity * vFade);
  #include <fog_fragment>
  #include <colorspace_fragment>
}
`;

export function softPointMaterial(size: number, opacity: number, soft: number, flow: number, additive: boolean) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uSize: { value: size },
        // three's own attenuation: half the drawing-buffer height in pixels
        uScale: { value: RENDER_H / 2 },
        uOpacity: { value: opacity },
        // multiplies the sampled colours; callers can retint the cloud live
        uTint: { value: new THREE.Color(1, 1, 1) },
        uSoft: { value: soft },
        uTime: { value: 0 },
        uFlow: { value: flow },
        uHaze: { value: 0 },
      },
    ]),
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    fog: true,
  });
}

/**
 * Turns every mesh under `root` into a cloud of coloured points sampled
 * across its surface. The points are added as children of the original
 * meshes, so a rigid-part hierarchy (torso → head / arms) keeps animating.
 */
export type PointCloudOptions = {
  /** Total points over the whole model, split between parts by surface area. */
  count: number;
  /** Point size in world units (perspective-attenuated). */
  size?: number;
  /**
   * Keep the original mesh underneath, painted black, so points on the far
   * side of the body are hidden and the cloud reads as a solid form.
   */
  occluder?: boolean;
  opacity?: number;
  /** Multiplier on the sampled colours. */
  brightness?: number;
  /** Gaussian falloff: lower is blurrier (1–3 soft, 6+ crisp). Default 2.5. */
  soft?: number;
  /**
   * 0..1: pull each part's points from the boxy mesh surface toward an
   * ellipsoid of the same extents, so the cloud reads as rounded. The black
   * occluder is shrunk to sit inside the rounded form.
   */
  curve?: number;
  /** Drift amplitude (model units) for the live, shimmering point motion. */
  flow?: number;
  /** Additive blending: overlapping points pile up to white like a light source. */
  additive?: boolean;
  /** How far the largest points swell (a multiple of size), trading brightness for spread. */
  haze?: number;
  /** Speed of the drift: 1 shimmers, lower hangs in the air. */
  pace?: number;
  /** Ignore the model's colours and start every point white, so the cloud is all uTint (dark clothes add no light). */
  flat?: boolean;
};

type Texels = { data: Uint8ClampedArray; w: number; h: number };
const texelCache = new WeakMap<THREE.Texture, Texels | null>();

/** Reads a texture's pixels once so points can pick up its colour at their UV. */
function texels(tex: THREE.Texture): Texels | null {
  const cached = texelCache.get(tex);
  if (cached !== undefined) return cached;
  let out: Texels | null = null;
  const img = tex.image as (HTMLImageElement | ImageBitmap | undefined) & { width?: number };
  if (img && img.width) {
    const w = img.width;
    const h = img.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img as CanvasImageSource, 0, 0);
      out = { data: ctx.getImageData(0, 0, w, h).data, w, h };
    }
  }
  texelCache.set(tex, out);
  return out;
}

const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();

function surfaceArea(geom: THREE.BufferGeometry) {
  const pos = geom.getAttribute("position");
  const idx = geom.getIndex();
  const n = idx ? idx.count : pos.count;
  let area = 0;
  for (let i = 0; i < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i;
    const i1 = idx ? idx.getX(i + 1) : i + 1;
    const i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    area += b.sub(a).cross(c.sub(a)).length() * 0.5;
  }
  return area;
}

const pos = new THREE.Vector3();
const col = new THREE.Color();
const uv = new THREE.Vector2();
const bbox = new THREE.Box3();
const center = new THREE.Vector3();
const half = new THREE.Vector3();
const dir = new THREE.Vector3();
const clock = new THREE.Clock();

/** Move `p` toward the ellipsoid inscribed in the box (center, half extents). */
function roundToward(p: THREE.Vector3, amount: number) {
  dir.copy(p).sub(center);
  const len = dir.length();
  if (len < 1e-6) return;
  dir.divideScalar(len);
  // radius of the ellipsoid along this direction
  const k = (dir.x / Math.max(half.x, 1e-4)) ** 2 + (dir.y / Math.max(half.y, 1e-4)) ** 2 + (dir.z / Math.max(half.z, 1e-4)) ** 2;
  const r = 1 / Math.sqrt(k);
  p.copy(center).addScaledVector(dir, THREE.MathUtils.lerp(len, r, amount));
}

/** Gives point k the skin of the vertex nearest it, so it follows the same bones (bind pose). */
function copySkin(geom: THREE.BufferGeometry, p: THREE.Vector3, k: number, index: Float32Array, weight: Float32Array) {
  const verts = geom.getAttribute("position");
  let best = 0;
  let bestD = Infinity;
  for (let v = 0; v < verts.count; v++) {
    const d = a.fromBufferAttribute(verts, v).distanceToSquared(p);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  const si = geom.getAttribute("skinIndex");
  const sw = geom.getAttribute("skinWeight");
  for (let c = 0; c < 4; c++) {
    index[k * 4 + c] = si.getComponent(best, c);
    weight[k * 4 + c] = sw.getComponent(best, c);
  }
}

export function toPointCloud(root: THREE.Object3D, o: PointCloudOptions) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
  });
  const areas = meshes.map((m) => surfaceArea(m.geometry));
  const total = areas.reduce((s, v) => s + v, 0) || 1;
  const size = o.size ?? 0.09;
  const opacity = o.opacity ?? 1;
  const bright = o.brightness ?? 1;
  const soft = o.soft ?? 2.5;
  const curve = o.curve ?? 0;
  const flow = o.flow ?? 0;

  meshes.forEach((mesh, i) => {
    const n = Math.max(8, Math.round((areas[i] / total) * o.count));
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshLambertMaterial;
    const tex = mat.map ? texels(mat.map) : null;
    const hasVertexColor = !!mesh.geometry.getAttribute("color");
    const sampler = new MeshSurfaceSampler(mesh).build();
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? (mesh as THREE.SkinnedMesh) : null;
    const skinIndex = new Float32Array(skinned ? n * 4 : 0);
    const skinWeight = new Float32Array(skinned ? n * 4 : 0);
    if (curve > 0) {
      mesh.geometry.computeBoundingBox();
      bbox.copy(mesh.geometry.boundingBox!);
      bbox.getCenter(center);
      bbox.getSize(half).multiplyScalar(0.5);
      // a rounded form bulges past the box's flat faces; let it
      half.multiplyScalar(1 + 0.12 * curve);
    }
    for (let k = 0; k < n; k++) {
      sampler.sample(pos, undefined, hasVertexColor ? col : undefined, uv);
      if (curve > 0) roundToward(pos, curve);
      positions[k * 3] = pos.x;
      positions[k * 3 + 1] = pos.y;
      positions[k * 3 + 2] = pos.z;
      if (skinned) copySkin(mesh.geometry, pos, k, skinIndex, skinWeight);
      if (o.flat) {
        colors.fill(bright, k * 3, k * 3 + 3);
        continue;
      }
      if (tex) {
        // glTF textures are not flipped: v = 0 is the top row.
        const x = Math.min(tex.w - 1, Math.floor(THREE.MathUtils.euclideanModulo(uv.x, 1) * tex.w));
        const y = Math.min(tex.h - 1, Math.floor(THREE.MathUtils.euclideanModulo(uv.y, 1) * tex.h));
        const p = (y * tex.w + x) * 4;
        col.setRGB(tex.data[p] / 255, tex.data[p + 1] / 255, tex.data[p + 2] / 255, THREE.SRGBColorSpace);
      } else if (!hasVertexColor) {
        col.setRGB(1, 1, 1);
      }
      colors[k * 3] = (col.r * mat.color.r + mat.emissive.r) * bright;
      colors[k * 3 + 1] = (col.g * mat.color.g + mat.emissive.g) * bright;
      colors[k * 3 + 2] = (col.b * mat.color.b + mat.emissive.b) * bright;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = softPointMaterial(size, opacity, soft, flow, !!o.additive);
    material.uniforms.uHaze.value = o.haze ?? 0;
    if (skinned) {
      geom.setAttribute("skinIndex", new THREE.BufferAttribute(skinIndex, 4));
      geom.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeight, 4));
      skinned.skeleton.computeBoneTexture();
      material.defines = { SKINNED: 1 };
      material.uniforms.uBones = { value: skinned.skeleton.boneTexture };
      material.uniforms.uBind = { value: skinned.bindMatrix };
      material.uniforms.uBindInverse = { value: skinned.bindMatrixInverse };
    }
    const points = new THREE.Points(geom, material);
    points.name = `${mesh.name}-points`;
    points.frustumCulled = false;
    if (flow > 0 || skinned) {
      points.onBeforeRender = () => {
        material.uniforms.uTime.value = clock.getElapsedTime() * (o.pace ?? 1);
        skinned?.skeleton.update();
      };
    }
    mesh.add(points);

    if (o.occluder) {
      if (curve > 0) {
        // Shrink the occluder about its centre so it hides the far side of
        // the rounded cloud without poking through its softened corners.
        const g = mesh.geometry.clone();
        const k = 1 - 0.3 * curve;
        g.translate(-center.x, -center.y, -center.z);
        g.scale(k, k, k);
        g.translate(center.x, center.y, center.z);
        mesh.geometry = g;
      }
      mesh.material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        polygonOffset: true,
        polygonOffsetFactor: 2,
        polygonOffsetUnits: 4,
      });
    } else {
      // Hide the surface but keep the node (and its children) rendering.
      mesh.material = new THREE.MeshBasicMaterial({ visible: false });
    }
  });
}
