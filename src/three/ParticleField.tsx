import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useParticleSimulation } from '@/hooks/useParticleSimulation';
import { buildHeroStructure, computeHeroLinks, type HeroBand, type HeroStructure } from '@/lib/heroStructure';
import { createRandom } from '@/lib/random';
import { pointer } from '@/lib/pointer';
import { clamp, damp, easeInOutCubic } from '@/lib/math';
import { palette } from '@/lib/color';
import { qaSettled } from '@/lib/device';
import { heroTelemetry } from '@/lib/telemetry';
import { SpatialHash } from '@/physics/spatialHash';
import type { ParticleInput } from '@/physics/particles';
import { createLinesMaterial, createPointsMaterial, dynamicAttribute } from './shaders';
import { useCanvasRect } from './useCanvasRect';

export interface ParticleFieldProps {
  count: number;
  compact: boolean;
  band: HeroBand | null;
}

const MAX_SEGMENTS = 2600;

/**
 * The hero simulation. Particles start dispersed (raw data), then a global
 * `order` parameter ramps up and springs pull them into the hero structure.
 * The pointer repels at short range, forms a ring at mid range, and attracts
 * while pressed. Disturbed structural links stretch, fade, then heal.
 *
 * World units are CSS pixels at z = 0, so pointer mapping is exact.
 */
export function ParticleField({ count, compact, band }: ParticleFieldProps) {
  const { size, camera } = useThree();
  const canvasRect = useCanvasRect();
  const { field, params, random } = useParticleSimulation(count, 11, {
    pointerRadius: compact ? 120 : 170,
    noiseStrength: compact ? 55 : 70,
  });
  const structure = useRef<HeroStructure | null>(null);
  const started = useRef<number | null>(null);
  const scattered = useRef(false);
  const camShift = useRef({ x: 0, y: 0 });
  const input = useRef<ParticleInput>({ x: 0, y: 0, active: false, down: false });

  const gfx = useMemo(() => {
    const sizes = new Float32Array(count);
    const accent = new Float32Array(count);
    const pointsGeo = new THREE.BufferGeometry();
    const posAttr = dynamicAttribute(field.positions, 3);
    const energyAttr = dynamicAttribute(field.energy, 1);
    pointsGeo.setAttribute('position', posAttr);
    pointsGeo.setAttribute('aEnergy', energyAttr);
    pointsGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    pointsGeo.setAttribute('aAccent', new THREE.BufferAttribute(accent, 1));

    const linePositions = new Float32Array(MAX_SEGMENTS * 6);
    const lineAlpha = new Float32Array(MAX_SEGMENTS * 2);
    const linesGeo = new THREE.BufferGeometry();
    const linePosAttr = dynamicAttribute(linePositions, 3);
    const lineAlphaAttr = dynamicAttribute(lineAlpha, 1);
    linesGeo.setAttribute('position', linePosAttr);
    linesGeo.setAttribute('aAlpha', lineAlphaAttr);
    linesGeo.setDrawRange(0, 0);

    return {
      sizes,
      accent,
      pointsGeo,
      posAttr,
      energyAttr,
      linesGeo,
      linePositions,
      lineAlpha,
      linePosAttr,
      lineAlphaAttr,
      pointsMat: createPointsMaterial({ ink: palette.ink, accent: palette.accent, opacity: 0.95 }),
      linesMat: createLinesMaterial({ color: palette.ink, opacity: 0.26 }),
      hash: new SpatialHash(count),
      linkCounts: new Uint8Array(count),
    };
  }, [count, field]);

  useEffect(
    () => () => {
      gfx.pointsGeo.dispose();
      gfx.linesGeo.dispose();
      gfx.pointsMat.dispose();
      gfx.linesMat.dispose();
    },
    [gfx],
  );

  // Fit the camera so 1 world unit = 1 CSS px at z = 0, and (re)build the structure.
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const z = size.height / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.position.set(0, 0, z);
    cam.near = 1;
    cam.far = z * 4;
    cam.updateProjectionMatrix();
    gfx.pointsMat.uniforms.uCamZ.value = z;

    const s = buildHeroStructure(count, size.width, size.height, compact, createRandom(23), band);
    structure.current = s;
    field.targets.set(s.targets);
    field.weights.set(s.weights);
    gfx.sizes.set(s.sizes);
    gfx.accent.set(s.accent);
    (gfx.pointsGeo.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
    (gfx.pointsGeo.getAttribute('aAccent') as THREE.BufferAttribute).needsUpdate = true;
    field.setBounds(size.width / 2, size.height / 2);
    if (!scattered.current) {
      field.scatter(random);
      scattered.current = true;
    }
  }, [size.width, size.height, camera, count, compact, band, field, gfx, random]);

  useEffect(() => {
    heroTelemetry.nodes = count;
    heroTelemetry.running = true;
    return () => {
      heroTelemetry.running = false;
    };
  }, [count]);

  useFrame((state, delta) => {
    const s = structure.current;
    if (!s) return;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    if (started.current === null) {
      started.current = qaSettled() ? t - 30 : t;
      if (qaSettled()) {
        params.order = 1;
        for (let k = 0; k < 600; k++) field.step(1 / 60, k / 60, input.current, params);
      }
    }
    const age = t - started.current;

    // Dispersed → organised over the first few seconds.
    params.order = easeInOutCubic(clamp((age - 1.2) / 4.8));

    // The lattice breathes: a slow travelling wave through the ordered region.
    const tg = field.targets;
    for (let i = 0; i < count; i++) {
      const w = s.weights[i];
      if (w < 0.3) continue;
      const bx = s.targets[i * 3];
      tg[i * 3 + 1] = s.targets[i * 3 + 1] + Math.sin(t * 0.55 + bx * 0.007) * 6 * w;
    }

    // Pointer → field space (y up, origin centre).
    const rect = canvasRect();
    const lx = pointer.x - rect.left;
    const ly = pointer.y - rect.top;
    const inside = pointer.active && lx >= 0 && ly >= 0 && lx <= rect.width && ly <= rect.height;
    input.current.x = lx - rect.width / 2;
    input.current.y = -(ly - rect.height / 2);
    input.current.active = inside;
    input.current.down = inside && pointer.down;

    field.step(dt, t, input.current, params);
    gfx.posAttr.needsUpdate = true;
    gfx.energyAttr.needsUpdate = true;

    const n = computeHeroLinks(
      field.positions,
      s,
      gfx.hash,
      size.width / 2,
      size.height / 2,
      { maxDist: compact ? 48 : 58, maxPerNode: 3, maxSegments: MAX_SEGMENTS, order: params.order },
      gfx.linkCounts,
      gfx.linePositions,
      gfx.lineAlpha,
      field.energy,
    );
    gfx.linesGeo.setDrawRange(0, n * 2);
    gfx.linePosAttr.clearUpdateRanges();
    gfx.linePosAttr.addUpdateRange(0, n * 6);
    gfx.linePosAttr.needsUpdate = true;
    gfx.lineAlphaAttr.clearUpdateRanges();
    gfx.lineAlphaAttr.addUpdateRange(0, n * 2);
    gfx.lineAlphaAttr.needsUpdate = true;

    // Gentle camera parallax separates the depth layers.
    const nx = inside ? (lx / rect.width - 0.5) * 2 : 0;
    const ny = inside ? (ly / rect.height - 0.5) * 2 : 0;
    camShift.current.x = damp(camShift.current.x, nx * 10, 2, dt);
    camShift.current.y = damp(camShift.current.y, -ny * 8, 2, dt);
    camera.position.x = camShift.current.x;
    camera.position.y = camShift.current.y;
    gfx.pointsMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();

    heroTelemetry.links = n;
    heroTelemetry.disorder = field.disorder;
    heroTelemetry.order = params.order;
    heroTelemetry.excitation = field.excitation;
  });

  return (
    <>
      <lineSegments geometry={gfx.linesGeo} material={gfx.linesMat} frustumCulled={false} />
      <points geometry={gfx.pointsGeo} material={gfx.pointsMat} frustumCulled={false} />
    </>
  );
}
