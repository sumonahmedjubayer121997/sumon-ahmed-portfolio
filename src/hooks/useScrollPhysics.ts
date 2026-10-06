import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { addTicker } from '@/lib/ticker';
import { scroll } from '@/lib/scroll';
import { clamp } from '@/lib/math';
import { createRectCache } from '@/lib/rectCache';
import { springs, stepSpring1D, type SpringConfig } from '@/physics/spring';
import { observeVisibility } from './useInView';

/**
 * - `through`: 0 when the element's top enters the viewport bottom, 1 when its bottom leaves the top.
 * - `pinned`:  0 when the top reaches the viewport top, 1 when the bottom reaches the viewport bottom (sticky scenes).
 * - `center`:  progress of the viewport's centre line through the element.
 */
export type ScrollMode = 'through' | 'pinned' | 'center';

export interface ScrollProgress {
  /** Spring-smoothed progress (0…1). This is what motion should read. */
  progress: number;
  /** Raw geometric progress. */
  raw: number;
  /** Velocity of the smoothed progress (units/s). */
  velocity: number;
  /** Page scroll velocity in px/s. */
  scrollVelocity: number;
  /** Element height in px (handy for mapping progress → px). */
  height: number;
}

export interface ScrollPhysicsOptions {
  mode?: ScrollMode;
  spring?: SpringConfig;
  /** Skip the spring (reduced motion). */
  immediate?: boolean;
  onUpdate?: (state: ScrollProgress) => void;
}

/**
 * Scroll-linked progress with inertia. Instead of binding animation to scrollY,
 * a spring chases the geometric progress, so fast scrolling produces more motion
 * and everything settles gently once the page stops.
 */
export function useScrollPhysics(ref: RefObject<HTMLElement | null>, options: ScrollPhysicsOptions = {}) {
  const { mode = 'through', spring = springs.scroll, immediate = false } = options;
  const state = useMemo<ScrollProgress>(() => ({ progress: 0, raw: 0, velocity: 0, scrollVelocity: 0, height: 0 }), []);
  const cb = useRef(options.onUpdate);
  cb.current = options.onUpdate;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = { value: 0, velocity: 0, target: 0 };
    let visible = false;
    let settled = false;
    let initialised = false;

    const cache = createRectCache(el);
    const measure = () => {
      const rect = cache.read();
      const vh = window.innerHeight;
      let raw: number;
      if (mode === 'pinned') raw = -rect.top / Math.max(1, rect.height - vh);
      else if (mode === 'center') raw = (vh * 0.5 - rect.top) / Math.max(1, rect.height);
      else raw = (vh - rect.top) / Math.max(1, rect.height + vh);
      state.raw = clamp(raw);
      state.height = rect.height;
    };

    const stopVisibility = observeVisibility(el, (v) => (visible = v), '25% 0px');
    const stopRead = addTicker(() => {
      if (!visible && settled) return;
      measure();
    }, 'read');

    const stopUpdate = addTicker((dt) => {
      if (!visible && settled) return;
      s.target = state.raw;
      if (immediate || !initialised) {
        s.value = s.target;
        s.velocity = 0;
        settled = true;
        initialised = true;
      } else {
        settled = stepSpring1D(s, spring, dt);
      }
      state.progress = s.value;
      state.velocity = s.velocity;
      state.scrollVelocity = scroll.velocity;
      cb.current?.(state);
    }, 'update');

    return () => {
      stopVisibility();
      stopRead();
      stopUpdate();
    };
  }, [ref, mode, spring, immediate, state]);

  return state;
}
