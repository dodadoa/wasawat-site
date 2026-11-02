import { Effect, BlendFunction } from "postprocessing";
import { Uniform } from "three";

// PS1-style colour crunch: each RGB channel is quantised to a few levels (like
// the console's 15-bit colour), with a gentle S-curve for contrast, a little
// extra saturation, ordered dither and light grain between the steps.
const fragment = /* glsl */ `
uniform float uTime;
uniform float uGrain;
uniform float uGain;
uniform float uContrast;
uniform float uSaturation;
uniform float uLevels;

float bayer(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int idx = i.x + i.y * 4;
  const int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return float(m[idx]) / 16.0;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = floor(uv * resolution);
  vec3 c = inputColor.rgb * uGain;
  // vignette
  float v = smoothstep(1.05, 0.3, length((uv - 0.5) * vec2(1.0, 1.15)));
  c *= mix(0.8, 1.0, v);
  c = clamp(c, 0.0, 1.0);
  // contrast: blend towards a smoothstep S-curve (deeper blacks, brighter lights)
  c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);
  // saturation
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = clamp(mix(vec3(lum), c, uSaturation), 0.0, 1.0);
  // dither: a fine ordered (Bayer) pattern plus a little animated grain.
  // Both fade out in the blacks so unlit walls stay solid instead of speckled.
  float frame = floor(uTime * 24.0);
  float n = hash(px + frame * 13.37);
  float lit = smoothstep(0.0, 0.15, lum);
  float d = ((bayer(px) - 0.5) / uLevels + (n - 0.5) * uGrain) * mix(0.15, 1.0, lit);
  vec3 q = floor(clamp(c + d, 0.0, 1.0) * uLevels + 0.5) / uLevels;
  outputColor = vec4(q, inputColor.a);
}
`;

export class PS1Effect extends Effect {
  constructor() {
    super("PS1Effect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["uTime", new Uniform(0)],
        ["uGrain", new Uniform(0.04)],
        ["uGain", new Uniform(1.3)],
        ["uContrast", new Uniform(0.45)],
        ["uSaturation", new Uniform(0.7)],
        ["uLevels", new Uniform(24)],
      ]),
    });
  }
  update(_r: unknown, _i: unknown, delta: number) {
    const u = this.uniforms.get("uTime");
    if (u) u.value += delta;
  }
}
