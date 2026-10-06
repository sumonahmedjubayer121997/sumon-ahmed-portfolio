import { useCallback, useEffect, useMemo, useRef } from 'react';
import { addTicker } from '@/lib/ticker';
import { createSpring2D, stepSpring2D, type Spring2D, type SpringConfig } from '@/physics/spring';

export type SpringUpdate = (state: Readonly<Spring2D>) => void;

/**
 * A 2D spring that animates toward a target and writes results through `onUpdate`
 * (typically straight to `style.transform`). It sleeps when settled, so idle
 * springs cost nothing, and never triggers React re-renders.
 */
export function useSpringPhysics(config: SpringConfig, onUpdate: SpringUpdate) {
  const state = useMemo(() => createSpring2D(), []);
  const cfgRef = useRef(config);
  const cbRef = useRef(onUpdate);
  cfgRef.current = config;
  cbRef.current = onUpdate;
  const stopRef = useRef<(() => void) | null>(null);

  const wake = useCallback(() => {
    if (stopRef.current) return;
    stopRef.current = addTicker((dt) => {
      const settled = stepSpring2D(state, cfgRef.current, dt);
      cbRef.current(state);
      if (settled) {
        stopRef.current?.();
        stopRef.current = null;
      }
    }, 'render');
  }, [state]);

  const setTarget = useCallback(
    (x: number, y: number) => {
      if (x === state.tx && y === state.ty) return;
      state.tx = x;
      state.ty = y;
      wake();
    },
    [state, wake],
  );

  /** Jump without animation (e.g. initial placement or reduced motion). */
  const snap = useCallback(
    (x: number, y: number) => {
      state.x = state.tx = x;
      state.y = state.ty = y;
      state.vx = state.vy = 0;
      cbRef.current(state);
    },
    [state],
  );

  /** Add instantaneous velocity — a physical "kick". */
  const impulse = useCallback(
    (vx: number, vy: number) => {
      state.vx += vx;
      state.vy += vy;
      wake();
    },
    [state, wake],
  );

  useEffect(
    () => () => {
      stopRef.current?.();
      stopRef.current = null;
    },
    [],
  );

  return { state, setTarget, snap, impulse };
}
