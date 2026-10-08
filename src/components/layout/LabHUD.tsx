import { useEffect, useRef } from 'react';
import { useUI } from '@/lib/store';
import { getQualityTier, supportsWebGL } from '@/lib/device';
import { heroTelemetry, labWorlds } from '@/lib/telemetry';
import { toggleLabMode } from '@/hooks/useShortcuts';

/**
 * Lab mode's instrument panel: frame rate and frame time measured from the
 * browser's own animation frames, quality tier, pixel ratio, WebGL, and live
 * counts from the simulations on the page. Text is written directly a few
 * times a second — no React renders while it runs.
 */
export default function LabHUD() {
  const on = useUI((s) => s.labMode && !s.reducedMotion);
  const fps = useRef<HTMLSpanElement>(null);
  const env = useRef<HTMLSpanElement>(null);
  const hero = useRef<HTMLSpanElement>(null);
  const worlds = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let frames = 0;
    let worst = 0;
    let last = performance.now();
    let windowStart = last;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      frames++;
      worst = Math.max(worst, dt);
      if (now - windowStart >= 500) {
        const rate = (frames * 1000) / (now - windowStart);
        if (fps.current)
          fps.current.textContent = `${rate.toFixed(0)} fps · ${(1000 / rate).toFixed(1)} ms avg · ${worst.toFixed(0)} ms worst`;
        if (env.current)
          env.current.textContent = `tier ${getQualityTier()} · dpr ${devicePixelRatio.toFixed(2)} · webgl ${supportsWebGL() ? 'on' : 'off'} · ${innerWidth}×${innerHeight}`;
        if (hero.current)
          hero.current.textContent = heroTelemetry.running
            ? `hero ${heroTelemetry.nodes} particles · ${heroTelemetry.links.toLocaleString('en-GB')} links · order ${heroTelemetry.order.toFixed(2)}`
            : 'hero simulation idle';
        if (worlds.current)
          worlds.current.textContent =
            [...labWorlds]
              .map(([name, read]) => {
                const w = read();
                return `${name.toLowerCase()} ${w.bodies} bodies · ${w.links} springs`;
              })
              .join('\n') || 'no physics stage on screen';
        frames = 0;
        worst = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  if (!on) return null;
  return (
    <aside
      aria-label="Lab mode"
      className="t-meta fixed bottom-4 left-4 z-[85] w-[min(360px,calc(100vw-32px))] rounded-[8px] border border-white/10 bg-night/90 p-4 text-[11px] leading-relaxed text-bone shadow-lg backdrop-blur"
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="t-label flex items-center gap-2 text-[10px] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Lab mode
        </span>
        <button type="button" onClick={toggleLabMode} className="t-label text-[10px] text-ash hover:text-bone">
          Exit (D)
        </button>
      </div>
      <p>
        <span ref={fps}>measuring…</span>
      </p>
      <p className="text-ash">
        <span ref={env} />
      </p>
      <p className="mt-2">
        <span ref={hero} />
      </p>
      <p className="whitespace-pre-line text-ash">
        <span ref={worlds} />
      </p>
      <p className="mt-2 border-t border-white/10 pt-2 text-ash">
        <span className="text-accent">→</span> velocity · <span className="text-bone">+</span> home · dotted = spring ·
        circle = collision radius
      </p>
    </aside>
  );
}
