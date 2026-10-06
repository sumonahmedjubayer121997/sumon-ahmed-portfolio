import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { scroll } from '@/lib/scroll';

/**
 * Viewport rect of the R3F canvas without calling getBoundingClientRect every
 * frame (which would force a synchronous layout after DOM writes). The page
 * offset is cached and refreshed on resize / layout changes; scroll is applied
 * arithmetically from the shared scroll state (reading window.scrollY here would
 * itself force layout). Not for canvases inside sticky containers.
 */
export function useCanvasRect() {
  const { gl } = useThree();
  const page = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const out = useRef({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 });

  useEffect(() => {
    const el = gl.domElement;
    const measure = () => {
      const r = el.getBoundingClientRect();
      scroll.y = window.scrollY;
      page.current = { left: r.left, top: r.top + scroll.y, width: r.width, height: r.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [gl]);

  return () => {
    const p = page.current;
    const o = out.current;
    o.left = p.left;
    o.top = p.top - scroll.y;
    o.width = p.width;
    o.height = p.height;
    o.right = o.left + p.width;
    o.bottom = o.top + p.height;
    return o;
  };
}
