import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useSpringPhysics } from '@/hooks/useSpringPhysics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';

/** Subtle 3D tilt toward the pointer on a spring; flattens when the pointer leaves. */
export function Tilt({ children, max = 5, className }: { children: ReactNode; max?: number; className?: string }) {
  const reduced = useReducedMotion();
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const { setTarget } = useSpringPhysics({ stiffness: 140, damping: 16, mass: 1 }, (s) => {
    if (inner.current)
      inner.current.style.transform = `perspective(1100px) rotateX(${s.y.toFixed(3)}deg) rotateY(${s.x.toFixed(3)}deg)`;
  });

  const move = (e: ReactPointerEvent) => {
    if (reduced || e.pointerType !== 'mouse' || !outer.current) return;
    const r = outer.current.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTarget(nx * max * 2, -ny * max * 2);
  };

  return (
    <div ref={outer} onPointerMove={move} onPointerLeave={() => setTarget(0, 0)} className={className}>
      <div ref={inner} className={cn('will-transform')} style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
}
