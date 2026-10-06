import { useEffect, useRef } from 'react';
import { addTicker } from '@/lib/ticker';
import { pointer } from '@/lib/pointer';
import { createSpring1D, createSpring2D, springs, stepSpring1D, stepSpring2D } from '@/physics/spring';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Mode = 'default' | 'link' | 'label' | 'hidden';

const BUBBLE = 84;

/**
 * Two-body cursor: a dot on a stiff spring (precise) and a label bubble on a soft
 * spring (visible lag). The bubble stretches slightly along its velocity.
 * Only mounted for precise pointers without reduced-motion.
 *
 * Interactive elements opt in to a label with `data-cursor="View"`, or hide the
 * cursor with `data-cursor="none"` when they render their own follower.
 */
export function CustomCursor() {
  const reduced = useReducedMotion();
  const fine = useMediaQuery('(hover: hover) and (pointer: fine)');
  const enabled = fine && !reduced;

  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleBgRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const dotEl = dotRef.current;
    const bubbleEl = bubbleRef.current;
    const bgEl = bubbleBgRef.current;
    const labelEl = labelRef.current;
    const ringEl = ringRef.current;
    if (!enabled || !root || !dotEl || !bubbleEl || !bgEl || !labelEl || !ringEl) return;

    document.documentElement.classList.add('has-custom-cursor');

    const dot = createSpring2D(pointer.x, pointer.y);
    const bubble = createSpring2D(pointer.x, pointer.y);
    const bubbleScale = createSpring1D(0);
    const dotScale = createSpring1D(1);
    const ringScale = createSpring1D(0);
    const presence = createSpring1D(0);
    let mode: Mode = 'default';
    let placed = false;
    let idle = false;

    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest) return;
      const labelled = target.closest<HTMLElement>('[data-cursor]');
      const interactive = target.closest('a, button, [role="button"], label, summary, [data-cursor-link]');
      const field = target.closest('input, textarea, select, [contenteditable="true"]');
      root.dataset.theme = target.closest('[data-theme="dark"]') ? 'dark' : 'light';

      if (field || labelled?.dataset.cursor === 'none') mode = 'hidden';
      else if (labelled?.dataset.cursor) {
        mode = 'label';
        if (labelEl.textContent !== labelled.dataset.cursor) labelEl.textContent = labelled.dataset.cursor;
      } else if (interactive) mode = 'link';
      else mode = 'default';
    };
    document.addEventListener('pointerover', onOver);

    const stop = addTicker((dt) => {
      if (!placed && pointer.active) {
        dot.x = bubble.x = pointer.x;
        dot.y = bubble.y = pointer.y;
        placed = true;
      }
      dot.tx = bubble.tx = pointer.x;
      dot.ty = bubble.ty = pointer.y;
      const press = pointer.down ? 0.82 : 1;
      bubbleScale.target = (mode === 'label' ? 1 : 0) * press;
      dotScale.target = (mode === 'label' || mode === 'hidden' ? 0 : mode === 'link' ? 0.6 : 1) * press;
      ringScale.target = (mode === 'link' ? 1 : 0) * press;
      presence.target = pointer.active && pointer.type === 'mouse' ? 1 : 0;
      const settled = [
        stepSpring2D(dot, springs.cursor, dt),
        stepSpring2D(bubble, springs.lag, dt),
        stepSpring1D(bubbleScale, springs.scale, dt),
        stepSpring1D(dotScale, springs.scale, dt),
        stepSpring1D(ringScale, springs.scale, dt),
        stepSpring1D(presence, springs.gentle, dt),
      ].every(Boolean);
      // At rest: nothing to write, so no style invalidation this frame.
      if (settled && idle) return;
      idle = settled;

      const ds = Math.max(0, dotScale.value);
      dotEl.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) scale(${ds})`;
      dotEl.style.opacity = String(presence.value);
      const rs = Math.max(0, ringScale.value);
      ringEl.style.transform = `translate3d(${bubble.x}px, ${bubble.y}px, 0) scale(${rs})`;
      ringEl.style.opacity = String(presence.value * Math.min(1, rs * 1.5));

      // Subtle squash & stretch along the direction of travel.
      const speed = Math.hypot(bubble.vx, bubble.vy);
      const stretch = Math.min(speed / 5000, 0.16);
      const angle = Math.atan2(bubble.vy, bubble.vx);
      const bs = Math.max(0, bubbleScale.value);
      bubbleEl.style.transform = `translate3d(${bubble.x}px, ${bubble.y}px, 0)`;
      bgEl.style.transform = `rotate(${angle}rad) scale(${bs * (1 + stretch)}, ${bs * (1 - stretch)})`;
      labelEl.style.transform = `translate(-50%, -50%) scale(${bs})`;
      labelEl.style.opacity = String(Math.min(1, bs * 1.6) * presence.value);
      bgEl.style.opacity = String(presence.value);
    }, 'render');

    return () => {
      stop();
      document.removeEventListener('pointerover', onOver);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [enabled]);

  if (!enabled) return null;

  // Colours follow the section theme (ink on light, bone on dark) rather than a
  // blend mode, so the cursor never produces off-palette colours over accents.
  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]" data-theme="light">
      <div
        ref={ringRef}
        className="absolute -left-[18px] -top-[18px] h-9 w-9 rounded-full border border-ink will-transform dark:border-bone"
        style={{ opacity: 0 }}
      />
      <div ref={bubbleRef} className="absolute left-0 top-0 will-transform">
        <div
          ref={bubbleBgRef}
          className="absolute rounded-full bg-ink will-transform dark:bg-bone"
          style={{ width: BUBBLE, height: BUBBLE, left: -BUBBLE / 2, top: -BUBBLE / 2, transform: 'scale(0)' }}
        />
        <span
          ref={labelRef}
          className="t-label absolute left-0 top-0 whitespace-nowrap text-[10px] text-ivory dark:text-ink"
          style={{ opacity: 0 }}
        />
      </div>
      <div
        ref={dotRef}
        className="absolute -left-[3.5px] -top-[3.5px] h-[7px] w-[7px] rounded-full bg-ink will-transform dark:bg-bone"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
