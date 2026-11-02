import * as THREE from "three";

/** Internal render resolution (PS1 was 320x240 in most games). */
export const RENDER_W = 320;
export const RENDER_H = 240;

/** Vertex snap grid. Smaller = more wobble. */
const SNAP = new THREE.Vector2(RENDER_W / 2, RENDER_H / 2);

/**
 * Patches a material's shaders with the two signature PS1 artefacts:
 *  1. vertex snapping (positions quantised in NDC → wobbly geometry)
 *  2. affine texture mapping (no perspective correction → warping textures)
 */
export function patchPS1(mat: THREE.Material) {
  if ((mat as any).userData.ps1) return mat;
  mat.userData.ps1 = true;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = { value: SNAP };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec2 uSnap;
        varying vec3 vPs1Uv;`
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        {
          vec3 ndc = gl_Position.xyz / gl_Position.w;
          ndc.xy = floor(ndc.xy * uSnap) / uSnap;
          gl_Position.xyz = ndc * gl_Position.w;
        }
        #ifdef USE_MAP
          vPs1Uv = vec3(vMapUv * gl_Position.w, gl_Position.w);
        #else
          vPs1Uv = vec3(0.0, 0.0, 1.0);
        #endif`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vPs1Uv;`
      )
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec2 ps1uv = vPs1Uv.xy / vPs1Uv.z;
          vec4 sampledDiffuseColor = texture2D( map, ps1uv );
          diffuseColor *= sampledDiffuseColor;
        #endif`
      );
  };
  mat.customProgramCacheKey = () => "ps1-" + mat.type;
  return mat;
}

export function makePS1Material(opts: THREE.MeshLambertMaterialParameters = {}) {
  const mat = new THREE.MeshLambertMaterial({ flatShading: true, ...opts });
  if (mat.map) crunchTexture(mat.map);
  return patchPS1(mat) as THREE.MeshLambertMaterial;
}

export function crunchTexture(tex: THREE.Texture) {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 1;
  // a texture still loading picks these up when its image arrives
  if (tex.image) tex.needsUpdate = true;
}

const converted = new WeakMap<THREE.Material, THREE.Material>();

/** Converts every material under `root` to a PS1-patched Lambert. Idempotent. */
export function applyPS1(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const out = mats.map((src) => {
      let m = converted.get(src);
      if (!m) {
        const s = src as THREE.MeshStandardMaterial;
        if (s.map) crunchTexture(s.map);
        m = new THREE.MeshLambertMaterial({
          map: s.map ?? null,
          color: s.color ?? new THREE.Color(0xffffff),
          emissive: s.emissive ?? new THREE.Color(0),
          emissiveIntensity: s.emissive ? 1 : 0,
          transparent: s.transparent,
          opacity: s.opacity,
          side: s.side,
          vertexColors: s.vertexColors,
          flatShading: true,
          depthWrite: !s.transparent,
        });
        m.name = src.name;
        patchPS1(m);
        converted.set(src, m);
      }
      return m;
    });
    mesh.material = Array.isArray(mesh.material) ? out : out[0];
  });
  return root;
}
