import * as THREE from 'three';
import { hexToRgb } from '@/lib/color';

/** Raw sRGB vec3 (bypasses three's colour management so shader output matches CSS). */
export const vec3 = (hex: string) => new THREE.Vector3(...hexToRgb(hex));

/** Anti-aliased round point; `soft` (0–1) widens the edge from crisp to an out-of-focus disc. */
const roundPoint = /* glsl */ `
  float roundAlpha(float soft) {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    return 1.0 - smoothstep(mix(0.38, 0.0, soft), 0.5, d);
  }
`;

/**
 * Generic particle material: per-point size, excitation and accent mix.
 * Size attenuates with depth relative to the camera distance so z adds parallax.
 * `blur` softens every point and `depthBlur` adds softness per unit of distance
 * from the z = 0 plane (a shallow depth of field). Softer points grow and fade
 * so they keep roughly the same visual weight.
 */
export function createPointsMaterial(opts: {
  ink: string;
  accent: string;
  opacity: number;
  additive?: boolean;
  blur?: number;
  depthBlur?: number;
}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uInk: { value: vec3(opts.ink) },
      uAccent: { value: vec3(opts.accent) },
      uOpacity: { value: opts.opacity },
      uPixelRatio: { value: 1 },
      uCamZ: { value: 1000 },
      uBlur: { value: opts.blur ?? 0 },
      uDepthBlur: { value: opts.depthBlur ?? 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aEnergy;
      attribute float aAccent;
      uniform float uPixelRatio;
      uniform float uCamZ;
      uniform float uBlur;
      uniform float uDepthBlur;
      varying float vEnergy;
      varying float vAccent;
      varying float vSoft;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float soft = clamp(uBlur + abs(position.z) * uDepthBlur, 0.0, 1.0);
        float size = aSize * (1.0 + aEnergy * 0.9) * (1.0 + soft * 1.4);
        gl_PointSize = size * uPixelRatio * (uCamZ / max(1.0, -mv.z));
        vEnergy = aEnergy;
        vAccent = aAccent;
        vSoft = soft;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      uniform vec3 uAccent;
      uniform float uOpacity;
      varying float vEnergy;
      varying float vAccent;
      varying float vSoft;
      ${roundPoint}
      void main() {
        float a = roundAlpha(vSoft);
        if (a < 0.01) discard;
        vec3 col = mix(uInk, uAccent, vAccent);
        float alpha = uOpacity * (0.5 + 0.5 * vEnergy + 0.45 * vAccent) / (1.0 + vSoft * 0.9);
        gl_FragColor = vec4(col, a * min(alpha, 1.0));
      }
    `,
  });
}

/** Line segments with per-vertex alpha. WebGL lines are 1 device px — exactly the hairline we want. */
export function createLinesMaterial(opts: { color: string; opacity: number; additive?: boolean }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uColor: { value: vec3(opts.color) },
      uOpacity: { value: opts.opacity },
    },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha * uOpacity);
      }
    `,
  });
}

/** Dynamic BufferAttribute helper. */
export function dynamicAttribute(array: Float32Array, itemSize: number) {
  const attr = new THREE.BufferAttribute(array, itemSize);
  attr.setUsage(THREE.DynamicDrawUsage);
  return attr;
}
