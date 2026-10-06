import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop-class layout with a precise pointer: enables hover physics. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px) and (hover: hover) and (pointer: fine)');

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
