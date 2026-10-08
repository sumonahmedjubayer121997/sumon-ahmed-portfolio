import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { SceneProps } from '@/components/PhysicsCanvas';
import { groupColor, groupOf, type MapGroup, type MapPoint } from '@/content/map';
import { palette } from '@/lib/color';
import { pointer } from '@/lib/pointer';
import { createLinesMaterial, dynamicAttribute, vec3 } from './shaders';
import { SceneCanvas } from './SceneCanvas';
import { useCanvasRect } from './useCanvasRect';

export interface EmbeddingMapSceneProps {
  points: MapPoint[];
  visible: Record<MapGroup, boolean>;
  /** Pinned passage (from a click or the list). */
  selected: number | null;
  /** Hovered passage changed (null = none). */
  onHover: (index: number | null) => void;
}

const CAM_Z = 4.4;
const SCALE = 1.35;
/** Resting spin, rad/s; dragging adds momentum that decays back to it. */
const SPIN = 0.09;

export default function EmbeddingMapScene({ active, ...props }: EmbeddingMapSceneProps & SceneProps) {
  return (
    <SceneCanvas active={active} camera={{ fov: 40, position: [0, 0, CAM_Z], near: 0.1, far: 50 }}>
      <MapGraph {...props} />
    </SceneCanvas>
  );
}

/** Round points with per-point colour, size and alpha; `aRing` adds a halo for the pinned point. */
function createMapPointsMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: { uPixelRatio: { value: 1 }, uCamZ: { value: CAM_Z } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aAlpha;
      attribute float aRing;
      uniform float uPixelRatio;
      uniform float uCamZ;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vRing;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio * (uCamZ / max(0.5, -mv.z));
        vColor = aColor;
        vAlpha = aAlpha;
        vRing = aRing;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vRing;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = 1.0 - smoothstep(mix(0.42, 0.22, vRing), mix(0.5, 0.26, vRing), d);
        float ring = vRing * smoothstep(0.38, 0.41, d) * (1.0 - smoothstep(0.46, 0.5, d));
        float a = max(core, ring) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });
}

function MapGraph({ points, visible, selected, onHover }: EmbeddingMapSceneProps) {
  const { camera, gl } = useThree();
  const canvasRect = useCanvasRect();
  const group = useRef<THREE.Group>(null);
  const n = points.length;

  const home = useMemo(
    () => points.map((p) => new THREE.Vector3(p.p[0] * SCALE, p.p[1] * SCALE, p.p[2] * SCALE)),
    [points],
  );

  // Every nearest-neighbour pair once.
  const pairs = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<[number, number, number]> = [];
    points.forEach((p, i) =>
      p.n.forEach(([j, s]) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push([i, j, s]);
        }
      }),
    );
    return out;
  }, [points]);

  const pointsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    home.forEach((h, i) => {
      pos.set([h.x, h.y, h.z], i * 3);
      col.set(vec3(groupColor(groupOf(points[i].kind))).toArray(), i * 3);
    });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', dynamicAttribute(new Float32Array(n).fill(9), 1));
    g.setAttribute('aAlpha', dynamicAttribute(new Float32Array(n).fill(0.85), 1));
    g.setAttribute('aRing', dynamicAttribute(new Float32Array(n), 1));
    return g;
  }, [n, home, points]);

  const linesGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(pairs.length * 6);
    pairs.forEach(([i, j], k) => pos.set([home[i].x, home[i].y, home[i].z, home[j].x, home[j].y, home[j].z], k * 6));
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aAlpha', dynamicAttribute(new Float32Array(pairs.length * 2), 1));
    return g;
  }, [pairs, home]);

  const pointsMat = useMemo(createMapPointsMaterial, []);
  const lineMat = useMemo(() => createLinesMaterial({ color: palette.ink, opacity: 1 }), []);
  const hotMat = useMemo(() => createLinesMaterial({ color: palette.accent, opacity: 1 }), []);
  const hotGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', dynamicAttribute(new Float32Array(3 * 6), 3));
    g.setAttribute('aAlpha', dynamicAttribute(new Float32Array(3 * 2).fill(0.9), 1));
    g.setDrawRange(0, 0);
    return g;
  }, []);

  useEffect(
    () => () => {
      [pointsGeo, linesGeo, hotGeo].forEach((g) => g.dispose());
      [pointsMat, lineMat, hotMat].forEach((m) => m.dispose());
    },
    [pointsGeo, linesGeo, hotGeo, pointsMat, lineMat, hotMat],
  );

  const state = useRef({
    yaw: 0.4,
    pitch: -0.18,
    velYaw: SPIN,
    velPitch: 0,
    dragging: false,
    wasDown: false,
    lastX: 0,
    lastY: 0,
    hovered: -1,
    frame: 0,
  });
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    const r = canvasRect();
    const inside =
      pointer.active && pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;

    // Drag to turn, with momentum that settles back to a slow spin.
    if (pointer.down && !s.wasDown && inside) {
      s.dragging = true;
      s.lastX = pointer.x;
      s.lastY = pointer.y;
    }
    if (!pointer.down) s.dragging = false;
    s.wasDown = pointer.down;
    if (s.dragging) {
      const dx = pointer.x - s.lastX;
      const dy = pointer.y - s.lastY;
      s.lastX = pointer.x;
      s.lastY = pointer.y;
      s.velYaw = (dx * 0.006) / Math.max(dt, 1 / 120);
      s.velPitch = (dy * 0.004) / Math.max(dt, 1 / 120);
    } else {
      const k = 1 - Math.exp(-2.4 * dt);
      s.velYaw += (SPIN - s.velYaw) * k;
      s.velPitch += (0 - s.velPitch) * k;
    }
    s.yaw += s.velYaw * dt;
    s.pitch = Math.max(-0.9, Math.min(0.9, s.pitch + s.velPitch * dt));
    g.rotation.set(s.pitch, s.yaw, 0);
    g.updateMatrixWorld();

    // Hover: the nearest visible point on screen within 16 px. A press keeps the
    // current hover (so a click can pin it); a drag clears it once it moves.
    let hovered = s.dragging && pointer.down ? s.hovered : -1;
    if (inside && !pointer.down) {
      let best = 16 * 16;
      for (let i = 0; i < n; i++) {
        if (!visible[groupOf(points[i].kind)]) continue;
        tmp.copy(home[i]).applyMatrix4(g.matrixWorld).project(camera);
        const sx = r.left + ((tmp.x + 1) / 2) * r.width;
        const sy = r.top + ((1 - tmp.y) / 2) * r.height;
        const d = (sx - pointer.x) ** 2 + (sy - pointer.y) ** 2;
        if (d < best) {
          best = d;
          hovered = i;
        }
      }
    }
    if (hovered !== s.hovered) {
      s.hovered = hovered;
      onHoverRef.current(hovered < 0 ? null : hovered);
    }

    // Emphasis: the active point (hovered, else pinned) and its neighbours.
    const focus = hovered >= 0 ? hovered : selected;
    const near = new Set(focus === null ? [] : points[focus].n.map(([j]) => j));
    const size = pointsGeo.getAttribute('aSize') as THREE.BufferAttribute;
    const alpha = pointsGeo.getAttribute('aAlpha') as THREE.BufferAttribute;
    const ring = pointsGeo.getAttribute('aRing') as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      const show = visible[groupOf(points[i].kind)];
      const isFocus = i === focus;
      size.setX(i, isFocus ? 30 : near.has(i) ? 13 : 9);
      alpha.setX(i, !show ? 0 : focus === null || isFocus || near.has(i) ? 0.9 : 0.35);
      ring.setX(i, isFocus && i === selected ? 1 : 0);
    }
    size.needsUpdate = alpha.needsUpdate = ring.needsUpdate = true;
    pointsMat.uniforms.uPixelRatio.value = gl.getPixelRatio();

    const la = linesGeo.getAttribute('aAlpha') as THREE.BufferAttribute;
    pairs.forEach(([i, j, sim], k) => {
      const show = visible[groupOf(points[i].kind)] && visible[groupOf(points[j].kind)];
      const a = show ? (focus === null ? 0.06 + (sim - 0.4) * 0.25 : 0.04) : 0;
      la.setX(k * 2, a);
      la.setX(k * 2 + 1, a);
    });
    la.needsUpdate = true;

    // Accent lines from the focus to its nearest neighbours.
    const hp = hotGeo.getAttribute('position') as THREE.BufferAttribute;
    if (focus !== null) {
      points[focus].n.forEach(([j], k) => {
        hp.setXYZ(k * 2, home[focus].x, home[focus].y, home[focus].z);
        hp.setXYZ(k * 2 + 1, home[j].x, home[j].y, home[j].z);
      });
      hp.needsUpdate = true;
      hotGeo.setDrawRange(0, points[focus].n.length * 2);
    } else hotGeo.setDrawRange(0, 0);
  });

  return (
    <group ref={group}>
      <lineSegments geometry={linesGeo} material={lineMat} />
      <lineSegments geometry={hotGeo} material={hotMat} />
      <points geometry={pointsGeo} material={pointsMat} />
    </group>
  );
}
