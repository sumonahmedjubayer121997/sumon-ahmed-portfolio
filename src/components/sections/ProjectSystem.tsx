import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { concepts, projects, type Concept, type Project } from '@/content';
import { cn } from '@/lib/cn';
import { palette, rgba } from '@/lib/color';
import { createRandom } from '@/lib/random';
import { flowAngle } from '@/physics/noise';
import { PhysicsWorld } from '@/physics/world';
import type { Body } from '@/physics/body';
import { usePhysicsWorld } from '@/hooks/usePhysicsWorld';
import { useElementSize } from '@/hooks/useElementSize';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RevealText } from '@/components/ui/RevealText';
import { ConceptNode, ProjectNode } from './ProjectNode';
import { ProjectIndex } from './ProjectIndex';
import { PreviewFollower } from './PreviewFollower';

type NodeData = { kind: 'concept'; concept: Concept } | { kind: 'project'; project: Project };

const BASE_REPULSION = { concept: 900, project: 520 };
const DUST = 150;

export function ProjectSystem() {
  const isDesktop = useIsDesktop();
  const [view, setView] = useState<'system' | 'index'>('system');
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const showSystem = isDesktop && view === 'system';
  const hoveredProject = projects.find((p) => p.slug === hovered) ?? null;

  return (
    <section id="work" aria-labelledby="work-title" className="section relative">
      <div className="shell">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <SectionLabel index="01">Selected work</SectionLabel>
            <RevealText
              as="h2"
              id="work-title"
              text="Systems, not screenshots."
              emphasis={['screenshots']}
              className="t-h1 mt-8"
            />
          </div>
          <div className="flex flex-col gap-6 md:col-span-4">
            <p className="max-w-[40ch] text-[0.98rem] leading-relaxed text-ink-2">
              Four projects across machine learning, retrieval and the web — connected the way the ideas are.
              {isDesktop && view === 'system' && ' Drag a node; its neighbours feel it.'}
            </p>
            {isDesktop && (
              <div
                className="t-label flex gap-1 self-start rounded-full border border-[var(--line)] p-1"
                role="group"
                aria-label="Project view"
              >
                {(['system', 'index'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={cn(
                      'rounded-full px-4 py-1.5 transition-colors duration-300',
                      view === v ? 'bg-ink text-ivory' : 'text-muted hover:text-ink',
                    )}
                  >
                    {v === 'system' ? 'System' : 'Index'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div ref={containerRef} className="relative mt-16 md:mt-20">
          {showSystem ? (
            <SystemStage hovered={hovered} onHover={setHovered} />
          ) : (
            <ProjectIndex onHover={isDesktop ? setHovered : undefined} />
          )}
          {isDesktop && (
            <PreviewFollower
              project={hoveredProject}
              containerRef={containerRef}
              side={showSystem && hoveredProject?.position.align === 'left' ? 'left' : 'right'}
            />
          )}
        </div>
      </div>
    </section>
  );
}

interface Dust {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  hx: Float32Array;
  hy: Float32Array;
  seed: Float32Array;
}

function SystemStage({ hovered, onHover }: { hovered: string | null; onHover: (slug: string | null) => void }) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeEls = useRef(new Map<string, HTMLDivElement>());
  const size = useElementSize(stageRef);
  const hoveredId = useRef<string | null>(null);
  hoveredId.current = hovered ? `p:${hovered}` : null;
  const placed = useRef(false);

  const world = useMemo(() => {
    const w = new PhysicsWorld<NodeData>({
      pointerRadius: 170,
      collisionPadding: 14,
      dragStiffness: 420,
      dragDamping: 30,
    });
    for (const c of concepts) {
      w.add({
        id: `c:${c.id}`,
        x: 0,
        y: 0,
        radius: 20,
        mass: 0.7,
        springStrength: 28,
        friction: 5,
        data: { kind: 'concept', concept: c },
      });
    }
    for (const p of projects) {
      w.add({
        id: `p:${p.slug}`,
        x: 0,
        y: 0,
        radius: 58,
        mass: 1.6,
        springStrength: 15,
        friction: 4.4,
        data: { kind: 'project', project: p },
      });
    }
    return w;
  }, []);

  const dust = useMemo<Dust>(() => {
    const mk = () => new Float32Array(DUST);
    return { x: mk(), y: mk(), vx: mk(), vy: mk(), hx: mk(), hy: mk(), seed: mk() };
  }, []);

  // Layout: homes, links and dust scale with the stage.
  useLayoutEffect(() => {
    const { width: W, height: H } = size;
    if (!W || !H) return;
    const first = !placed.current;
    world.links = [];
    for (const c of concepts) world.setHome(`c:${c.id}`, c.position.x * W, c.position.y * H, first);
    for (const p of projects) world.setHome(`p:${p.slug}`, p.position.x * W, p.position.y * H, first);
    for (let i = 0; i < concepts.length - 1; i++) {
      world.connect(`c:${concepts[i].id}`, `c:${concepts[i + 1].id}`, { stiffness: 14, damping: 1.6 });
    }
    for (const p of projects) {
      for (const c of p.concepts) world.connect(`p:${p.slug}`, `c:${c}`, { stiffness: 7, damping: 1.2 });
    }
    world.bounds = { minX: 0, minY: -20, maxX: W, maxY: H + 20 };

    const r = createRandom(31);
    for (let i = 0; i < DUST; i++) {
      dust.hx[i] = dust.x[i] = r.range(0.06, 0.94) * W;
      dust.hy[i] = dust.y[i] = r.range(0.02, 0.98) * H;
      dust.seed[i] = r.next() * 100;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    placed.current = true;
  }, [size, world, dust]);

  const render = useCallback(
    (w: PhysicsWorld<NodeData>, dt: number, time: number) => {
      for (const b of w.bodies) {
        const el = nodeEls.current.get(b.id);
        if (el) el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0)`;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const W = size.width;
      const H = size.height;
      ctx.clearRect(0, 0, W, H);

      const focus = hoveredId.current ?? w.dragged?.id ?? null;
      const focusBody = focus ? w.get(focus) : null;

      // Springs: slack links sag like rope, taut links pull straight.
      for (const l of w.links) {
        const active = !!focus && (l.a.id === focus || l.b.id === focus);
        const dx = l.b.x - l.a.x;
        const dy = l.b.y - l.a.y;
        const d = Math.hypot(dx, dy) || 1;
        const slack = Math.max(0, l.rest - d);
        const stretch = Math.max(0, d - l.rest) / l.rest;
        const sag = slack * 0.55 + 6 * Math.max(0, 1 - stretch * 8);
        const nx = -dy / d;
        const ny = dx / d;
        const dir = ny >= 0 ? 1 : -1; // bow downward, like gravity
        const cx = (l.a.x + l.b.x) / 2 + nx * sag * dir;
        const cy = (l.a.y + l.b.y) / 2 + ny * sag * dir;
        ctx.strokeStyle = active ? palette.accent : rgba(palette.ink, 0.2 + Math.min(stretch * 2, 0.35));
        ctx.lineWidth = active ? 1.3 : 1;
        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.quadraticCurveTo(cx, cy, l.b.x, l.b.y);
        ctx.stroke();
      }

      // Dust: drifts, scatters from the cursor, gathers around the focused node.
      const p = w.pointer;
      const step = Math.min(dt, 1 / 30);
      const damp = Math.exp(-2.2 * step);
      ctx.fillStyle = rgba(palette.ink, 0.32);
      for (let i = 0; i < DUST; i++) {
        let fx = (dust.hx[i] - dust.x[i]) * 1.2;
        let fy = (dust.hy[i] - dust.y[i]) * 1.2;
        const a = flowAngle(dust.x[i] * 0.004, dust.y[i] * 0.004, time * 0.2 + dust.seed[i] * 0.01);
        fx += Math.cos(a) * 18;
        fy += Math.sin(a) * 18;
        if (p.active) {
          const ex = dust.x[i] - p.x;
          const ey = dust.y[i] - p.y;
          const e2 = ex * ex + ey * ey;
          if (e2 < 120 * 120) {
            const e = Math.sqrt(e2) || 1;
            const f = (1 - e / 120) ** 2 * 2600;
            fx += (ex / e) * f;
            fy += (ey / e) * f;
          }
        }
        if (focusBody) {
          const gx = focusBody.x - dust.x[i];
          const gy = focusBody.y - dust.y[i];
          const g = Math.hypot(gx, gy) || 1;
          if (g < 280) {
            const pull = (1 - g / 280) * 260;
            fx += (gx / g) * pull - (gy / g) * pull * 0.6; // inward + tangential swirl
            fy += (gy / g) * pull + (gx / g) * pull * 0.6;
          }
        }
        dust.vx[i] = (dust.vx[i] + fx * step) * damp;
        dust.vy[i] = (dust.vy[i] + fy * step) * damp;
        dust.x[i] += dust.vx[i] * step;
        dust.y[i] += dust.vy[i] * step;
        ctx.fillRect(dust.x[i] - 0.75, dust.y[i] - 0.75, 1.5, 1.5);
      }
    },
    [size, dust],
  );

  const { drag } = usePhysicsWorld(world, stageRef, {
    enabled: !reduced && size.width > 0,
    scrollInertia: 0.07,
    beforeStep: (w) => {
      for (const b of w.bodies) {
        const kind = b.id.startsWith('p:') ? 'project' : 'concept';
        if (b.id === hoveredId.current) {
          b.attraction = 1500; // the hovered object leans toward the cursor
          b.repulsion = 0;
        } else {
          b.attraction = 0;
          b.repulsion = BASE_REPULSION[kind]; // neighbours make room
        }
      }
    },
    render,
  });

  // Reduced motion: no simulation, just the settled layout.
  useEffect(() => {
    if (reduced && size.width) render(world, 0, 0);
  }, [reduced, size, world, render]);

  const activeConcepts = new Set(projects.find((p) => p.slug === hovered)?.concepts ?? []);

  const bodyOf = (id: string) => world.get(id) as Body<NodeData>;
  const press = (id: string) => (e: ReactPointerEvent) => {
    if (!reduced) drag.onPointerDown(e, bodyOf(id));
  };

  return (
    <div
      ref={stageRef}
      role="group"
      aria-label="Project system"
      aria-describedby="system-desc"
      className="relative h-[clamp(640px,90vh,900px)] select-none"
    >
      <p id="system-desc" className="sr-only">
        Interactive diagram: each project is linked to the concepts it builds on — AI, RAG, LLM, machine learning, data
        and software. Projects are links; use Tab to move between them.
      </p>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
      {concepts.map((c) => (
        <ConceptNode
          key={c.id}
          concept={c}
          active={activeConcepts.has(c.id)}
          nodeRef={(el) => {
            if (el) nodeEls.current.set(`c:${c.id}`, el);
            else nodeEls.current.delete(`c:${c.id}`);
          }}
          onPointerDown={press(`c:${c.id}`)}
        />
      ))}
      {projects.map((p) => (
        <ProjectNode
          key={p.slug}
          project={p}
          active={hovered === p.slug}
          dimmed={!!hovered && hovered !== p.slug}
          nodeRef={(el) => {
            if (el) nodeEls.current.set(`p:${p.slug}`, el);
            else nodeEls.current.delete(`p:${p.slug}`);
          }}
          onHover={onHover}
          onPointerDown={press(`p:${p.slug}`)}
          shouldCancel={drag.shouldSuppressClick}
        />
      ))}
    </div>
  );
}
