import { useEffect, useRef, type RefObject } from 'react';
import { AnimatePresence, m } from 'motion/react';
import type { Project } from '@/content';
import { addTicker } from '@/lib/ticker';
import { pointer } from '@/lib/pointer';
import { clamp } from '@/lib/math';
import { createRectCache } from '@/lib/rectCache';
import { createSpring1D, createSpring2D, stepSpring1D, stepSpring2D } from '@/physics/spring';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ProjectPreview } from '@/components/previews/ProjectPreview';
import { SwapArrow } from '@/components/ui/Arrow';

const CARD_W = 272;
const follow = { stiffness: 150, damping: 19, mass: 1.2 };

/**
 * A preview card that trails the cursor on a heavy spring and tilts with its
 * velocity, revealed when a project is hovered. Purely visual (pointer-events: none).
 */
export function PreviewFollower({
  project,
  containerRef,
  side = 'right',
}: {
  project: Project | null;
  containerRef: RefObject<HTMLElement | null>;
  /** Which side of the cursor the card sits on (keep it off the hovered text). */
  side?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  activeRef.current = !!project;
  const sideRef = useRef(side);
  if (project) sideRef.current = side; // keep the last side while fading out
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container) return;
    let rect: DOMRect | null = null;
    let placed = false;
    const s = createSpring2D();
    const vis = createSpring1D(0);

    const cache = createRectCache(container);
    const stopRead = addTicker(() => {
      if (activeRef.current || vis.value > 0.001) rect = cache.read();
    }, 'read');

    const stopRender = addTicker((dt) => {
      if (!rect) return;
      const active = activeRef.current;
      if (!active && vis.value <= 0.001 && vis.target === 0) return;
      const offset = sideRef.current === 'right' ? 36 : -36 - CARD_W;
      const x = clamp(pointer.x - rect.left + offset, 0, rect.width - CARD_W);
      const y = pointer.y - rect.top - 60;
      if (!placed || reduced) {
        s.x = s.tx = x;
        s.y = s.ty = y;
        s.vx = s.vy = 0;
        placed = true;
      }
      s.tx = x;
      s.ty = y;
      vis.target = active ? 1 : 0;
      if (reduced) {
        vis.value = vis.target;
      } else {
        stepSpring2D(s, follow, dt);
        stepSpring1D(vis, { stiffness: 220, damping: 24, mass: 1 }, dt);
      }
      if (!active && vis.value < 0.02) placed = false;
      const tilt = reduced ? 0 : clamp(s.vx * 0.006, -8, 8);
      const v = clamp(vis.value, 0, 1);
      el.style.opacity = String(v);
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${tilt}deg) scale(${0.92 + 0.08 * v})`;
    }, 'render');

    return () => {
      stopRead();
      stopRender();
    };
  }, [containerRef, reduced]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="preview-follower pointer-events-none absolute left-0 top-0 z-20 origin-top-left will-transform"
      style={{ width: CARD_W, opacity: 0 }}
    >
      <div className="border border-[var(--line)] bg-ivory/95 p-3 shadow-[0_24px_60px_-30px_rgba(21,20,19,0.35)] backdrop-blur-sm">
        <AnimatePresence mode="popLayout" initial={false}>
          {project && (
            <m.div
              key={project.slug}
              initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0.4 }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-paper/70 p-2">
                <ProjectPreview kind={project.preview} />
              </div>
              <div className="t-label mt-3 flex items-center justify-between">
                <span>
                  {project.index} — {project.type}
                </span>
                <span className="flex items-center gap-1.5 text-ink">
                  Open
                  <SwapArrow />
                </span>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
