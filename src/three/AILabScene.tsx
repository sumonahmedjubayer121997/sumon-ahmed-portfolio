import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { SceneProps } from '@/components/PhysicsCanvas';
import { CORE_ID, labLinks, labNodes } from '@/data/aiLab';
import { bezier, controlPoint, labExtents, labLayout, neighbours, type Vec3 } from '@/lib/aiLabLayout';
import { palette } from '@/lib/color';
import { pointer } from '@/lib/pointer';
import { ui } from '@/lib/store';
import { clamp, damp, smoothstep } from '@/lib/math';
import { createRandom } from '@/lib/random';
import { createSpring1D, stepSpring1D, type Spring1D } from '@/physics/spring';
import { createLinesMaterial, dynamicAttribute, vec3 } from './shaders';
import { SceneCanvas } from './SceneCanvas';
import { useCanvasRect } from './useCanvasRect';

export interface AILabSceneProps {
  compact: boolean;
  coreCount: number;
  /** DOM buttons positioned over each node by the scene. */
  labelRefs: MutableRefObject<Record<string, HTMLElement | null>>;
}

export default function AILabScene({ active, ...props }: AILabSceneProps & SceneProps) {
  return (
    <SceneCanvas active={active} camera={{ fov: 36, position: [0, 0, 12], near: 0.1, far: 100 }}>
      <Lab {...props} />
    </SceneCanvas>
  );
}

const SEG = 26;
const FLOW_MAX = 200;
const SAT_IDS = labNodes.filter((n) => n.id !== CORE_ID).map((n) => n.id);

interface NodeState {
  home: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: Spring1D;
  glow: Spring1D;
  dim: Spring1D;
}

const nodeSpring = { stiffness: 180, damping: 18, mass: 1 };

function Lab({ compact, coreCount, labelRefs }: AILabSceneProps) {
  const { size, camera } = useThree();
  const canvasRect = useCanvasRect();
  const group = useRef<THREE.Group>(null);
  const corePoints = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);
  const layout = useMemo(() => labLayout(compact), [compact]);

  const nodes = useMemo(() => {
    const m = new Map<string, NodeState>();
    for (const n of labNodes) {
      const h = new THREE.Vector3(...layout[n.id]);
      m.set(n.id, {
        home: h,
        pos: h.clone(),
        vel: new THREE.Vector3(),
        scale: createSpring1D(1),
        glow: createSpring1D(0),
        dim: createSpring1D(1),
      });
    }
    return m;
  }, [layout]);

  const gfx = useMemo(() => {
    const rand = createRandom(17);

    // LLM core: a breathing point sphere (fibonacci lattice).
    const corePos = new Float32Array(coreCount * 3);
    const coreSeed = new Float32Array(coreCount);
    const coreAccent = new Float32Array(coreCount);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < coreCount; i++) {
      const y = 1 - (2 * (i + 0.5)) / coreCount;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      corePos.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3);
      coreSeed[i] = rand.next();
      coreAccent[i] = rand.next() < 0.04 ? 1 : 0;
    }
    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    coreGeo.setAttribute('aSeed', new THREE.BufferAttribute(coreSeed, 1));
    coreGeo.setAttribute('aAccent', new THREE.BufferAttribute(coreAccent, 1));
    const coreMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uFocus: { value: 0 },
        uPixelRatio: { value: 1 },
        uCamZ: { value: 12 },
        uBone: { value: vec3(palette.bone) },
        uAccent: { value: vec3(palette.accent) },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        attribute float aAccent;
        uniform float uTime;
        uniform float uPulse;
        uniform float uPixelRatio;
        uniform float uCamZ;
        varying float vAlpha;
        varying float vAccent;
        void main() {
          vec3 n = normalize(position);
          float wave = sin(n.x * 4.0 + uTime * 0.9) * sin(n.y * 3.0 - uTime * 0.7) * sin(n.z * 5.0 + uTime * 0.5);
          float ripple = uPulse * sin(uTime * 7.0 - n.y * 6.0 + aSeed * 6.2831);
          vec3 p = position * (1.0 + wave * 0.07 + ripple * 0.06);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float facing = dot(normalize(normalMatrix * n), vec3(0.0, 0.0, 1.0));
          float front = smoothstep(-0.7, 1.0, facing);
          vAlpha = 0.18 + 0.82 * front;
          vAccent = aAccent;
          gl_PointSize = (1.6 + front * 1.6) * uPixelRatio * (uCamZ / max(0.1, -mv.z));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uBone;
        uniform vec3 uAccent;
        uniform float uFocus;
        varying float vAlpha;
        varying float vAccent;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = 1.0 - smoothstep(0.3, 0.5, d);
          if (a < 0.01) discard;
          vec3 col = mix(uBone, uAccent, max(vAccent, uFocus * 0.35));
          gl_FragColor = vec4(col, a * vAlpha * 0.75);
        }
      `,
    });

    // Components: one point each, drawn as dot + activation ring.
    const satPos = new Float32Array(SAT_IDS.length * 3);
    const satScale = new Float32Array(SAT_IDS.length).fill(1);
    const satGlow = new Float32Array(SAT_IDS.length);
    const satDim = new Float32Array(SAT_IDS.length).fill(1);
    const satGeo = new THREE.BufferGeometry();
    const satPosAttr = dynamicAttribute(satPos, 3);
    const satScaleAttr = dynamicAttribute(satScale, 1);
    const satGlowAttr = dynamicAttribute(satGlow, 1);
    const satDimAttr = dynamicAttribute(satDim, 1);
    satGeo.setAttribute('position', satPosAttr);
    satGeo.setAttribute('aScale', satScaleAttr);
    satGeo.setAttribute('aGlow', satGlowAttr);
    satGeo.setAttribute('aDim', satDimAttr);
    const satMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uPixelRatio: { value: 1 },
        uBase: { value: compact ? 38 : 46 },
        uBone: { value: vec3(palette.bone) },
        uAccent: { value: vec3(palette.accent) },
      },
      vertexShader: /* glsl */ `
        attribute float aScale;
        attribute float aGlow;
        attribute float aDim;
        uniform float uPixelRatio;
        uniform float uBase;
        varying float vGlow;
        varying float vDim;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uBase * aScale * uPixelRatio;
          vGlow = aGlow;
          vDim = aDim;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uBone;
        uniform vec3 uAccent;
        varying float vGlow;
        varying float vDim;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float core = 1.0 - smoothstep(0.15, 0.2, d);
          float ring = (1.0 - smoothstep(0.015, 0.05, abs(d - 0.74))) * vGlow;
          float halo = (1.0 - smoothstep(0.0, 0.85, d)) * 0.16 * vGlow;
          float a = max(core, ring * 0.9) + halo;
          if (a < 0.01) discard;
          vec3 col = mix(uBone, uAccent, smoothstep(0.3, 1.0, vGlow));
          gl_FragColor = vec4(col, a * vDim);
        }
      `,
    });

    // Links as sampled quadratic curves.
    const linkPos = new Float32Array(labLinks.length * SEG * 6);
    const linkAlpha = new Float32Array(labLinks.length * SEG * 2);
    const linkGeo = new THREE.BufferGeometry();
    const linkPosAttr = dynamicAttribute(linkPos, 3);
    const linkAlphaAttr = dynamicAttribute(linkAlpha, 1);
    linkGeo.setAttribute('position', linkPosAttr);
    linkGeo.setAttribute('aAlpha', linkAlphaAttr);
    const linkMat = createLinesMaterial({ color: palette.bone, opacity: 1 });
    const linkAccentAlpha = new Float32Array(labLinks.length * SEG * 2);
    const linkAccentGeo = new THREE.BufferGeometry();
    const linkAccentAlphaAttr = dynamicAttribute(linkAccentAlpha, 1);
    linkAccentGeo.setAttribute('position', linkPosAttr);
    linkAccentGeo.setAttribute('aAlpha', linkAccentAlphaAttr);
    const linkAccentMat = createLinesMaterial({ color: palette.accent, opacity: 1 });

    // Particles travelling along links.
    const flowPos = new Float32Array(FLOW_MAX * 3);
    const flowAlpha = new Float32Array(FLOW_MAX);
    const flowAccent = new Float32Array(FLOW_MAX);
    const flowGeo = new THREE.BufferGeometry();
    const flowPosAttr = dynamicAttribute(flowPos, 3);
    const flowAlphaAttr = dynamicAttribute(flowAlpha, 1);
    const flowAccentAttr = dynamicAttribute(flowAccent, 1);
    flowGeo.setAttribute('position', flowPosAttr);
    flowGeo.setAttribute('aAlpha', flowAlphaAttr);
    flowGeo.setAttribute('aAccent', flowAccentAttr);
    const flowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: 1 },
        uBone: { value: vec3(palette.bone) },
        uAccent: { value: vec3(palette.accent) },
      },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        attribute float aAccent;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying float vAccent;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (2.5 + aAccent * 1.5) * uPixelRatio;
          vAlpha = aAlpha;
          vAccent = aAccent;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uBone;
        uniform vec3 uAccent;
        varying float vAlpha;
        varying float vAccent;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = 1.0 - smoothstep(0.25, 0.5, d);
          if (a < 0.01 || vAlpha < 0.01) discard;
          gl_FragColor = vec4(mix(uBone, uAccent, vAccent), a * vAlpha);
        }
      `,
    });

    // Background dust for depth.
    const dustCount = compact ? 160 : 320;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 5 + rand.next() * 6;
      const th = rand.next() * Math.PI * 2;
      const ph = Math.acos(2 * rand.next() - 1);
      dustPos.set(
        [Math.sin(ph) * Math.cos(th) * r * 1.6, Math.cos(ph) * r * 0.8, Math.sin(ph) * Math.sin(th) * r - 3],
        i * 3,
      );
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: new THREE.Color(0.55, 0.53, 0.5),
      size: 1.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    return {
      coreGeo,
      coreMat,
      satGeo,
      satMat,
      satPos,
      satScale,
      satGlow,
      satDim,
      satPosAttr,
      satScaleAttr,
      satGlowAttr,
      satDimAttr,
      linkGeo,
      linkMat,
      linkPos,
      linkAlpha,
      linkPosAttr,
      linkAlphaAttr,
      linkAccentGeo,
      linkAccentMat,
      linkAccentAlpha,
      linkAccentAlphaAttr,
      flowGeo,
      flowMat,
      flowPos,
      flowAlpha,
      flowAccent,
      flowPosAttr,
      flowAlphaAttr,
      flowAccentAttr,
      dustGeo,
      dustMat,
    };
  }, [coreCount, compact]);

  useEffect(
    () => () => {
      Object.values(gfx).forEach((v) => {
        if (v instanceof THREE.BufferGeometry || v instanceof THREE.Material) v.dispose();
      });
    },
    [gfx],
  );

  // Simulation state that never touches React.
  const sim = useMemo(
    () => ({
      lastActive: null as string | null,
      neighbourSet: new Set<string>(),
      pulse: createSpring1D(0),
      focus: createSpring1D(0),
      rotX: 0,
      rotY: 0,
      linkLevel: new Float32Array(labLinks.length),
      linkAccent: new Float32Array(labLinks.length),
      ctrl: labLinks.map(() => [0, 0, 0] as Vec3),
      spawnAcc: new Float32Array(labLinks.length),
      flowLink: new Int16Array(FLOW_MAX).fill(-1),
      flowT: new Float32Array(FLOW_MAX),
      flowSpeed: new Float32Array(FLOW_MAX),
      flowDir: new Int8Array(FLOW_MAX),
      rand: createRandom(99),
      ray: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
      a: [0, 0, 0] as Vec3,
      b: [0, 0, 0] as Vec3,
      p: [0, 0, 0] as Vec3,
    }),
    [],
  );

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const aspect = size.width / Math.max(1, size.height);
    const { halfW, halfH } = labExtents(compact);
    cam.position.set(0, 0, Math.max(halfH / tan, halfW / (tan * aspect)));
    cam.updateProjectionMatrix();
    gfx.coreMat.uniforms.uCamZ.value = cam.position.z;
  }, [size, camera, compact, gfx]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const activeId = ui().aiActive;
    const dpr = state.gl.getPixelRatio();

    // A newly activated node shoves its neighbours outward; the core ripples.
    if (activeId !== sim.lastActive) {
      sim.neighbourSet = new Set(activeId ? neighbours(activeId) : []);
      if (activeId) {
        const a = nodes.get(activeId)!;
        for (const id of sim.neighbourSet) {
          const n = nodes.get(id)!;
          sim.tmp.copy(n.pos).sub(a.pos).normalize();
          n.vel.addScaledVector(sim.tmp, id === CORE_ID ? 0.7 : 1.8);
        }
        a.vel.z += 0.8;
        sim.pulse.velocity += 4;
      }
      sim.lastActive = activeId;
    }

    // Pointer → world plane through the active node (magnetic lean).
    const rect = canvasRect();
    const inside =
      pointer.active &&
      pointer.x >= rect.left &&
      pointer.x <= rect.right &&
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom;
    let hasPointer = false;
    if (inside && activeId) {
      const nx = ((pointer.x - rect.left) / rect.width) * 2 - 1;
      const ny = -((pointer.y - rect.top) / rect.height) * 2 + 1;
      const node = nodes.get(activeId)!;
      sim.ray.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
      const dist = (node.home.z - camera.position.z) / sim.ray.z;
      sim.ray.multiplyScalar(dist).add(camera.position);
      hasPointer = true;
    }

    for (const [id, n] of nodes) {
      const isActive = id === activeId;
      const isNb = sim.neighbourSet.has(id);
      const k = id === CORE_ID ? 34 : 15;
      let tx = n.home.x;
      let ty = n.home.y;
      if (isActive && hasPointer) {
        const ox = clamp(sim.ray.x - n.home.x, -0.5, 0.5);
        const oy = clamp(sim.ray.y - n.home.y, -0.5, 0.5);
        tx += ox * 0.8;
        ty += oy * 0.8;
      }
      // distance → force → acceleration → velocity → position
      n.vel.x += ((tx - n.pos.x) * k - n.vel.x * 3.6) * dt;
      n.vel.y += ((ty - n.pos.y) * k - n.vel.y * 3.6) * dt;
      n.vel.z += ((n.home.z - n.pos.z) * k - n.vel.z * 3.6) * dt;
      n.pos.addScaledVector(n.vel, dt);
      n.pos.y += Math.sin(t * 0.6 + n.home.x * 1.7) * 0.0015; // idle drift

      n.scale.target = isActive ? 1.7 : isNb ? 1.18 : 1;
      n.glow.target = isActive ? 1 : isNb ? 0.3 : 0;
      n.dim.target = activeId && !isActive && !isNb && id !== CORE_ID ? 0.38 : 1;
      stepSpring1D(n.scale, nodeSpring, dt);
      stepSpring1D(n.glow, nodeSpring, dt);
      stepSpring1D(n.dim, nodeSpring, dt);
    }

    SAT_IDS.forEach((id, i) => {
      const n = nodes.get(id)!;
      gfx.satPos[i * 3] = n.pos.x;
      gfx.satPos[i * 3 + 1] = n.pos.y;
      gfx.satPos[i * 3 + 2] = n.pos.z;
      gfx.satScale[i] = n.scale.value;
      gfx.satGlow[i] = clamp(n.glow.value);
      gfx.satDim[i] = clamp(n.dim.value);
    });
    gfx.satPosAttr.needsUpdate = true;
    gfx.satScaleAttr.needsUpdate = true;
    gfx.satGlowAttr.needsUpdate = true;
    gfx.satDimAttr.needsUpdate = true;
    gfx.satMat.uniforms.uPixelRatio.value = dpr;

    const core = nodes.get(CORE_ID)!;
    stepSpring1D(sim.pulse, { stiffness: 30, damping: 5, mass: 1 }, dt);
    sim.focus.target = activeId === CORE_ID ? 1 : activeId ? 0.3 : 0;
    stepSpring1D(sim.focus, nodeSpring, dt);
    if (corePoints.current) {
      corePoints.current.position.copy(core.pos);
      corePoints.current.rotation.y = t * 0.12;
      corePoints.current.rotation.x = Math.sin(t * 0.1) * 0.2;
      corePoints.current.scale.setScalar(core.scale.value * (compact ? 0.95 : 1.12));
    }
    gfx.coreMat.uniforms.uTime.value = t;
    gfx.coreMat.uniforms.uPulse.value = clamp(Math.abs(sim.pulse.value), 0, 1.4);
    gfx.coreMat.uniforms.uFocus.value = clamp(sim.focus.value);
    gfx.coreMat.uniforms.uPixelRatio.value = dpr;

    // Links + flow particles.
    const coreActive = activeId === CORE_ID;
    labLinks.forEach((l, li) => {
      const A = nodes.get(l.a)!.pos;
      const B = nodes.get(l.b)!.pos;
      sim.a[0] = A.x;
      sim.a[1] = A.y;
      sim.a[2] = A.z;
      sim.b[0] = B.x;
      sim.b[1] = B.y;
      sim.b[2] = B.z;
      const c = controlPoint(sim.a, sim.b, sim.ctrl[li]);
      const touches = !!activeId && (l.a === activeId || l.b === activeId);
      const coreLink = l.a === CORE_ID || l.b === CORE_ID;
      const level = touches ? 1 : coreActive && coreLink ? 0.75 : activeId ? 0.08 : 0.2;
      sim.linkLevel[li] = damp(sim.linkLevel[li], level, 6, dt);
      sim.linkAccent[li] = damp(sim.linkAccent[li], touches || (coreActive && coreLink) ? 1 : 0, 6, dt);

      for (let s = 0; s < SEG; s++) {
        const t0 = s / SEG;
        const t1 = (s + 1) / SEG;
        bezier(sim.a, c, sim.b, t0, sim.p);
        const o = (li * SEG + s) * 6;
        gfx.linkPos[o] = sim.p[0];
        gfx.linkPos[o + 1] = sim.p[1];
        gfx.linkPos[o + 2] = sim.p[2];
        bezier(sim.a, c, sim.b, t1, sim.p);
        gfx.linkPos[o + 3] = sim.p[0];
        gfx.linkPos[o + 4] = sim.p[1];
        gfx.linkPos[o + 5] = sim.p[2];
        // Fade near the nodes so lines never cross the dots.
        const fade0 = smoothstep(0, 0.12, t0) * smoothstep(1, 0.88, t0);
        const fade1 = smoothstep(0, 0.12, t1) * smoothstep(1, 0.88, t1);
        const base = sim.linkLevel[li] * (1 - sim.linkAccent[li] * 0.7);
        const acc = sim.linkLevel[li] * sim.linkAccent[li] * 0.85;
        const ai = (li * SEG + s) * 2;
        gfx.linkAlpha[ai] = base * fade0;
        gfx.linkAlpha[ai + 1] = base * fade1;
        gfx.linkAccentAlpha[ai] = acc * fade0;
        gfx.linkAccentAlpha[ai + 1] = acc * fade1;
      }

      const rate = touches ? 10 : coreActive && coreLink ? 4 : 0.35;
      sim.spawnAcc[li] += rate * dt;
      while (sim.spawnAcc[li] >= 1) {
        sim.spawnAcc[li] -= 1;
        const slot = sim.flowLink.indexOf(-1);
        if (slot < 0) break;
        const dir = l.flow === 'ab' ? 1 : l.flow === 'ba' ? -1 : sim.rand.next() < 0.5 ? 1 : -1;
        sim.flowLink[slot] = li;
        sim.flowDir[slot] = dir;
        sim.flowT[slot] = dir > 0 ? 0 : 1;
        sim.flowSpeed[slot] = 0.35 + sim.rand.next() * 0.35;
      }
    });
    gfx.linkPosAttr.needsUpdate = true;
    gfx.linkAlphaAttr.needsUpdate = true;
    gfx.linkAccentAlphaAttr.needsUpdate = true;

    for (let i = 0; i < FLOW_MAX; i++) {
      const li = sim.flowLink[i];
      if (li < 0) {
        gfx.flowAlpha[i] = 0;
        continue;
      }
      sim.flowT[i] += sim.flowSpeed[i] * sim.flowDir[i] * dt;
      const ft = sim.flowT[i];
      if (ft < 0 || ft > 1) {
        sim.flowLink[i] = -1;
        gfx.flowAlpha[i] = 0;
        continue;
      }
      const l = labLinks[li];
      const A = nodes.get(l.a)!.pos;
      const B = nodes.get(l.b)!.pos;
      sim.a[0] = A.x;
      sim.a[1] = A.y;
      sim.a[2] = A.z;
      sim.b[0] = B.x;
      sim.b[1] = B.y;
      sim.b[2] = B.z;
      bezier(sim.a, sim.ctrl[li], sim.b, ft, sim.p);
      gfx.flowPos[i * 3] = sim.p[0];
      gfx.flowPos[i * 3 + 1] = sim.p[1];
      gfx.flowPos[i * 3 + 2] = sim.p[2];
      const lit = sim.linkAccent[li];
      gfx.flowAlpha[i] = Math.sin(Math.PI * ft) * (0.35 + lit * 0.65);
      gfx.flowAccent[i] = lit > 0.5 ? 1 : 0;
    }
    gfx.flowPosAttr.needsUpdate = true;
    gfx.flowAlphaAttr.needsUpdate = true;
    gfx.flowAccentAttr.needsUpdate = true;
    gfx.flowMat.uniforms.uPixelRatio.value = dpr;

    // Whole-system parallax.
    const px = inside ? ((pointer.x - rect.left) / rect.width - 0.5) * 2 : 0;
    const py = inside ? ((pointer.y - rect.top) / rect.height - 0.5) * 2 : 0;
    sim.rotY = damp(sim.rotY, px * 0.22 + Math.sin(t * 0.17) * 0.06, 2.4, dt);
    sim.rotX = damp(sim.rotX, py * 0.12 + 0.04, 2.4, dt);
    g.rotation.set(sim.rotX, sim.rotY, 0);
    g.updateMatrixWorld();
    if (dustRef.current) dustRef.current.rotation.y = t * 0.012;

    // Labels follow their nodes in screen space.
    for (const [id, n] of nodes) {
      const el = labelRefs.current[id];
      if (!el) continue;
      sim.tmp.copy(n.pos).applyMatrix4(g.matrixWorld).project(camera);
      const x = (sim.tmp.x * 0.5 + 0.5) * size.width;
      const y = (-sim.tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (id !== CORE_ID) el.style.opacity = (0.45 + 0.55 * clamp(n.dim.value)).toFixed(3);
    }
  });

  return (
    <>
      <points ref={dustRef} geometry={gfx.dustGeo} material={gfx.dustMat} frustumCulled={false} />
      <group ref={group}>
        <lineSegments geometry={gfx.linkGeo} material={gfx.linkMat} frustumCulled={false} />
        <lineSegments geometry={gfx.linkAccentGeo} material={gfx.linkAccentMat} frustumCulled={false} />
        <points ref={corePoints} geometry={gfx.coreGeo} material={gfx.coreMat} frustumCulled={false} />
        <points geometry={gfx.flowGeo} material={gfx.flowMat} frustumCulled={false} />
        <points geometry={gfx.satGeo} material={gfx.satMat} frustumCulled={false} />
      </group>
    </>
  );
}
