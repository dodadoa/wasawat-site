import { forwardRef, useEffect, useMemo } from "react"
import { Uniform } from "three"
import { Effect, BlendFunction } from "postprocessing"
import { EffectComposer } from "@react-three/postprocessing"

// Dot-screen halftone + ordered (Bayer 8x8) dither, applied only left of
// `edge` (0..1 screen x). Right of the edge the same contrast curve runs
// without the pattern, so both sides share the same (near-black) background.
const fragment = /* glsl */ `
  uniform float levels;
  uniform float edge;
  uniform float dotScale;

  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }

  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  float halftonePattern(vec2 p) {
    const float c = 0.70710678; // 45 degrees
    vec2 q = mat2(c, -c, c, c) * (p * dotScale);
    return (sin(q.x) * sin(q.y)) * 4.0;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 contrast = inputColor.rgb * 10.0 - 5.0;

    vec3 toned = clamp(contrast + halftonePattern(gl_FragCoord.xy), 0.0, 1.0);
    float threshold = bayer8(gl_FragCoord.xy) - 0.5;
    toned = clamp(floor((toned + threshold / levels) * levels + 0.5) / levels, 0.0, 1.0);

    float m = 1.0 - step(edge, uv.x);
    vec3 color = mix(clamp(contrast, 0.0, 1.0), toned, m);
    outputColor = vec4(color, inputColor.a);
  }
`

class HalftoneDitherEffect extends Effect {
  constructor({ levels = 3, edge = 1, dotScale = 1 } = {}) {
    super("HalftoneDitherEffect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ["levels", new Uniform(levels)],
        ["edge", new Uniform(edge)],
        ["dotScale", new Uniform(dotScale)],
      ]),
    })
  }
}

const HalftoneDither = forwardRef(function HalftoneDither(
  { levels = 3, edge = 1, dotScale = 1 },
  ref,
) {
  const effect = useMemo(() => new HalftoneDitherEffect(), [])

  useEffect(() => {
    effect.uniforms.get("levels").value = levels
    effect.uniforms.get("edge").value = edge
    effect.uniforms.get("dotScale").value = dotScale
  }, [effect, levels, edge, dotScale])

  return <primitive ref={ref} object={effect} dispose={null} />
})

export default function HalftoneDitherEffects({
  dotScale = 1.0,
  ditherLevels = 3,
  edge = 1,
}) {
  return (
    <EffectComposer>
      <HalftoneDither levels={ditherLevels} edge={edge} dotScale={dotScale} />
    </EffectComposer>
  )
}
