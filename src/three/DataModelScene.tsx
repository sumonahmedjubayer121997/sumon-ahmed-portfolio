import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { SceneProps } from '@/components/PhysicsCanvas';
import type { ScrollProgress } from '@/hooks/useScrollPhysics';
import { buildModelTargets, stageValue } from '@/lib/dataModelStages';
import { createRandom } from '@/lib/random';
import { bump, clamp, damp, smoothstep } from '@/lib/math';
import { palette } from '@/lib/color';
import { pointer } from '@/lib/pointer';
import { qaSettled } from '@/lib/device';
import { wobble } from '@/physics/noise';
import { createLinesMaterial, dynamicAttribute, vec3 } from './shaders';
import { SceneCanvas } from './SceneCanvas';

export interface DataModelSceneProps {
  count: number;
  compact: boolean;
  /** Spring-smoothed pinned scroll progress, mutated by the section. */
  progress: ScrollProgress;
  /** DOM labels positioned over the prediction groups. */
  labelRefs: MutableRefObject<Array<HTMLElement | null>>;
}

export default function DataModelScene({ active, ...props }: DataModelSceneProps & SceneProps) {
  return (
    <SceneCanvas active={active} camera={{ fov: 30, position: [0, 0, 1400], near: 1, far: 8000 }}>
      <ModelField {...props} />
    </SceneCanvas>
  );
}

const CLASS_COLORS = [palette.accent, palette.ink, '#5E5A53', '#A39E94'];
/** Greyscale separation used while the model is forming (before colour carries meaning). */
const CLASS_GREYS = [palette.ink, '#4A4741', '#7A766E', '#A39E94'];

function ModelField({ count, compact, progress, labelRefs }: DataModelSceneProps) {
  const { size, camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const rot = useRef({ x: 0, y: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const targets = useMemo(() => buildModelTargets(count, createRandom(5)), [count]);

  const gfx = useMemo(() => {
    const positions = new Float32Array(targets.stages[0]);
    const velocities = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    const posAttr = dynamicAttribute(positions, 3);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aClass', new THREE.BufferAttribute(Float32Array.from(targets.classes), 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(targets.sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uInk: { value: vec3(palette.ink) },
        uColors: { value: CLASS_COLORS.map(vec3) },
        uGreys: { value: CLASS_GREYS.map(vec3) },
        uTint: { value: 0 },
        uShade: { value: 0 },
        uPixelRatio: { value: 1 },
        uCamZ: { value: 1400 },
        uScale: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aClass;
        attribute float aSize;
        uniform float uPixelRatio;
        uniform float uCamZ;
        uniform float uScale;
        uniform float uTint;
        uniform float uShade;
        uniform vec3 uInk;
        uniform vec3 uColors[4];
        uniform vec3 uGreys[4];
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale * uPixelRatio * (uCamZ / max(1.0, -mv.z));
          int c = int(aClass + 0.5);
          vec3 cc = c == 0 ? uColors[0] : (c == 1 ? uColors[1] : (c == 2 ? uColors[2] : uColors[3]));
          vec3 gc = c == 0 ? uGreys[0] : (c == 1 ? uGreys[1] : (c == 2 ? uGreys[2] : uGreys[3]));
          vColor = mix(mix(uInk, gc, uShade), cc, uTint);
          vAlpha = mix(mix(0.5, 0.72, uShade), c == 0 ? 0.95 : 0.8, uTint);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = 1.0 - smoothstep(0.36, 0.5, d);
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `,
    });

    // Feature-space axes (corner frame with ticks).
    const axes: number[] = [];
    const o = [-250, -170, -170];
    axes.push(...o, 250, -170, -170, ...o, -250, 170, -170, ...o, -250, -170, 170);
    for (let t = 0; t <= 10; t++) {
      const x = -250 + t * 50;
      axes.push(x, -170, -170, x, -178, -170);
      const y = -170 + t * 34;
      axes.push(-250, y, -170, -258, y, -170);
    }
    const axesGeo = new THREE.BufferGeometry();
    axesGeo.setAttribute('position', new THREE.Float32BufferAttribute(axes, 3));
    axesGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(new Array(axes.length / 3).fill(1), 1));

    // Decision boundaries: two orthogonal planes drawn as framed grids.
    const planes: number[] = [];
    const rect = (pts: number[][]) => {
      for (let i = 0; i < pts.length; i++) planes.push(...pts[i], ...pts[(i + 1) % pts.length]);
    };
    rect([
      [0, -220, -200],
      [0, 220, -200],
      [0, 220, 200],
      [0, -220, 200],
    ]);
    rect([
      [-300, 0, -200],
      [300, 0, -200],
      [300, 0, 200],
      [-300, 0, 200],
    ]);
    for (let g = -150; g <= 150; g += 75) {
      planes.push(0, -220, g, 0, 220, g, -300, 0, g, 300, 0, g);
    }
    const planesGeo = new THREE.BufferGeometry();
    planesGeo.setAttribute('position', new THREE.Float32BufferAttribute(planes, 3));
    planesGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(new Array(planes.length / 3).fill(1), 1));

    return {
      positions,
      velocities,
      geo,
      posAttr,
      material,
      axesGeo,
      axesMat: createLinesMaterial({ color: palette.ink, opacity: 0 }),
      planesGeo,
      planesMat: createLinesMaterial({ color: palette.ink, opacity: 0 }),
    };
  }, [count, targets]);

  useEffect(
    () => () => {
      gfx.geo.dispose();
      gfx.material.dispose();
      gfx.axesGeo.dispose();
      gfx.axesMat.dispose();
      gfx.planesGeo.dispose();
      gfx.planesMat.dispose();
    },
    [gfx],
  );

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const z = size.height / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.position.set(0, 0, z);
    cam.far = z * 4;
    cam.updateProjectionMatrix();
    gfx.material.uniforms.uCamZ.value = z;
  }, [size, camera, gfx]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const s = qaSettled() ? 3 * progress.raw : stageValue(progress.progress);
    const i0 = Math.min(Math.floor(s), 2);
    const f = s - i0;
    const from = targets.stages[i0];
    const to = targets.stages[i0 + 1];
    const chaos = 1 - clamp(s);
    const { positions: p, velocities: v } = gfx;
    // Slightly under-damped per-particle springs: fast scrolling overshoots, slow scrolling glides.
    const k = 70;
    const c = 12;
    const snap = qaSettled();

    for (let i = 0; i < count; i++) {
      const local = smoothstep(0, 1, clamp((f - targets.delays[i] * 0.35) / 0.65));
      const seed = targets.seeds[i];
      for (let a = 0; a < 3; a++) {
        const ix = i * 3 + a;
        let target = from[ix] + (to[ix] - from[ix]) * local;
        if (chaos > 0) target += wobble(seed + a * 7.31, t * 0.9) * 14 * chaos;
        if (snap) {
          p[ix] = target;
          v[ix] = 0;
          continue;
        }
        v[ix] += ((target - p[ix]) * k - v[ix] * c) * dt;
        p[ix] += v[ix] * dt;
      }
    }
    gfx.posAttr.needsUpdate = true;

    gfx.material.uniforms.uShade.value = smoothstep(1.2, 2.0, s);
    gfx.material.uniforms.uTint.value = smoothstep(2.35, 2.95, s);
    gfx.material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    gfx.axesMat.uniforms.uOpacity.value = bump(s, 1.35, 1.0) * 0.32;
    gfx.planesMat.uniforms.uOpacity.value = bump(s, 2.0, 0.75) * 0.16;

    // Layout: structure sits right of the copy on desktop, centred on mobile.
    const scale = Math.min(size.width * (compact ? 0.86 : 0.5), size.height * (compact ? 0.9 : 1.15)) / 640;
    g.scale.setScalar(scale);
    gfx.material.uniforms.uScale.value = Math.max(0.75, Math.min(scale, 1.4));
    g.position.x = compact ? 0 : size.width * 0.17;
    g.position.y = compact ? -size.height * 0.02 : 0;

    // Rotate to reveal depth in feature/model space, face forward for the prediction.
    const reveal = smoothstep(0.25, 1.2, s) - smoothstep(2.15, 2.95, s);
    const px = pointer.active ? (pointer.x / size.width - 0.5) * 2 : 0;
    const py = pointer.active ? (pointer.y / size.height - 0.5) * 2 : 0;
    const front = smoothstep(2.6, 3, s);
    rot.current.y = damp(
      rot.current.y,
      reveal * 0.62 + px * 0.1 * (1 - front) + Math.sin(t * 0.18) * 0.05 * chaos,
      3,
      dt,
    );
    rot.current.x = damp(rot.current.x, reveal * 0.24 + py * 0.06 * (1 - front), 3, dt);
    g.rotation.set(rot.current.x, rot.current.y, 0);
    g.updateMatrixWorld();

    // Project group labels into screen space.
    const labelOpacity = smoothstep(2.55, 2.95, s);
    targets.labelAnchors.forEach((anchor, idx) => {
      const el = labelRefs.current[idx];
      if (!el) return;
      tmp.set(anchor[0], anchor[1], anchor[2]).applyMatrix4(g.matrixWorld).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 18).toFixed(1)}px, 0)`;
      el.style.opacity = labelOpacity.toFixed(3);
    });
  });

  return (
    <group ref={group}>
      <lineSegments geometry={gfx.axesGeo} material={gfx.axesMat} frustumCulled={false} />
      <lineSegments geometry={gfx.planesGeo} material={gfx.planesMat} frustumCulled={false} />
      <points geometry={gfx.geo} material={gfx.material} frustumCulled={false} />
    </group>
  );
}
