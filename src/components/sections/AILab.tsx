import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { CORE_ID, labNodes, pipelines, type PipelineId } from '@/data/aiLab';
import { labLayout, neighbours, projectLayout2D } from '@/lib/aiLabLayout';
import { budget } from '@/lib/device';
import { useUI } from '@/lib/store';
import { cn } from '@/lib/cn';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useElementSize } from '@/hooks/useElementSize';
import { PhysicsCanvas } from '@/components/PhysicsCanvas';
import { AILabFallback } from '@/components/fallbacks/AILabFallback';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RevealText } from '@/components/ui/RevealText';
import { PipelineVisualization } from './PipelineVisualization';

const loadScene = () => import('@/three/AILabScene');

/**
 * The AI Lab: an LLM core and the components that turn it into a system.
 * Activating a component (hover, focus or tap) shoves its neighbours, lights
 * its connections, sends particles along them and drives the pipeline below.
 */
export function AILab() {
  const compact = useIsMobile();
  const active = useUI((s) => s.aiActive);
  const setActive = useUI((s) => s.setAiActive);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLElement | null>>({});
  const size = useElementSize(stageRef);
  const [manualPipeline, setManualPipeline] = useState<PipelineId | null>(null);
  const coreCount = useMemo(() => budget({ high: 760, mid: 480, low: 300 }), []);

  useEffect(() => {
    if (!useUI.getState().aiActive) setActive(CORE_ID);
  }, [setActive]);

  useEffect(() => setManualPipeline(null), [active]);

  // Place labels from the 2D projection until (or unless) the WebGL scene takes over.
  useLayoutEffect(() => {
    if (!size.width) return;
    const { points } = projectLayout2D(labLayout(compact), size.width, size.height, compact);
    for (const [id, [x, y]] of Object.entries(points)) {
      const el = labelRefs.current[id];
      if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }, [size, compact]);

  const node = labNodes.find((n) => n.id === active) ?? labNodes[0];
  const pipelineId: PipelineId = manualPipeline ?? node.pipeline;
  const pipeline = pipelines[pipelineId];
  const activeStage = node.pipeline === pipelineId ? node.stage : -1;
  const nodeIndex = labNodes.indexOf(node) + 1;

  return (
    <section
      id="ai-lab"
      aria-labelledby="ai-lab-title"
      data-theme="dark"
      data-nav-theme="dark"
      className="section relative overflow-hidden bg-night text-bone"
    >
      <div className="shell">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <SectionLabel index="03">AI Lab</SectionLabel>
            <RevealText
              as="h2"
              id="ai-lab-title"
              text="Inside a modern AI application."
              emphasis={['application']}
              className="t-h1 mt-8 max-w-[14ch]"
            />
          </div>
          <p className="max-w-[42ch] text-[0.98rem] leading-relaxed text-bone/70 md:col-span-4 md:col-start-9">
            The model is one component. Everything around it exists to give it context and the ability to act. Hover —
            or tap — a component to see what it does and how information moves.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-12 lg:gap-6">
          <div ref={stageRef} className="relative h-[540px] sm:h-[600px] lg:col-span-8 lg:h-[min(70vh,660px)]">
            <PhysicsCanvas
              className="absolute inset-0"
              load={loadScene}
              sceneProps={{ compact, coreCount, labelRefs }}
              fallback={<AILabFallback compact={compact} />}
            />
            <div className="absolute inset-0" role="group" aria-label="AI system components">
              {labNodes.map((n) => {
                const isCore = n.id === CORE_ID;
                const on = n.id === active;
                return (
                  <button
                    key={n.id}
                    ref={(el) => {
                      labelRefs.current[n.id] = el;
                    }}
                    type="button"
                    aria-pressed={on}
                    aria-controls="lab-panel"
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(n.id)}
                    onFocus={() => setActive(n.id)}
                    onClick={() => setActive(n.id)}
                    data-cursor={on ? undefined : 'Inspect'}
                    className="group absolute left-0 top-0 h-0 w-0 will-transform"
                  >
                    <span
                      className={cn(
                        'absolute -translate-x-1/2 -translate-y-1/2 rounded-full',
                        isCore ? 'h-36 w-36' : 'h-12 w-12',
                      )}
                    />
                    <span
                      className={cn(
                        't-label absolute -translate-x-1/2 whitespace-nowrap transition-[color,top] duration-500',
                        isCore ? '-translate-y-1/2 text-[13px] tracking-[0.2em]' : on ? 'top-9' : 'top-5',
                        on ? 'text-accent' : 'text-bone/80 group-hover:text-bone',
                      )}
                    >
                      {n.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div id="lab-panel" aria-live="polite" className="flex flex-col lg:col-span-4 lg:pt-6">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={node.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="t-label text-accent">
                  {String(nodeIndex).padStart(2, '0')} / {String(labNodes.length).padStart(2, '0')} — Component
                </p>
                <h3 className="t-h3 mt-5">{node.title}</h3>
                <p className="mt-5 text-[1.05rem] leading-relaxed text-bone/85">{node.definition}</p>
                <p className="mt-4 text-[0.95rem] leading-relaxed text-ash">{node.detail}</p>
                <div className="mt-8 border-t border-[var(--line)] pt-5">
                  <p className="t-label text-ash">Connected to</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {neighbours(node.id).map((id) => {
                      const nb = labNodes.find((x) => x.id === id)!;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => setActive(id)}
                            className="t-label rounded-full border border-[var(--line-strong)] px-3 py-1.5 transition-colors hover:border-bone"
                          >
                            {nb.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </m.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-16 lg:mt-20">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="t-label text-ash">Information flow</p>
              <p className="mt-3 max-w-[48ch] text-[1.05rem] leading-relaxed text-bone/85">{pipeline.summary}</p>
            </div>
            <div
              className="t-label flex gap-1 self-start rounded-full border border-[var(--line)] p-1"
              role="group"
              aria-label="Pipeline"
            >
              {(Object.keys(pipelines) as PipelineId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={pipelineId === id}
                  onClick={() => setManualPipeline(id)}
                  className={cn(
                    'rounded-full px-4 py-1.5 transition-colors duration-300',
                    pipelineId === id ? 'bg-bone text-ink' : 'text-ash hover:text-bone',
                  )}
                >
                  {pipelines[id].label}
                </button>
              ))}
            </div>
          </div>
          <PipelineVisualization
            pipeline={pipeline}
            activeStage={activeStage}
            theme="dark"
            height={compact ? 170 : 200}
          />
        </div>
      </div>
    </section>
  );
}
