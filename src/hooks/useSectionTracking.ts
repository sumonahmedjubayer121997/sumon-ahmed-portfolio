import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useUI } from '@/lib/store';
import { navItems } from '@/content';

/**
 * Tracks which section sits under the navigation bar (to switch its theme over
 * dark WebGL sections) and which nav section is in view (active indicator).
 * Runs only on scroll/resize, throttled to one measurement per frame.
 */
export function useSectionTracking() {
  const location = useLocation();
  const setNavTheme = useUI((s) => s.setNavTheme);
  const setActiveSection = useUI((s) => s.setActiveSection);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const probe = 32;
      let dark = false;
      document.querySelectorAll<HTMLElement>('[data-nav-theme="dark"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) dark = true;
      });
      setNavTheme(dark ? 'dark' : 'light');

      const line = window.innerHeight * 0.4;
      let active: string | null = null;
      for (const item of navItems) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) active = item.id;
      }
      setActiveSection(active);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    // Re-measure after the new route has painted.
    const timeout = window.setTimeout(measure, 60);
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [location.key, setNavTheme, setActiveSection]);
}
