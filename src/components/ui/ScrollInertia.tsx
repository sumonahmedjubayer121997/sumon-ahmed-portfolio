import { useEffect, useRef, type ReactNode } from 'react';
import { addTicker } from '@/lib/ticker';
import { scroll } from '@/lib/scroll';
import { clamp } from '@/lib/math';
import { stepSpring1D } from '@/physics/spring';
import { observeVisibility } from '@/hooks/useInView';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const inertiaSpring = { stiffness: 110, damping: 13, mass: 1 };

/**
 * Children trail behind fast scrolling like objects with mass, then settle with a
 * slight overshoot once the page stops. At rest the offset is exactly zero, so
 * there is no permanent parallax.
 */
export function ScrollInertia({
  children,
  factor = 0.01,
  max = 16,
  className,
}: {
  children: ReactNode;
  factor?: number;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let visible = false;
    let settled = true;
    const s = { value: 0, velocity: 0, target: 0 };
    const stopVisibility = observeVisibility(el, (v) => (visible = v), '100px');
    const stop = addTicker((dt) => {
      if (!visible && settled) return;
      s.target = clamp(scroll.velocity * factor, -max, max);
      const wasSettled = settled;
      settled = stepSpring1D(s, inertiaSpring, dt) && s.target === 0;
      if (settled && wasSettled) return;
      el.style.transform = s.value === 0 ? '' : `translate3d(0, ${s.value.toFixed(2)}px, 0)`;
    }, 'render');
    return () => {
      stopVisibility();
      stop();
      el.style.transform = '';
    };
  }, [factor, max, reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
