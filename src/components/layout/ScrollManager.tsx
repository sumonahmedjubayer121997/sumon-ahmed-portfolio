import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * Scroll restoration for the SPA: hash targets on arrival, saved positions on
 * back/forward, top of page otherwise.
 */
export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const currentKey = useRef(location.key);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const save = () => positions.current.set(currentKey.current, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;
    let raf = 0;
    const started = performance.now();
    // Sections below the fold may render a few frames later (time-sliced), so
    // targets are retried until they exist — for at most two seconds.
    const retry = (attempt: () => boolean) => {
      const step = () => {
        if (attempt() || performance.now() - started > 2000) return;
        raf = requestAnimationFrame(step);
      };
      step();
    };

    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      retry(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ block: 'start' });
        return !!el;
      });
    } else if (navigationType === 'POP' && positions.current.has(location.key)) {
      const y = positions.current.get(location.key)!;
      retry(() => {
        const reachable = document.documentElement.scrollHeight - window.innerHeight >= y - 1;
        window.scrollTo(0, y);
        return reachable;
      });
    } else {
      window.scrollTo(0, 0);
    }
    return () => cancelAnimationFrame(raf);
  }, [location.key, location.hash, navigationType]);

  return null;
}
