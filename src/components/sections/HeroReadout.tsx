import { useEffect, useRef } from 'react';
import { heroTelemetry } from '@/lib/telemetry';

function stateLabel() {
  const { order, disorder, excitation, running } = heroTelemetry;
  if (!running) return 'STATIC';
  if (excitation > 0.04) return 'PERTURBED';
  if (order < 0.05) return 'DISPERSED';
  if (disorder > 0.22 || order < 0.95) return 'ORGANISING';
  return 'STRUCTURED';
}

/**
 * Live instrument readout for the hero simulation. Polls the scene's telemetry
 * a few times per second and writes text nodes directly.
 */
export function HeroReadout() {
  const nodes = useRef<HTMLSpanElement>(null);
  const links = useRef<HTMLSpanElement>(null);
  const order = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const state = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      const t = heroTelemetry;
      if (nodes.current) nodes.current.textContent = t.running ? String(t.nodes) : '—';
      if (links.current) links.current.textContent = t.running ? t.links.toLocaleString('en-GB') : '—';
      const entropy = t.running ? Math.max(0, Math.min(1, t.disorder * 0.7 + (1 - t.order) * 0.3)) : 0;
      if (order.current) order.current.textContent = t.running ? entropy.toFixed(2) : '—';
      if (bar.current) bar.current.style.transform = `scaleX(${t.running ? entropy : 0})`;
      if (state.current) state.current.textContent = stateLabel();
    };
    update();
    const id = window.setInterval(update, 160);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="t-label grid w-full max-w-[260px] gap-1.5 text-[10px] text-muted" aria-hidden="true">
      <div className="flex items-center justify-between text-ink">
        <span>System 01</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-accent [animation:blink_2.4s_ease-in-out_infinite]" />
          <span ref={state}>—</span>
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          nodes{' '}
          <span ref={nodes} className="text-ink">
            —
          </span>
        </span>
        <span>
          links{' '}
          <span ref={links} className="text-ink">
            —
          </span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span>entropy</span>
        <span className="relative h-px flex-1 bg-[var(--line-strong)]">
          <span
            ref={bar}
            className="absolute inset-0 origin-left bg-ink transition-transform duration-200"
            style={{ transform: 'scaleX(0)' }}
          />
        </span>
        <span ref={order} className="w-8 text-right text-ink">
          —
        </span>
      </div>
    </div>
  );
}
