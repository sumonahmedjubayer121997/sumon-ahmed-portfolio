import { scroll } from './scroll';

/**
 * getBoundingClientRect with a cache. Rects only change when the page scrolls or
 * layout changes, so re-measure on scroll movement or after `maxAge` ms — never
 * blindly every frame (each read can force a synchronous layout).
 */
export function createRectCache(el: Element, maxAge = 500) {
  let rect: DOMRect | null = null;
  let y = NaN;
  let t = 0;
  return {
    read(): DOMRect {
      const now = performance.now();
      if (!rect || y !== scroll.y || now - t > maxAge) {
        rect = el.getBoundingClientRect();
        y = scroll.y;
        t = now;
      }
      return rect;
    },
    invalidate() {
      rect = null;
    },
  };
}
