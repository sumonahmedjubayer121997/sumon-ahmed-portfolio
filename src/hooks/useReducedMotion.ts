import { useEffect } from 'react';
import { useUI } from '@/lib/store';
import { prefersReducedMotion } from '@/lib/device';

/** Keeps the store in sync with the OS-level reduced-motion preference. */
export function useReducedMotionSync() {
  const setReducedMotion = useUI((s) => s.setReducedMotion);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      const reduced = prefersReducedMotion();
      setReducedMotion(reduced);
      document.documentElement.dataset.motion = reduced ? 'reduce' : 'full';
    };
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [setReducedMotion]);
}

export const useReducedMotion = () => useUI((s) => s.reducedMotion);
