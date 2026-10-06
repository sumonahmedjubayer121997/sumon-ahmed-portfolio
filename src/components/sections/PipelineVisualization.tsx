import { useEffect, useRef } from 'react';
import type { Pipeline } from '@/data/aiLab';
import { PipelineEngine } from '@/lib/pipelineEngine';
import { addTicker } from '@/lib/ticker';
import { palette } from '@/lib/color';
import { cn } from '@/lib/cn';
import { useElementSize } from '@/hooks/useElementSize';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { observeVisibility } from '@/hooks/useInView';

export interface PipelineVisualizationProps {
  pipeline: Pipeline;
  /** Stage to highlight (-1 for none). */
  activeStage?: number;
  theme?: 'dark' | 'light';
  className?: string;
  height?: number;
}

/**
 * Animated explanation of an AI pipeline (Canvas2D — no WebGL context needed).
 * Stage labels are real text below the canvas, so the content is readable
 * without the animation.
 */
export function PipelineVisualization({
  pipeline,
  activeStage = -1,
  theme = 'dark',
  className,
  height = 190,
}: PipelineVisualizationProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(wrapRef);
  const reduced = useReducedMotion();
  const activeRef = useRef(activeStage);
  activeRef.current = activeStage;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !wrap || !ctx || !size.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = { fg: theme === 'dark' ? palette.bone : palette.ink, accent: palette.accent };
    const engine = new PipelineEngine(pipeline, size.width, height, size.width < 640 ? 140 : 240);
    engine.prewarm(12);
    engine.draw(ctx, colors, activeRef.current);
    if (reduced) return;

    let visible = false;
    let lastActive = activeRef.current;
    const stopVisibility = observeVisibility(wrap, (v) => (visible = v), '50px');
    const stop = addTicker((dt) => {
      if (!visible) {
        // Keep the static frame in sync with selection changes even while paused.
        if (lastActive !== activeRef.current) engine.draw(ctx, colors, activeRef.current);
        lastActive = activeRef.current;
        return;
      }
      engine.step(dt);
      engine.draw(ctx, colors, activeRef.current);
      lastActive = activeRef.current;
    }, 'render');
    return () => {
      stopVisibility();
      stop();
    };
  }, [pipeline, size.width, height, theme, reduced]);

  const n = pipeline.stages.length;
  return (
    <figure className={className}>
      <div ref={wrapRef} className="relative w-full" style={{ height }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      </div>
      <ol className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-label={pipeline.label}>
        {pipeline.stages.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === activeStage ? 'step' : undefined}
            className={cn(
              'border-t pt-3 pr-2 transition-colors duration-500',
              i === activeStage ? 'border-accent' : 'border-[var(--line)]',
            )}
          >
            <span
              className={cn(
                't-label block text-[10px]',
                i === activeStage ? 'text-accent-ink dark:text-accent' : 'text-muted dark:text-ash',
              )}
            >
              0{i + 1}
            </span>
            <span className="t-label mt-1 block text-[10px] sm:text-[11px]">{s.label}</span>
            <span className="t-meta mt-1 hidden text-[11px] text-muted sm:block dark:text-ash">{s.caption}</span>
          </li>
        ))}
      </ol>
      <figcaption className="sr-only">
        {pipeline.label}: {pipeline.stages.map((s) => s.label).join(' → ')}. {pipeline.summary}
      </figcaption>
    </figure>
  );
}
