import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * Scroll restoration for the SPA: hash targets on arrival, saved positions on
 * back/forward, top of page otherwise.
 *
 * After client-side navigation it also moves focus to the new page's <h1> and
 * announces the page title, as a full page load would for screen-reader and
 * keyboard users. Not on first load, and not for in-page hash jumps.
 */
export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const currentKey = useRef(location.key);
  const lastPath = useRef(location.pathname);
  const [announcement, setAnnouncement] = useState('');

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

  useEffect(() => {
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;
    if (location.hash) return;
    let raf = 0;
    const started = performance.now();
    // Next frame: the page's own effects (document title) have run by then.
    const step = () => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
        setAnnouncement(document.title);
      } else if (performance.now() - started < 2000) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.hash]);

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </p>
  );
}
