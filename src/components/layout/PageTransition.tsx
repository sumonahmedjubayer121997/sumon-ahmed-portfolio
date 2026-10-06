import { useEffect, useRef, useState } from 'react';
import { useUI, type TransitionPhase } from '@/lib/store';
import { palette, rgba } from '@/lib/color';
import { TRANSITION_IN_MS, TRANSITION_OUT_MS } from '@/hooks/useTransitionNavigate';

interface Streak {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  accent: boolean;
}

/**
 * Physical page transition: a field of particles sweeps across the viewport while
 * a viewport-sized veil fades in over the old page (out phase), then the particles
 * lose momentum to friction and settle as the veil lifts off the new page (in phase).
 * Canvas2D — no extra WebGL context, and no full-page compositing layer.
 */
export function PageTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useUI((s) => s.transition);
  const [veilDark, setVeilDark] = useState(false);

  useEffect(() => {
    let raf = 0;

    const run = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      cancelAnimationFrame(raf);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.visibility = 'visible';

      const dark = useUI.getState().navTheme === 'dark';
      const ink = dark ? palette.bone : palette.ink;
      const count = w < 768 ? 70 : 150;
      const streaks: Streak[] = Array.from({ length: count }, () => ({
        x: -Math.random() * w * 0.9,
        y: Math.random() * h,
        vx: w * (2.6 + Math.random() * 2.2),
        vy: (Math.random() - 0.5) * 40,
        size: 1 + Math.random() * 1.6,
        accent: Math.random() < 0.05,
      }));

      const start = performance.now();
      let last = start;
      const total = TRANSITION_OUT_MS + TRANSITION_IN_MS;

      const frame = (now: number) => {
        const t = now - start;
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        ctx.clearRect(0, 0, w, h);

        const settling = t > TRANSITION_OUT_MS;
        // Friction ramps up in the in-phase: momentum bleeds away and particles settle.
        const friction = settling ? Math.exp(-11 * dt) : 1;
        const fade = settling ? Math.max(0, 1 - (t - TRANSITION_OUT_MS) / TRANSITION_IN_MS) : Math.min(1, t / 90);

        for (const s of streaks) {
          s.vx *= friction;
          s.vy *= friction;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const len = Math.min(s.vx * 0.035, 140);
          const color = s.accent ? palette.accent : ink;
          ctx.strokeStyle = rgba(color, (s.accent ? 0.9 : 0.5) * fade);
          ctx.lineWidth = s.size;
          ctx.beginPath();
          ctx.moveTo(s.x - len, s.y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }

        if (t < total) raf = requestAnimationFrame(frame);
        else {
          ctx.clearRect(0, 0, w, h);
          canvas.style.visibility = 'hidden';
        }
      };
      raf = requestAnimationFrame(frame);
    };

    const unsubscribe = useUI.subscribe((state, prev) => {
      if (state.transition === 'out' && prev.transition !== 'out') {
        setVeilDark(state.navTheme === 'dark');
        run();
      }
    });
    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
    };
  }, []);

  const veilOpacity: Record<TransitionPhase, number> = { idle: 0, out: 1, in: 0 };
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-[65] transition-opacity ease-out ${veilDark ? 'bg-night' : 'bg-ivory'}`}
        style={{ opacity: veilOpacity[phase], transitionDuration: phase === 'out' ? '240ms' : '420ms' }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
        style={{ visibility: 'hidden' }}
      />
    </>
  );
}
