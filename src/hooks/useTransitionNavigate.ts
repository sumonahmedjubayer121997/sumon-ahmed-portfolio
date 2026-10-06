import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ui } from '@/lib/store';

/** Out phase (content fades, particles sweep) and in phase (particles settle, content appears). */
export const TRANSITION_OUT_MS = 300;
export const TRANSITION_IN_MS = 360;

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: ui().reducedMotion ? 'auto' : 'smooth', block: 'start' });
  return true;
}

/**
 * Navigates with the physical page transition. Same-page hash links simply scroll.
 * Total transition time stays under ~700ms; reduced motion navigates instantly.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to: string) => {
      const [rawPath, hash] = to.split('#');
      const path = rawPath || location.pathname;

      if (path === location.pathname) {
        if (hash) scrollToId(hash);
        else window.scrollTo({ top: 0, behavior: ui().reducedMotion ? 'auto' : 'smooth' });
        return;
      }

      const state = ui();
      if (state.transition !== 'idle') return;
      if (state.reducedMotion) {
        navigate(to);
        return;
      }
      state.setTransition('out');
      window.setTimeout(() => {
        navigate(to);
        ui().setTransition('in');
      }, TRANSITION_OUT_MS);
      window.setTimeout(() => ui().setTransition('idle'), TRANSITION_OUT_MS + TRANSITION_IN_MS);
    },
    [navigate, location.pathname],
  );
}
