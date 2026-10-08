import { useEffect } from 'react';
import { ui } from '@/lib/store';
import { announce } from '@/lib/announce';

/** Turns Lab mode on or off (unavailable with reduced motion, which it would contradict). */
export function toggleLabMode() {
  const s = ui();
  if (s.reducedMotion) {
    announce('Lab mode needs motion, and your system asks for reduced motion.');
    return;
  }
  s.setLabMode(!s.labMode);
  announce(
    s.labMode ? 'Lab mode off.' : 'Lab mode on: physics overlays and live stats are shown. Press D to turn it off.',
  );
}

const typingIn = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/**
 * Site-wide keys: ⌘K / Ctrl+K toggles the command palette, "/" opens it, and
 * "D" toggles Lab mode. Plain keys are ignored while typing in a field.
 */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = ui();
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        s.setPaletteOpen(!s.paletteOpen);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || s.paletteOpen || typingIn(e.target)) return;
      if (e.key === '/') {
        e.preventDefault();
        s.setPaletteOpen(true);
      } else if (e.key === 'd' || e.key === 'D') {
        toggleLabMode();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
