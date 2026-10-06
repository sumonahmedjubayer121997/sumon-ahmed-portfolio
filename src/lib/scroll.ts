import { addTicker } from './ticker';
import { damp } from './math';

/**
 * Global scroll state with physical velocity. Native scrolling is never hijacked;
 * instead we derive a smoothed velocity that motion systems can respond to.
 */
export interface ScrollState {
  y: number;
  /** Smoothed scroll velocity in px/s (positive = scrolling down). */
  velocity: number;
  viewportH: number;
  viewportW: number;
}

export const scroll: ScrollState = {
  y: 0,
  velocity: 0,
  viewportH: 0,
  viewportW: 0,
};

let installed = false;
let unsubscribe: (() => void) | null = null;
let lastY = 0;
let lastEvent = 0;

function tick(dt: number) {
  const y = scroll.y;
  const raw = dt > 0 ? (y - lastY) / dt : 0;
  lastY = y;
  scroll.velocity = damp(scroll.velocity, raw, 10, dt);
  // Sleep once scrolling has stopped and velocity has decayed.
  if (performance.now() - lastEvent > 220 && Math.abs(scroll.velocity) < 1) {
    scroll.velocity = 0;
    unsubscribe?.();
    unsubscribe = null;
  }
}

export function installScroll() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const measure = () => {
    scroll.viewportH = window.innerHeight;
    scroll.viewportW = window.innerWidth;
  };
  measure();
  scroll.y = lastY = window.scrollY;
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener(
    'scroll',
    () => {
      // Scroll events fire before animation frames, so readers always see the current offset.
      scroll.y = window.scrollY;
      lastEvent = performance.now();
      if (!unsubscribe) {
        unsubscribe = addTicker(tick, 'read');
      }
    },
    { passive: true },
  );
}
