import { useEffect, useRef, type RefObject } from 'react';
import { addTicker } from '@/lib/ticker';
import { pointer } from '@/lib/pointer';
import { scroll } from '@/lib/scroll';
import { createRectCache } from '@/lib/rectCache';
import { damp, smoothstep } from '@/lib/math';
import { createSpring2D, springs, stepSpring2D, type SpringConfig } from '@/physics/spring';
import { observeVisibility } from './useInView';

export interface PointerFieldOptions {
  /** Magnetic: fraction of the pointer offset to follow. Repulsion: max offset in px. */
  strength?: number;
  /** Reach, as a multiple of half the element's larger dimension. */
  radius?: number;
  spring?: SpringConfig;
  disabled?: boolean;
}

export type PointerFieldUpdate = (x: number, y: number, proximity: number) => void;

type FieldMode = 'attract' | 'repel';

/**
 * Shared engine for magnetic and repulsive elements. The *measured* element must
 * not be the one being transformed (measure a wrapper, move its child), otherwise
 * the element would chase its own displaced bounds.
 */
function usePointerField(
  ref: RefObject<HTMLElement | null>,
  onUpdate: PointerFieldUpdate,
  mode: FieldMode,
  { strength, radius = 1.8, spring = springs.magnetic, disabled = false }: PointerFieldOptions,
) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;
  const opts = useRef({ strength, radius, spring });
  opts.current = { strength, radius, spring };

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    let rect: DOMRect | null = null;
    let visible = false;
    let resting = true;
    let proximity = 0;
    let seenMove = -1;
    const cache = createRectCache(el, 600);
    const s = createSpring2D();

    const stopVisibility = observeVisibility(
      el,
      (v) => {
        visible = v;
        cache.invalidate();
      },
      '120px',
    );
    // Layout reads only when something could have changed: scroll, periodic refresh, first sight.
    const stopRead = addTicker(() => {
      if (visible) rect = cache.read();
    }, 'read');

    const stopRender = addTicker((dt) => {
      if (!visible || !rect) return;
      // Fully at rest and the pointer hasn't moved: nothing to do.
      if (resting && pointer.lastMove === seenMove && scroll.velocity === 0) return;
      seenMove = pointer.lastMove;
      const { strength: k, radius: r, spring: cfg } = opts.current;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      const d = Math.hypot(dx, dy) || 0.0001;
      const reach = Math.max(rect.width, rect.height) * 0.5 * r + 16;
      const influence = pointer.active && pointer.type === 'mouse' ? smoothstep(reach, reach * 0.5, d) : 0;

      if (mode === 'attract') {
        // distance → pull toward cursor, fading smoothly to zero at the edge of reach
        const gain = (k ?? 0.32) * influence;
        s.tx = dx * gain;
        s.ty = dy * gain;
      } else {
        const push = (k ?? 10) * influence * influence;
        s.tx = (-dx / d) * push;
        s.ty = (-dy / d) * push;
      }
      proximity = damp(proximity, influence, 12, dt);

      const settled = stepSpring2D(s, cfg, dt);
      if (settled && influence === 0) {
        if (!resting) {
          proximity = 0;
          cb.current(0, 0, 0);
          resting = true;
        }
        return;
      }
      resting = false;
      cb.current(s.x, s.y, proximity);
    }, 'render');

    return () => {
      stopVisibility();
      stopRead();
      stopRender();
    };
  }, [ref, mode, disabled]);
}

/** Element drifts toward a nearby pointer and springs home when it leaves. */
export function useMagneticInteraction(
  ref: RefObject<HTMLElement | null>,
  onUpdate: PointerFieldUpdate,
  options: PointerFieldOptions = {},
) {
  usePointerField(ref, onUpdate, 'attract', options);
}

/** Element gently moves out of the pointer's way (decorative elements only — never clickable ones). */
export function useCursorRepulsion(
  ref: RefObject<HTMLElement | null>,
  onUpdate: PointerFieldUpdate,
  options: PointerFieldOptions = {},
) {
  usePointerField(ref, onUpdate, 'repel', { spring: springs.gentle, ...options });
}
