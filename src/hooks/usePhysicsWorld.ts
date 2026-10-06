import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { addTicker } from '@/lib/ticker';
import { pointer } from '@/lib/pointer';
import { scroll } from '@/lib/scroll';
import { createRectCache } from '@/lib/rectCache';
import type { Body } from '@/physics/body';
import type { PhysicsWorld } from '@/physics/world';
import { observeVisibility } from './useInView';

export interface PhysicsStageOptions<T> {
  enabled: boolean;
  /** Apply per-frame forces / state before integration. */
  beforeStep?: (world: PhysicsWorld<T>, dt: number, time: number) => void;
  /** Write transforms / draw. Called after integration. */
  render: (world: PhysicsWorld<T>, dt: number, time: number) => void;
  /** Scroll velocity → inertial force. Objects lag behind fast scrolling, then settle. */
  scrollInertia?: number;
}

const DRAG_THRESHOLD = 6;

/**
 * Binds a PhysicsWorld to a DOM stage: maps the global pointer into stage space,
 * runs the world on the shared ticker while visible, sleeps when at rest, and
 * provides a drag controller that distinguishes clicks from drags.
 */
export function usePhysicsWorld<T>(
  world: PhysicsWorld<T>,
  stageRef: RefObject<HTMLElement | null>,
  options: PhysicsStageOptions<T>,
) {
  const opts = useRef(options);
  opts.current = options;
  const rectRef = useRef<DOMRect | null>(null);

  const drag = useMemo(() => {
    let pending: Body<T> | null = null;
    let startX = 0;
    let startY = 0;
    let dragged = false;
    let suppressClickUntil = 0;
    return {
      onPointerDown(e: ReactPointerEvent, body: Body<T>) {
        if (e.button !== 0) return;
        pending = body;
        startX = e.clientX;
        startY = e.clientY;
        dragged = false;
      },
      /** Promote a pending press to a drag once the pointer travels far enough. */
      update(localX: number, localY: number) {
        if (!pending || world.dragged) return;
        if (!pointer.down) {
          pending = null;
          return;
        }
        if (Math.hypot(pointer.x - startX, pointer.y - startY) > DRAG_THRESHOLD) {
          world.startDrag(pending, localX, localY);
          dragged = true;
          document.documentElement.dataset.dragging = 'true';
        }
      },
      release() {
        pending = null;
        if (world.dragged) {
          world.endDrag();
          delete document.documentElement.dataset.dragging;
          if (dragged) suppressClickUntil = performance.now() + 250;
        }
      },
      /** Call from onClick: true if this click ended a drag and should be ignored. */
      shouldSuppressClick() {
        return performance.now() < suppressClickUntil;
      },
    };
  }, [world]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !options.enabled) return;

    let visible = false;
    let idleFrames = 0;
    let time = 0;
    const stopVisibility = observeVisibility(stage, (v) => (visible = v), '80px');
    const onUp = () => drag.release();
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const cache = createRectCache(stage);
    const stopRead = addTicker(() => {
      if (visible) rectRef.current = cache.read();
    }, 'read');

    const stopUpdate = addTicker((dt) => {
      const rect = rectRef.current;
      if (!visible || !rect) return;
      time += dt;
      const lx = pointer.x - rect.left;
      const ly = pointer.y - rect.top;
      const inside = pointer.active && lx > -60 && ly > -60 && lx < rect.width + 60 && ly < rect.height + 60;
      world.pointer.x = lx;
      world.pointer.y = ly;
      world.pointer.active = inside || !!world.dragged;
      world.pointer.down = pointer.down;
      world.gravity.y = scroll.velocity * (opts.current.scrollInertia ?? 0);
      drag.update(lx, ly);

      // Sleep when nothing is happening.
      const busy = world.pointer.active || world.dragged || Math.abs(scroll.velocity) > 2;
      if (!busy && idleFrames > 90) return;

      opts.current.beforeStep?.(world, dt, time);
      const energy = world.update(dt);
      opts.current.render(world, dt, time);
      idleFrames = busy || energy > 0.5 ? 0 : idleFrames + 1;
    }, 'update');

    // First paint, even before any interaction.
    opts.current.render(world, 0, 0);

    return () => {
      stopVisibility();
      stopRead();
      stopUpdate();
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      drag.release();
    };
  }, [world, stageRef, options.enabled, drag]);

  return { drag, rectRef };
}
